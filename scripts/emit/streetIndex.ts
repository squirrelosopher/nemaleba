import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import type { City } from '../../src/lib/domain/city';
import { toSlug } from '../../src/lib/text/serbianScript';
import { PlaceKind, placeNamed } from '../registry/rgzPlaces';

const REGISTER = 'data/rgz/streets.json';
const SETTLEMENTS = 'data/rgz/settlements.json';
const OUTPUT_DIRECTORY = 'static/data/streets';

// Sharded on the first character of the slug, so a reader typing either script lands in
// the same file: the slug folds Cyrillic and Latin onto the same letters, which is what
// the city search already relies on. One file of 71,000 entries would be two megabytes
// before a reader had typed anything.
const SHARD_LENGTH = 1;

// A street is offered only where it has somewhere to go. Most of Serbia's 168
// municipalities have no page on this site, and a search result that leads nowhere is
// worse than one that is missing.
export interface StreetEntry {
  /** As a reader would recognise it; the script is applied when it is shown. */
  0: string;
  /** The city page it belongs to. */
  1: string;
}

function shardOf(slug: string): string {
  return slug.slice(0, SHARD_LENGTH) || '_';
}

// The site names places its own way and the register names them its own way, so the join
// runs through the register rather than through the strings: Belgrade's Палилула is
// `palilula` here and "Палилула (Београд)" there.
function citiesByMunicipality(cities: City[]): Map<string, string> {
  const byMunicipality = new Map<string, string>();

  for (const city of cities) {
    const place = placeNamed(city.nameCyrillic);

    if (place?.kind !== PlaceKind.Municipality) {
      continue;
    }

    byMunicipality.set(place.id, city.id);
  }

  return byMunicipality;
}

interface RegisterStreet {
  nameCyrillic: string;
  settlementId: string;
}

interface RegisterSettlement {
  id: string;
  municipalityId: string;
}

export async function writeStreetIndex(cities: City[]): Promise<number> {
  const streets = JSON.parse(await readFile(REGISTER, 'utf-8')) as RegisterStreet[];
  const settlements = JSON.parse(await readFile(SETTLEMENTS, 'utf-8')) as RegisterSettlement[];

  const municipalityOf = new Map(settlements.map((s) => [s.id, s.municipalityId]));
  const pages = citiesByMunicipality(cities);
  const shards = new Map<string, StreetEntry[]>();

  const seen = new Set<string>();
  let written = 0;

  for (const street of streets) {
    const cityId = pages.get(municipalityOf.get(street.settlementId) ?? '');

    if (!cityId) {
      continue;
    }

    const slug = toSlug(street.nameCyrillic);

    if (slug.length === 0) {
      continue;
    }

    // One name can be a street of several settlements inside one municipality, and the
    // search answers for the municipality, so the same row would be offered twice.
    const once = `${cityId}/${slug}`;

    if (seen.has(once)) {
      continue;
    }

    seen.add(once);

    const shard = shardOf(slug);
    const entries = shards.get(shard) ?? [];

    entries.push([street.nameCyrillic, cityId] as unknown as StreetEntry);
    shards.set(shard, entries);
    written += 1;
  }

  // Rewritten from scratch, so a shard that empties as the register changes does not
  // linger and answer for streets that are no longer in it.
  await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  await Promise.all(
    [...shards].map(([shard, entries]) =>
      writeFile(`${OUTPUT_DIRECTORY}/${shard}.json`, JSON.stringify(entries))
    )
  );

  await writeFile(
    `${OUTPUT_DIRECTORY}/shards.json`,
    `${JSON.stringify([...shards.keys()].sort())}\n`
  );

  return written;
}
