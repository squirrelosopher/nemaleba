import type { City } from '$lib/domain/city';
import { toSearchKey } from '$lib/text/serbianScript';

const EXACT = 0;
const PREFIX = 1;
const CONTAINS = 2;
const NO_MATCH = 99;
const BRANCH_BONUS = 0.5;
const DEFAULT_LIMIT = 7;

function rank(key: string, query: string): number {
  if (key === query) {
    return EXACT;
  }

  if (key.startsWith(query)) {
    return PREFIX;
  }

  return key.includes(query) ? CONTAINS : NO_MATCH;
}

function scoreOf(city: City, query: string): number {
  const base = Math.min(rank(toSearchKey(city.nameCyrillic), query), rank(city.id.replace(/-/g, ''), query));

  if (base === NO_MATCH) {
    return NO_MATCH;
  }

  const isBranch = city.branchCyrillic === city.nameCyrillic;
  return base - (isBranch ? BRANCH_BONUS : 0);
}

export function searchCities(cities: City[], query: string, limit = DEFAULT_LIMIT): City[] {
  const normalised = toSearchKey(query);

  if (normalised.length === 0) {
    return [];
  }

  return cities
    .map((city) => ({ city, score: scoreOf(city, normalised) }))
    .filter((entry) => entry.score !== NO_MATCH)
    .sort((left, right) => left.score - right.score || left.city.nameLatin.localeCompare(right.city.nameLatin, 'sr'))
    .slice(0, limit)
    .map((entry) => entry.city);
}
