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
  // Set when the announcement names no day for the works, so `date` is only the day it was
  // posted. A reader is told so rather than shown the posting day as though it were the
  // day the water goes off. Absent means the announcement stated the date itself.
  dateNotStated?: true;
}

export interface RawOutage extends Omit<Outage, 'id'> {
  cityNameCyrillic: string;
  branchCyrillic: string;
}
