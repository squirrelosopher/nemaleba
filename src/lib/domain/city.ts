import type { Outage } from './outage';
import type { Provider } from './provider';

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

export interface Registry {
  generatedAt: string;
  summary: DailySummary;
  history: DailyTotals[];
  providers: Provider[];
  cities: City[];
}
