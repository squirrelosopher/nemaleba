import type { Outage } from '$lib/domain/outage';
import { dayOffsetFromToday } from './serbianCalendar';

export const DayRelation = {
  Past: 'past',
  Today: 'today',
  Tomorrow: 'tomorrow',
  Upcoming: 'upcoming'
} as const;

export type DayRelation = (typeof DayRelation)[keyof typeof DayRelation];

export interface DayGroup {
  date: string;
  relation: DayRelation;
  outages: Outage[];
}

function relationOf(offset: number): DayRelation {
  if (offset < 0) {
    return DayRelation.Past;
  }

  if (offset === 0) {
    return DayRelation.Today;
  }

  return offset === 1 ? DayRelation.Tomorrow : DayRelation.Upcoming;
}

export function groupByDay(outages: Outage[]): DayGroup[] {
  const buckets = new Map<string, Outage[]>();

  for (const outage of outages) {
    const bucket = buckets.get(outage.date) ?? [];
    bucket.push(outage);
    buckets.set(outage.date, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, entries]) => ({
      date,
      relation: relationOf(dayOffsetFromToday(date)),
      outages: entries
    }));
}

export function activeGroups(groups: DayGroup[]): DayGroup[] {
  return groups.filter((group) => group.relation !== DayRelation.Past);
}

export function pastGroups(groups: DayGroup[]): DayGroup[] {
  return groups.filter((group) => group.relation === DayRelation.Past).reverse();
}
