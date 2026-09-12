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
export function record(
  previous: SourceHealth,
  sourceId: string,
  entries: number,
  unreadable: string[] = []
): SourceRun {
  const now = isoDate(0);
  const before = previous[sourceId];
  const lastNonEmpty = entries > 0 ? now : before?.lastNonEmpty ?? null;

  if (unreadable.length === 0) {
    return { entries, lastNonEmpty, lastComplete: now };
  }

  return { entries, lastNonEmpty, unreadable, lastComplete: before?.lastComplete ?? null };
}

/**
 * A source that has produced entries before and now produces none is far more likely
 * to be a broken parser than a genuinely quiet day. Publishing that would tell every
 * visitor their power is fine, which is the worst way for this site to be wrong.
 *
 * Sources that only speak up when something happens are exempt: for them a silent run
 * is the ordinary case, and failing on it would let one quiet town stop the country.
 */
export function findRegressions(
  previous: SourceHealth,
  current: SourceHealth,
  allowedToFallSilent: ReadonlySet<string>
): string[] {
  return Object.entries(current)
    .filter(([id]) => !allowedToFallSilent.has(id))
    .filter(([id, run]) => run.entries === 0 && (previous[id]?.entries ?? 0) > 0)
    .map(([id]) => `${id} returned 0 entries, previously ${previous[id].entries}`);
}

export function isOverridden(): boolean {
  return process.env[OVERRIDE] === '1';
}
