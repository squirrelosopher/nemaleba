const TIME_ZONE = 'Europe/Belgrade';
const ISO_DATE_LOCALE = 'sv-SE';

/**
 * Outages are published, read and lived in Serbian local time. Deriving "today" from
 * UTC puts the pipeline a day behind between midnight and 02:00 CEST, so the calendar
 * date comes from Belgrade and the day arithmetic happens on a UTC-anchored date to
 * stay clear of daylight saving.
 */
function belgradeToday(): Date {
  const [year, month, day] = new Intl.DateTimeFormat(ISO_DATE_LOCALE, { timeZone: TIME_ZONE })
    .format(new Date())
    .split('-')
    .map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(offsetDays: number): string {
  const date = belgradeToday();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
