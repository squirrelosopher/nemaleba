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

export function mergeHistory(previous: DailyTotals[], today: DailyTotals): DailyTotals[] {
  const byDate = new Map(previous.map((entry) => [entry.date, entry]));
  byDate.set(today.date, today);

  return [...byDate.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-RETAINED_DAYS);
}
