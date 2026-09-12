import type { Utility } from './utility';

export const NATIONAL_COVERAGE = 'national';

export interface Provider {
  id: string;
  utility: Utility;
  nameCyrillic: string;
  phone: string;
  url: string;
  coverage: typeof NATIONAL_COVERAGE | string[];
}

export function coversCity(provider: Provider, cityId: string): boolean {
  return provider.coverage === NATIONAL_COVERAGE || provider.coverage.includes(cityId);
}
