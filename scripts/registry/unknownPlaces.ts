import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RawOutage } from '../../src/lib/domain/outage';
import { canonicalMunicipality } from './cityRollup';
import { describePlace, placeNamed } from './rgzPlaces';
import { isoDate } from '../time/serbianDate';
import { SEED_BRANCHES } from './seedCities';

const REPORT_PATH = 'static/data/unknown-places.json';

// Every place the site expects to hear about is enumerated by hand, branches and their
// municipalities alike, in the canonical spelling the rollup produces.
const KNOWN = new Set(
  SEED_BRANCHES.flatMap((seed) => [
    seed.branch,
    ...seed.municipalities.map((municipality) => canonicalMunicipality(seed.branch, municipality))
  ])
);

export interface UnknownPlace {
  branch: string;
  municipality: string;
  entries: number;
  sourceUrl: string;
  firstSeen: string;
  lastSeen: string;
}

export type UnknownPlaces = Record<string, UnknownPlace>;

function keyOf(branch: string, municipality: string): string {
  return `${branch}|${municipality}`;
}

// Nothing to answer for: the branch is one this site reads, and the place is either
// written down here or vouched for by the register.
export function settled(branch: string, municipality: string): boolean {
  if (!KNOWN.has(branch)) {
    return false;
  }

  const canonical = canonicalMunicipality(branch, municipality);

  return KNOWN.has(canonical) || placeNamed(canonical, branch) !== undefined;
}

export async function readUnknownPlaces(): Promise<UnknownPlaces> {
  try {
    return JSON.parse(await readFile(REPORT_PATH, 'utf-8')) as UnknownPlaces;
  } catch {
    return {};
  }
}

export async function writeUnknownPlaces(places: UnknownPlaces): Promise<void> {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(places, null, 2)}\n`, 'utf-8');
}

// Two sources are joined by nothing but the name they each print, so one that spells a
// place differently invents it rather than failing: EPS calling Niš's Палилула
// "Палилула - Ниш" gave its outages a page of their own until somebody noticed.
//
// A name the register confirms is not that. It is a real municipality or settlement that
// simply has no entry in the hand-written lists yet, it already gets a page from the
// outage that named it, and reporting it only asked somebody to retype what the register
// had already said -- four times in one afternoon, before this stopped.
//
// Nor is a name a single character off one already written down, which the rollup has
// answered before this sees it.
//
// What is left is worth stopping for: a name no register knows and no written one
// explains has to be mapped by hand, and until it is its outages sit on a page of their
// own that nobody visits.
export function findUnknownPlaces(
  outages: RawOutage[],
  previous: UnknownPlaces
): UnknownPlaces {
  // A day, for the same reason the source health record keeps one: how long a name has
  // been arriving is the only thing read off these, and an instant made every hourly run
  // rewrite the file whether or not the finding had changed.
  const now = isoDate(0);

  // Built from this run alone, so the report says what is arriving now rather than what
  // ever arrived. Carrying entries forward until they aged out meant a name that stopped
  // coming an hour ago still counted as arriving -- BVK's misplaced </strong> put "Земун:
  // Бранка" in one afternoon's page and the check went on failing after the page, and the
  // parser, had both moved on. Only `firstSeen` survives from earlier runs, which is the
  // one thing a single run cannot know.
  const places: UnknownPlaces = {};

  const seenThisRun = new Set<string>();

  for (const outage of outages) {
    const { branchCyrillic: branch, cityNameCyrillic: municipality } = outage;

    if (settled(branch, municipality)) {
      continue;
    }

    const key = keyOf(branch, municipality);
    const recorded = places[key];

    // The count is this run's, so it reads as "still arriving" rather than a total that
    // only ever grows. What survives from earlier runs is when the name first appeared.
    const entries = seenThisRun.has(key) ? (recorded?.entries ?? 0) + 1 : 1;

    seenThisRun.add(key);

    places[key] = {
      branch,
      municipality,
      entries,
      sourceUrl: outage.sourceUrl,
      firstSeen: previous[key]?.firstSeen ?? now,
      lastSeen: now
    };
  }

  return places;
}

// What the Address Register makes of the name, which is the difference between a finding
// and a chore: "a real municipality, add it to this branch" answers itself, where a name
// the register has never heard of is a spelling to correct instead.
export function identify(place: UnknownPlace): string {
  const match = placeNamed(place.municipality);

  return match ? describePlace(match) : 'not in the register — likely a spelling';
}

export function describeUnknown(places: UnknownPlaces): string[] {
  return Object.values(places)
    .sort((left, right) => right.lastSeen.localeCompare(left.lastSeen))
    .map(
      (place) =>
        `${place.branch} / ${place.municipality} — ${identify(place)}, ` +
        `entries ${place.entries}, ${place.firstSeen} → ${place.lastSeen}`
    );
}
