import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { City } from '../../src/lib/domain/city';
import { toSlug } from '../../src/lib/text/serbianScript';

const DIRECTORY = 'static/data/streets';

type Shard = Array<[name: string, cityId: string]>;

function shards(): Array<[letter: string, entries: Shard]> {
  return readdirSync(DIRECTORY)
    .filter((file) => file !== 'shards.json')
    .map((file) => [
      file.replace('.json', ''),
      JSON.parse(readFileSync(`${DIRECTORY}/${file}`, 'utf-8')) as Shard
    ]);
}

const cities = (
  JSON.parse(readFileSync('static/data/registry.json', 'utf-8')) as { cities: City[] }
).cities;

describe('the street index the site serves', () => {
  // A result that leads nowhere is worse than one that is missing, so a street is only in
  // the index when the municipality it belongs to has a page.
  it('only names cities that have a page', () => {
    const known = new Set(cities.map((city) => city.id));
    const strangers = new Set<string>();

    for (const [, entries] of shards()) {
      for (const [, cityId] of entries) {
        if (!known.has(cityId)) {
          strangers.add(cityId);
        }
      }
    }

    expect([...strangers]).toEqual([]);
  });

  // A reader's first keystroke decides which file is fetched, so a name in the wrong
  // shard can never be found however completely it is typed.
  it('files every name under the first letter of its slug', () => {
    const misfiled: string[] = [];

    for (const [letter, entries] of shards()) {
      for (const [name] of entries) {
        if (!toSlug(name).startsWith(letter)) {
          misfiled.push(`${name} in ${letter}`);
        }
      }
    }

    expect(misfiled).toEqual([]);
  });

  it('carries no name the register left padded', () => {
    const padded = shards()
      .flatMap(([, entries]) => entries.map(([name]) => name))
      .filter((name) => name !== name.trim());

    expect(padded).toEqual([]);
  });

  it('lists exactly the shards it wrote', () => {
    const listed = JSON.parse(readFileSync(`${DIRECTORY}/shards.json`, 'utf-8')) as string[];

    expect(listed).toEqual(shards().map(([letter]) => letter).sort());
  });
});
