import type { Registry, SourceGap } from '$lib/domain/city';
import type { Provider } from '$lib/domain/provider';
import type { Utility } from '$lib/domain/utility';

export interface CityGap {
  gap: SourceGap;
  provider: Provider | undefined;
}

/** The source the latest run could not read for this city and utility, if any. */
export function cityGap(registry: Registry, cityId: string, utility: Utility): CityGap | null {
  // `?? []` because a page cached from before gaps were published carries no such field.
  const gap = (registry.unavailable ?? []).find(
    (candidate) => candidate.utility === utility && candidate.cityIds.includes(cityId)
  );

  if (!gap) {
    return null;
  }

  return { gap, provider: registry.providers.find((provider) => provider.id === gap.providerId) };
}
