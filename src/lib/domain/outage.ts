import type { Utility, OutageKind } from './utility';

// Announcements often give one end only, so both shapes are real. Neither end is not a
// window at all, which is what the union says and what spares every reader a fallback.
export type TimeWindow =
  | { start: string; end: string | null }
  | { start: null; end: string };

export interface Outage {
  id: string;
  utility: Utility;
  kind: OutageKind;
  date: string;
  areaLabel: string;
  time: TimeWindow | null;
  streets: string[];
  reason: string | null;
  note: string | null;
  sourceUrl: string;
}

export interface RawOutage extends Omit<Outage, 'id'> {
  cityNameCyrillic: string;
  branchCyrillic: string;
}
