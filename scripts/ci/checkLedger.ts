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
    .filter((place) => daysBetween(place.firstSeen, today) < NAG_DAYS);

  if (fresh.length === 0) {
    console.log(`${LEDGER_PATH}: nothing new (${places.length} known finding(s))`);
    return;
  }

  console.error(`${fresh.length} place name(s) outside the seed lists:\n`);

  for (const place of fresh) {
    console.error(`  ${place.branch} / ${place.municipality}`);
    console.error(`    ${identify(place)}`);
    console.error(`    first seen ${place.firstSeen}, last ${place.lastSeen}`);
    console.error(`    ${place.sourceUrl}\n`);
  }

  console.error('The register knows none of these, so each is a spelling to correct in the');
  console.error('parser that produced it -- until then its outages sit on a page of their');
  console.error('own. A real place the register does know is never reported here.');

  process.exit(1);
}

await run();
