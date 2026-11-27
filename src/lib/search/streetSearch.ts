import { toSlug } from '$lib/text/serbianScript';

// Every street in the country is 2.5 MB, so the index is split on the first letter of the
// slug and a shard is fetched the moment a reader's first keystroke names it. The slug
// folds both scripts onto the same letters, so "beogradska" and "Београдска" ask for the
// same file -- the city search already leans on that.
const SHARD_DIRECTORY = 'data/streets';
const MIN_QUERY_LENGTH = 3;
const DEFAULT_LIMIT = 6;

const EXACT = 0;
const PREFIX = 1;
const CONTAINS = 2;
const NO_MATCH = 99;

export interface StreetHit {
  name: string;
  cityId: string;
}

type Shard = Array<[name: string, cityId: string]>;

const loaded = new Map<string, Promise<Shard>>();

function shardFor(query: string): string {
  return query.slice(0, 1);
}

function fetchShard(fetcher: typeof fetch, base: string, shard: string): Promise<Shard> {
  const pending = loaded.get(shard);

  if (pending) {
    return pending;
  }

  // A 404 is a letter no street begins with, which is an answer and worth keeping. Any
  // other failure is the network, and it is thrown and forgotten: kept, it turned one
  // dropped request on mobile data into "street not found" until the page was reloaded.
  const request = fetcher(`${base}/${SHARD_DIRECTORY}/${shard}.json`).then((response) => {
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new StreetIndexUnavailable(`${response.status} for street index ${shard}`);
    }

    return response.json() as Promise<Shard>;
  });

  loaded.set(shard, request);
  request.catch(() => loaded.delete(shard));

  return request.catch((error: unknown) => {
    throw error instanceof StreetIndexUnavailable
      ? error
      : new StreetIndexUnavailable(`street index ${shard} could not be fetched`);
  });
}

/** The street index could not be fetched, as opposed to holding no such street. */
export class StreetIndexUnavailable extends Error {}

function rank(slug: string, query: string): number {
  if (slug === query) {
    return EXACT;
  }

  if (slug.startsWith(query)) {
    return PREFIX;
  }

  return slug.includes(query) ? CONTAINS : NO_MATCH;
}

export async function searchStreets(
  fetcher: typeof fetch,
  base: string,
  query: string,
  limit = DEFAULT_LIMIT
): Promise<StreetHit[]> {
  const slug = toSlug(query);

  // Two letters match thousands of streets and none of them usefully. The city search has
  // no such floor because a city name can be short and there are only a hundred of them.
  if (slug.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const shard = await fetchShard(fetcher, base, shardFor(slug));

  return shard
    .map((entry) => ({ entry, score: rank(toSlug(entry[0]), slug) }))
    .filter(({ score }) => score !== NO_MATCH)
    // A street name is rarely unique -- Београдска is in dozens of municipalities -- so
    // the city is the tie-break rather than shard order, which is an accident of how the
    // register happened to be walked.
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.entry[0].localeCompare(right.entry[0], 'sr') ||
        left.entry[1].localeCompare(right.entry[1])
    )
    .slice(0, limit)
    .map(({ entry }) => ({ name: entry[0], cityId: entry[1] }));
}

// A street URL carries the slug, which cannot be spelled back into a name: it is folded,
// undiacriticked and Latin. The shard the search already fetched holds the written form,
// so the page asks it rather than guessing.
export async function streetNamed(
  fetcher: typeof fetch,
  base: string,
  cityId: string,
  slug: string
): Promise<string | null> {
  const shard = await fetchShard(fetcher, base, shardFor(slug));
  const found = shard.find((entry) => entry[1] === cityId && toSlug(entry[0]) === slug);

  return found ? found[0] : null;
}
