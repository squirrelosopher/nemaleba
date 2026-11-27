import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isoDate } from '../time/serbianDate';

const HEALTH_PATH = 'static/data/sources.json';
const OVERRIDE = 'ALLOW_EMPTY_SOURCES';

export interface SourceRun {
  entries: number;
  lastNonEmpty: string | null;
  unreadable?: string[];
  lastComplete?: string | null;
  // The instant of the last run that read every feed, so a page can say "last read at
  // 09:12" when its source stops answering. See `record`.
  lastReadAt?: string | null;
  // What the last fully read run produced. An unreadable run records 0 entries, and
  // comparing the next run against that 0 would let a parser broken in the meantime
  // publish silence unchallenged: with ten feeds behind firewalls that flap hourly, the
  // regression check was off for all of them most of the day.
  readableEntries?: number | null;
}

export type SourceHealth = Record<string, SourceRun>;

export async function readSourceHealth(): Promise<SourceHealth> {
  try {
    return JSON.parse(await readFile(HEALTH_PATH, 'utf-8')) as SourceHealth;
  } catch {
    return {};
  }
}

export async function writeSourceHealth(health: SourceHealth): Promise<void> {
  await mkdir(dirname(HEALTH_PATH), { recursive: true });
  await writeFile(HEALTH_PATH, `${JSON.stringify(health, null, 2)}\n`, 'utf-8');
}

// `lastComplete` is the last run that read every feed this source has. It stands still
// while a feed is unreadable, so the record says how long the gap has been there rather
// than only that today's run found nothing there.
//
// Recorded as a calendar day, not an instant. The question these fields answer is how
// many days a feed has been silent, and at an hourly schedule a timestamp any finer
// rewrote all thirty-six of them every run — commits whose whole content was the clock
// moving, on a dataset that is committed back to the repository each time.
//
// `lastReadAt` is the exception, because a reader asks a finer question: a page that went
// dark at nine should say so at eleven, and "today" would tell them nothing. Every run
// commits a fresh `generatedAt` anyway, so the churn it adds is one line per source.
export function record(
  previous: SourceHealth,
  sourceId: string,
  entries: number,
  unreadable: string[] = [],
  readAt: Date = new Date()
): SourceRun {
  const today = isoDate(0);
  const before = previous[sourceId];
  const lastNonEmpty = entries > 0 ? today : before?.lastNonEmpty ?? null;

  if (unreadable.length === 0) {
    return {
      entries,
      lastNonEmpty,
      lastComplete: today,
      lastReadAt: readAt.toISOString(),
      readableEntries: entries
    };
  }

  return {
    entries,
    lastNonEmpty,
    unreadable,
    lastComplete: before?.lastComplete ?? null,
    lastReadAt: before?.lastReadAt ?? null,
    readableEntries: lastReadableCount(before)
  };
}

// Records written before `readableEntries` existed still say what a readable run found,
// as long as that run was itself readable.
function lastReadableCount(run: SourceRun | undefined): number | null {
  if (run === undefined) {
    return null;
  }

  if (run.readableEntries !== undefined) {
    return run.readableEntries;
  }

  return run.unreadable?.length ? null : run.entries;
}

/**
 * A source that has produced entries before and now produces none is far more likely
 * to be a broken parser than a genuinely quiet day. Publishing that would tell every
 * visitor their power is fine, which is the worst way for this site to be wrong.
 *
 * Sources that only speak up when something happens are exempt: for them a silent run
 * is the ordinary case, and failing on it would let one quiet town stop the country.
 *
 * So is a source nothing could be read from, which is a different fault with a different
 * answer. Niš refused the collector's user agent with 403, produced no rows for it, and
 * stopped the whole country publishing for a day and a half over a parser that was fine.
 * A page that cannot be fetched says nothing about the code that reads it, and the gap it
 * leaves is already recorded in `unreadable` and `lastComplete`.
 */
export function findRegressions(
  previous: SourceHealth,
  current: SourceHealth,
  allowedToFallSilent: ReadonlySet<string>
): string[] {
  return Object.entries(current)
    .filter(([id]) => !allowedToFallSilent.has(id))
    .filter(([, run]) => !run.unreadable?.length)
    .filter(([id, run]) => run.entries === 0 && (lastReadableCount(previous[id]) ?? 0) > 0)
    .map(([id]) => `${id} returned 0 entries, previously ${lastReadableCount(previous[id])}`);
}

export function isOverridden(): boolean {
  return process.env[OVERRIDE] === '1';
}
