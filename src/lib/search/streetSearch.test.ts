import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { searchStreets, streetNamed } from './streetSearch';

// The shards the pipeline writes, read off disk. Using the real index rather than a
// fixture is deliberate: the thing worth checking is that a reader's typing reaches a
// street that exists, and a handmade shard cannot say whether it does.
const served = (async (path: string) => {
  try {
    return {
      ok: true,
      json: async () => JSON.parse(readFileSync(`static${String(path)}`, 'utf-8'))
    };
  } catch {
    return { ok: false, json: async () => [] };
  }
}) as unknown as typeof fetch;

describe('searching for a street', () => {
  it('finds one typed in either script', async () => {
    const latin = await searchStreets(served, '', 'koste abrasevica');
    const cyrillic = await searchStreets(served, '', 'Косте Абрашевића');

    expect(latin.length).toBeGreaterThan(0);
    expect(latin).toEqual(cyrillic);
  });

  // A street name is rarely unique, so the same query has to come back in the same order
  // every time rather than in whatever order the register happened to be walked.
  it('orders the cities a repeated name belongs to', async () => {
    const once = await searchStreets(served, '', 'zeleznicka');
    const twice = await searchStreets(served, '', 'zeleznicka');

    expect(once).toEqual(twice);
    expect(once.map((hit) => hit.cityId)).toEqual([...once.map((hit) => hit.cityId)].sort());
  });

  it('says nothing until enough has been typed to mean something', async () => {
    expect(await searchStreets(served, '', 'be')).toEqual([]);
  });

  it('is quiet about a letter no street begins with', async () => {
    expect(await searchStreets(served, '', 'qqqq')).toEqual([]);
  });
});

describe('turning a slug back into a name', () => {
  it('answers with the register spelling', async () => {
    expect(await streetNamed(served, '', 'zvezdara', 'koste-abrasevica')).toBe(
      'Косте Абрашевића'
    );
  });

  it('has nothing for a street that city does not have', async () => {
    expect(await streetNamed(served, '', 'zvezdara', 'ne-postoji')).toBeNull();
  });

  // The same slug in another municipality is another street, and answering for it would
  // put one city's outages under another city's address.
  it('does not answer across cities', async () => {
    expect(await streetNamed(served, '', 'kanjiza', 'koste-abrasevica')).toBeNull();
  });
});
