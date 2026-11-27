import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BvkBeogradSource } from './bvkBeograd';
import { EpsDistribucijaSource } from './epsDistribucija';
import { FeedReadings } from './feedReadings';
import { fetchJson, SourceUnreachable } from './httpClient';
import { VodovodLeskovacSource } from './vodovodLeskovac';

const NO_WAIT: number[] = [0, 0];

function fixture(name: string): string {
  return readFileSync(`data/fixtures/${name}`, 'utf-8');
}

// The client spaces its retries out over seconds. Sources call it with those delays, so
// here every timer fires at once instead.
function withoutWaiting(): void {
  vi.stubGlobal('setTimeout', (callback: () => void) => {
    queueMicrotask(callback);
    return 0;
  });
}

// Answers each URL from the table; anything not in it is refused, as a firewall would.
function serve(pages: Record<string, string>): void {
  withoutWaiting();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = Object.entries(pages).find(([fragment]) => url.includes(fragment))?.[1];
      return body === undefined
        ? new Response('blocked', { status: 503, statusText: 'Service Unavailable' })
        : new Response(body, { status: 200 });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading feeds', () => {
  it('records an unreachable feed and keeps going', async () => {
    const readings = new FeedReadings();

    const rows = await readings.read('faults', async () => {
      throw new SourceUnreachable('503');
    });

    expect(rows).toEqual([]);
    expect(readings.unreadable()).toEqual(['faults: 503']);
  });

  // EPS and Kragujevac caught every error here, so a parser bug read as "host refused" and
  // a region went quiet with the run still green.
  it('lets a parser bug fail the run', async () => {
    const readings = new FeedReadings();

    await expect(
      readings.read('faults', async () => {
        throw new TypeError('cannot read properties of undefined');
      })
    ).rejects.toThrow(TypeError);
  });
});

describe('the HTTP client', () => {
  it('keeps the start of a firewall page in the reason', async () => {
    serve({ 'example.rs': '<html>\n  <title>Just a moment...</title></html>' });

    await expect(fetchJson('https://example.rs/wp-json', NO_WAIT)).rejects.toThrow(
      'response was not JSON for https://example.rs/wp-json: "<html> <title>Just a moment...</title></html>"'
    );
  });

  it('retries a refusal before giving up', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchJson('https://example.rs/wp-json', NO_WAIT)).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('sources with more than one feed', () => {
  // When BVK's faults page failed, Belgrade quietly lost its emergency rows: the error was
  // logged as "skipped" and nothing marked the source as partly read.
  it('BVK reports the page it could not read and keeps the other', async () => {
    serve({ 'planirani-radovi': fixture('bvk-planned.html') });
    const source = new BvkBeogradSource();

    const rows = await source.collect();

    expect(rows.length).toBeGreaterThan(0);
    expect(source.unreadableFeeds()).toHaveLength(1);
    expect(source.unreadableFeeds()[0]).toContain('kvarovi-na-mrezi');
  });

  it('EPS names only the branches of the region it could not read', async () => {
    const quietDay = fixture('eps-nis.html');
    serve({ beograd: quietDay, Kragujevac: quietDay, Kraljevo: quietDay, NoviSad: quietDay });
    const source = new EpsDistribucijaSource();

    await source.collect();

    expect(source.unreadableBranches()).toEqual(
      expect.arrayContaining(['Ниш', 'Лесковац', 'Врање', 'Пирот', 'Прокупље', 'Зајечар'])
    );
    expect(source.unreadableBranches()).not.toContain('Београд');
  });

  // Reads overlap. Counting the shared list before and after each one blamed every region
  // whose read was still in flight when Niš failed (found by review).
  it('EPS does not blame regions whose reads overlapped the failure', async () => {
    withoutWaiting();
    const quietDay = fixture('eps-nis.html');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/Nis_')) {
          return new Response('blocked', { status: 503 });
        }

        await new Promise((resolve) => setImmediate(resolve));
        return new Response(quietDay, { status: 200 });
      })
    );
    const source = new EpsDistribucijaSource();

    await source.collect();

    expect(source.unreadableBranches()).not.toContain('Београд');
    expect(source.unreadableBranches()).not.toContain('Нови Сад');
  });
});

describe('single-page sources', () => {
  // Leskovac swallowed every error and returned nothing, so a dead site looked like a
  // quiet town and its record said it had been read.
  it('Leskovac lets an unreachable host through to be recorded', async () => {
    serve({});

    await expect(new VodovodLeskovacSource().collect()).rejects.toThrow(SourceUnreachable);
  });
});
