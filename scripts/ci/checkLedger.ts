import { readFile } from 'node:fs/promises';
import { identify, settled, type UnknownPlaces } from '../registry/unknownPlaces';
import { isoDate } from '../time/serbianDate';

// How long a newly arrived name is worth failing the pipeline over. A name outside the
// seed lists is either a place to add or a spelling of one already there, and both are
// answered in minutes -- but only if somebody hears about it. The ledger has been a file
// nobody opens, so the finding is turned into the one signal that reaches a maintainer
// unprompted: a red pipeline, raised after the site is already published and the
// notifications already sent.
//
// It goes quiet on its own. A name nobody has dealt with in this many days is either
// deliberate or not worth the noise, and a check that cries every hour forever is a check
// that gets ignored.
const NAG_DAYS = 3;

// And it says nothing at all about a name that has stopped arriving. BVK misspelled
// Чукарица as "Чикарица" for one afternoon and corrected itself overnight; the check went
// on failing the pipeline for two more days, over a name no source was sending any more,
// with nothing left to fix and no way to go green but to wait.
const ARRIVING_DAYS = 1;

const LEDGER_PATH = process.argv[2] ?? 'public/data/unknown-places.json';

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

async function read(): Promise<UnknownPlaces> {
  try {
    return JSON.parse(await readFile(LEDGER_PATH, 'utf-8')) as UnknownPlaces;
  } catch {
    return {};
  }
}

async function run(): Promise<void> {
  const today = isoDate(0);
  const places = Object.values(await read());

  // Judged here rather than trusted from the file. The ledger is written by the collector,
  // and one written before the register was consulted still lists places the register
  // vouches for; those clear on the next run and are nobody's work in the meantime.
  const fresh = places
    .filter((place) => !settled(place.branch, place.municipality))
    .filter((place) => daysBetween(place.lastSeen, today) < ARRIVING_DAYS)
    .filter((place) => daysBetween(place.firstSeen, today) < NAG_DAYS);

  if (fresh.length === 0) {
    console.log(`${LEDGER_PATH}: nothing new (${places.length} known finding(s))`);
    return;
  }

  console.error(`${fresh.length} place name(s) arriving from outside the seed lists:\n`);

  for (const place of fresh) {
    console.error(`  ${place.branch} / ${place.municipality}`);
    console.error(`    ${identify(place)}`);
    console.error(`    first seen ${place.firstSeen}, last ${place.lastSeen}`);
    console.error(`    ${place.sourceUrl}\n`);
  }

  console.error('The register knows none of these, and the rollup has already forgiven the');
  console.error('ones a single character explains -- so each is a name to map by hand, in');
  console.error('the parser that produced it or in the seed lists. Until then its outages');
  console.error('sit on a page of their own. A real place the register knows is never');
  console.error('reported here, nor is a name that has stopped arriving.');

  process.exit(1);
}

await run();
