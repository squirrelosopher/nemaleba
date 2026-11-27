import type { City, SourceGap } from '../../src/lib/domain/city';
import { coversCity, type Provider } from '../../src/lib/domain/provider';
import type { Utility } from '../../src/lib/domain/utility';

/** One source this run could not fully read, as the collector reports it. */
export interface UnreadSource {
  provider: Provider;
  // The branches its unreadable feeds cover, or null when the gap covers all of it.
  branches: string[] | null;
  lastReadAt: string | null;
}

/** Turns the sources a run could not read into the cities each one leaves without data. */
export function gapsFor(unread: UnreadSource[], cities: City[]): SourceGap[] {
  return unread
    .map(({ provider, branches, lastReadAt }) => ({
      providerId: provider.id,
      utility: provider.utility,
      cityIds: cities
        .filter((city) => coversCity(provider, city.id))
        .filter((city) => branches === null || branches.includes(city.branchCyrillic))
        .map((city) => city.id),
      lastReadAt
    }))
    .filter((gap) => gap.cityIds.length > 0);
}

/** The utilities whose data for this city is incomplete in this run. */
export function utilitiesMissingFor(cityId: string, gaps: SourceGap[]): Set<Utility> {
  return new Set(gaps.filter((gap) => gap.cityIds.includes(cityId)).map((gap) => gap.utility));
}
