export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dayOffsetFromToday(iso: string): number {
  const millisecondsPerDay = 86_400_000;
  const target = parseIsoDate(iso).getTime();
  const today = parseIsoDate(toIsoDate(new Date())).getTime();

  return Math.round((target - today) / millisecondsPerDay);
}
