import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { City } from '../../src/lib/domain/city';
import type { RawOutage } from '../../src/lib/domain/outage';
import { matchAddresses, Precision } from './addressMatch';

const COVERAGE_PATH = 'static/data/coverage.json';

// A day of one city's outages is far too small to promise anything on: Pirot published six
// and Belgrade forty-three. The tally is therefore kept across runs, the way the source
// health record is, and a city earns a precision only once enough has passed through it.
const MIN_SAMPLE = 40;

// What share of announcements has to name something for a reader to be offered it. Below
// this the finer subscription is a button that goes quiet, which is worse than not
// offering it: silence from this site reads as "nothing is wrong".
const THRESHOLD = 0.7;

export interface CityCoverage {
  outages: number;
  streetNamed: number;
  settlementNamed: number;
  precision: Precision;
}

export type Coverage = Record<string, CityCoverage>;

export async function readCoverage(): Promise<Coverage> {
  try {
    return JSON.parse(await readFile(COVERAGE_PATH, 'utf-8')) as Coverage;
  } catch {
    return {};
  }
}

export async function writeCoverage(coverage: Coverage): Promise<void> {
  await mkdir(dirname(COVERAGE_PATH), { recursive: true });
  await writeFile(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`, 'utf-8');
}

// Street beats settlement wherever both clear the bar, since it is the finer of the two
// and a reader who gave a street gave a settlement with it.
export function precisionOf(tally: Omit<CityCoverage, 'precision'>): Precision {
  if (tally.outages < MIN_SAMPLE) {
    return Precision.Municipality;
  }

  if (tally.streetNamed / tally.outages >= THRESHOLD) {
    return Precision.Street;
  }

  return tally.settlementNamed / tally.outages >= THRESHOLD
    ? Precision.Settlement
    : Precision.Municipality;
}

export function tally(previous: Coverage, city: City, outages: RawOutage[]): CityCoverage {
  const before = previous[city.id];

  const counted = {
    outages: (before?.outages ?? 0) + outages.length,
    streetNamed: before?.streetNamed ?? 0,
    settlementNamed: before?.settlementNamed ?? 0
  };

  for (const outage of outages) {
    const match = matchAddresses(city.nameCyrillic, outage);

    if (match.streets.length > 0) {
      counted.streetNamed += 1;
    }

    if (match.settlements.length > 0) {
      counted.settlementNamed += 1;
    }
  }

  return { ...counted, precision: precisionOf(counted) };
}

export function describeCoverage(coverage: Coverage): string[] {
  const share = (part: number, whole: number) =>
    whole === 0 ? '  -' : `${String(Math.round((part / whole) * 100)).padStart(3)}%`;

  return Object.entries(coverage)
    .filter(([, city]) => city.precision !== Precision.Municipality)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([id, city]) =>
        `${id.padEnd(22)} ${city.precision.padEnd(10)} street ${share(
          city.streetNamed,
          city.outages
        )}  settlement ${share(city.settlementNamed, city.outages)}  of ${city.outages}`
    );
}
