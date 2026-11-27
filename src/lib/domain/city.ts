import type { Outage } from './outage';
import type { Provider } from './provider';
import type { Utility } from './utility';

// Every city ships inside registry.json, which SvelteKit inlines into all 885 prerendered
// pages, so a field nobody reads is paid for 885 times. Whether a utility publishes for a
// place is answered by `providers` and `coversCity`, not from here.
export interface City {
  id: string;
  nameCyrillic: string;
  nameLatin: string;
  branchCyrillic: string;
}

export interface DailyTotals {
  date: string;
  electricityOutages: number;
  waterOutages: number;
}

export interface CityDataset {
  city: City;
  outages: Outage[];
  history: DailyTotals[];
}

export interface AffectedCity {
  id: string;
  nameCyrillic: string;
  electricityOutages: number;
  waterOutages: number;
}

export interface DailySummary {
  date: string;
  electricityOutages: number;
  waterOutages: number;
  affected: AffectedCity[];
}

/**
 * A source the latest run could not read, and the cities it leaves without data. Those
 * pages must say so instead of "no outages": an empty list there means "we could not
 * look", and a reader takes it for "the water is on".
 *
 * Only the affected cities are listed, since this rides in registry.json and so in every
 * prerendered page. `lastReadAt` is null when no run has read the source yet.
 */
export interface SourceGap {
  providerId: string;
  utility: Utility;
  cityIds: string[];
  lastReadAt: string | null;
}

export interface Registry {
  generatedAt: string;
  summary: DailySummary;
  history: DailyTotals[];
  providers: Provider[];
  cities: City[];
  unavailable: SourceGap[];
}
