import type { DailyTotals } from '../../src/lib/domain/city';
import type { RawOutage } from '../../src/lib/domain/outage';
import { Utility } from '../../src/lib/domain/utility';

const RETAINED_DAYS = 30;

export function totalsOn(outages: RawOutage[], date: string): DailyTotals {
  const sameDay = outages.filter((outage) => outage.date === date);

  return {
    date,
    electricityOutages: sameDay.filter((outage) => outage.utility === Utility.Electricity).length,
    waterOutages: sameDay.filter((outage) => outage.utility === Utility.Water).length
  };
}

// Each run rewrites today's entry, so the day's last run decides it. A source that could
// not be read in that run contributed 0, and an unreadable 23:00 run used to record a day
// of Niš's water outages as none. For a utility with missing data, today's figure stays
// whatever the last readable run found.
export function mergeHistory(
  previous: DailyTotals[],
  today: DailyTotals,
  missing: ReadonlySet<Utility> = new Set()
): DailyTotals[] {
  const byDate = new Map(previous.map((entry) => [entry.date, entry]));
  const earlier = byDate.get(today.date);

  byDate.set(today.date, {
    date: today.date,
    electricityOutages:
      missing.has(Utility.Electricity) && earlier
        ? earlier.electricityOutages
        : today.electricityOutages,
    waterOutages: missing.has(Utility.Water) && earlier ? earlier.waterOutages : today.waterOutages
  });

  return [...byDate.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-RETAINED_DAYS);
}
