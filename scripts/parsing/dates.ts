import type { RawOutage } from '../../src/lib/domain/outage';
import { MONTH_NAME, monthFromGenitive } from './serbianMonths';

const DAY_MS = 24 * 60 * 60 * 1000;

// A notice for works that run longer than two weeks is a restriction regime rather than a
// list of days, and a row for each of them would bury every other outage in the city. Such
// a notice keeps its first day only; the full range stays in front of the reader in the
// note, which carries the announcement text.
const MAX_ANNOUNCED_DAYS = 14;

const POSTED_DAY = /^\d{4}-\d{2}-\d{2}/;
const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const DOTTED_DATE = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/;
// Čačak writes the day first and gives the month and year only on the second date:
// "у периоду 15.-16.08.2026. године".
const DOTTED_DAY_RANGE = /(\d{1,2})\.\s*[-–—]\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/;
// "од 01.12. до 03.12.2026", with the year sometimes repeated on the first date.
const DOTTED_RANGE =
  /(\d{1,2})\.\s*(\d{1,2})\.\s*(?:(\d{4})\.?\s*)?(?:године\s*)?(?:[-–—]|до)\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/i;
const WEEKDAY = 'понедељак|уторак|среду|среда|четвртак|петак|суботу|субота|недељу|недеља';
// Sremska Mitrovica and Pančevo name the day in words: "у петак, 21. августа 2026. године".
// The year is required here, because "Булевар 23. октобра" is a street.
const WORDED_DATE = new RegExp(`(\\d{1,2})\\.?\\s*(${MONTH_NAME})\\s*(\\d{4})`, 'i');
// "у среду, 10. и четвртак, 11. јуна 2026" names two days; "10.–12. јуна 2026" a range.
const WORDED_SPAN = new RegExp(
  `(\\d{1,2})\\.\\s*(и|[-–—]|до)\\s*(?:(?:${WEEKDAY}),?\\s*)?(\\d{1,2})\\.?\\s*(${MONTH_NAME})\\s*(\\d{4})`,
  'i'
);
// Naissus writes "29. августа" with no year at all.
const DAY_AND_MONTH = new RegExp(`(\\d{1,2})\\.?\\s*(${MONTH_NAME})`, 'i');
const TODAY = /(?<!\p{L})данас(?!\p{L})/iu;
const TOMORROW = /(?<!\p{L})сутра(?!\p{L})/iu;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The ISO date of a calendar day, or null for a day no calendar has ("32.13."). */
export function calendarDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "HH:MM", or null when the numbers are no time of day: a house number, a date. */
export function clock(hours: string, minutes: string | undefined): string | null {
  const hour = Number(hours);
  const minute = Number(minutes ?? '0');

  if (hour > 24 || minute > 59 || (hour === 24 && minute > 0)) {
    return null;
  }

  return `${pad(hour)}:${pad(minute)}`;
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysFrom(first: string | null, last: string | null): string[] | null {
  if (!first || !last || last < first) {
    return null;
  }

  const count = Math.round((Date.parse(last) - Date.parse(first)) / DAY_MS) + 1;

  if (count > MAX_ANNOUNCED_DAYS) {
    return [first];
  }

  return Array.from({ length: count }, (_, offset) => addDays(first, offset));
}

/** The first dd.mm.yyyy or yyyy-mm-dd date in the text. */
export function isoDateIn(text: string): string | null {
  const iso = text.match(ISO_DATE);
  const dotted = text.match(DOTTED_DATE);

  if (iso && (!dotted || (iso.index ?? 0) <= (dotted.index ?? 0))) {
    return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return dotted ? calendarDate(Number(dotted[3]), Number(dotted[2]), Number(dotted[1])) : null;
}

/**
 * "29. августа" in the year that puts it nearest to the day it was posted. A post from
 * 30 December about "3. јануара" means the coming January, and one from 3 January about
 * "30. децембра" the December just gone; notices speak of days within weeks of posting.
 */
export function dateFromPhrase(phrase: string, postedAt: string): string | null {
  const match = phrase.match(DAY_AND_MONTH);
  const month = match ? monthFromGenitive(match[2]) : null;

  if (!match || month === null) {
    return null;
  }

  const posted = Date.parse(postedDay(postedAt));
  const year = Number(postedAt.slice(0, 4));
  const candidates = [year - 1, year, year + 1]
    .map((candidate) => calendarDate(candidate, month, Number(match[1])))
    .filter((date): date is string => date !== null);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((nearest, date) =>
    Math.abs(Date.parse(date) - posted) < Math.abs(Date.parse(nearest) - posted) ? date : nearest
  );
}

interface DateReading {
  pattern: RegExp;
  days: (match: RegExpMatchArray) => string[] | null;
}

function single(date: string | null): string[] | null {
  return date ? [date] : null;
}

const READINGS: DateReading[] = [
  {
    pattern: DOTTED_RANGE,
    days: (match) => {
      const [, firstDay, firstMonth, firstYear, lastDay, lastMonth, lastYear] = match.map(Number);
      // A range written without the first year that crosses New Year: "од 29.12. до 02.01.2027".
      const startYear = match[3] ? firstYear : firstMonth > lastMonth ? lastYear - 1 : lastYear;
      return daysFrom(
        calendarDate(startYear, firstMonth, firstDay),
        calendarDate(lastYear, lastMonth, lastDay)
      );
    }
  },
  {
    pattern: DOTTED_DAY_RANGE,
    days: (match) => {
      const [, firstDay, lastDay, month, year] = match.map(Number);
      return daysFrom(calendarDate(year, month, firstDay), calendarDate(year, month, lastDay));
    }
  },
  {
    pattern: DOTTED_DATE,
    days: (match) => single(calendarDate(Number(match[3]), Number(match[2]), Number(match[1])))
  },
  {
    pattern: ISO_DATE,
    days: (match) => single(calendarDate(Number(match[1]), Number(match[2]), Number(match[3])))
  },
  {
    pattern: WORDED_SPAN,
    days: (match) => {
      const month = monthFromGenitive(match[4]);
      const year = Number(match[5]);

      if (month === null) {
        return null;
      }

      const first = calendarDate(year, month, Number(match[1]));
      const last = calendarDate(year, month, Number(match[3]));

      if (match[2].toLowerCase() !== 'и') {
        return daysFrom(first, last);
      }

      return first && last && first < last ? [first, last] : null;
    }
  },
  {
    pattern: WORDED_DATE,
    days: (match) => {
      const month = monthFromGenitive(match[2]);
      return month === null ? null : single(calendarDate(Number(match[3]), month, Number(match[1])));
    }
  }
];

/**
 * Every day the text names for the works, read from whichever date comes first in it. A
 * range or a pair of days at that place counts in full; a date no calendar has counts as
 * none.
 */
export function statedDaysIn(text: string): string[] | null {
  let earliest: { index: number; length: number; days: string[] } | null = null;

  for (const { pattern, days } of READINGS) {
    const match = text.match(pattern);
    const read = match ? days(match) : null;

    if (!match || !read) {
      continue;
    }

    const index = match.index ?? 0;
    const wider = earliest && index === earliest.index && match[0].length > earliest.length;

    if (!earliest || index < earliest.index || wider) {
      earliest = { index, length: match[0].length, days: read };
    }
  }

  return earliest?.days ?? null;
}

export interface AnnouncedDays {
  dates: string[];
  dateNotStated?: true;
}

function postedDay(postedAt: string): string {
  const day = postedAt.match(POSTED_DAY)?.[0];

  // Every feed we read dates its posts. One that stops doing so has changed shape, and a
  // row with an empty date is filtered out downstream without a word.
  if (!day) {
    throw new Error(`Post has no publication date to fall back on: "${postedAt}"`);
  }

  return day;
}

/**
 * The day a notice was posted, when it names no day of its own. "Данас" and "сутра" are
 * read against that day, but only when the passage uses one of the two: a notice that
 * says both is describing more than one day, and nothing tells which one is the outage.
 */
export function postingDay(postedAt: string, passage: string): AnnouncedDays {
  const posted = postedDay(postedAt);
  const today = TODAY.test(passage);
  const tomorrow = TOMORROW.test(passage);

  if (today !== tomorrow) {
    return { dates: [tomorrow ? addDays(posted, 1) : posted] };
  }

  return { dates: [posted], dateNotStated: true };
}

/**
 * The days a notice announces, from the first passage that names any, most specific
 * passage first. Relative words are read from the first passage only, because the same
 * post often says "данас" about something else entirely (Gornji Milanovac's daily report
 * mentions refuse collection "данас" under the water section).
 */
export function announcedDays(passages: string[], postedAt: string): AnnouncedDays {
  for (const passage of passages) {
    const stated = statedDaysIn(passage);

    if (stated) {
      return { dates: stated };
    }
  }

  return postingDay(postedAt, passages[0] ?? '');
}

export function onEachDay(
  days: AnnouncedDays,
  outage: Omit<RawOutage, 'date' | 'dateNotStated'>
): RawOutage[] {
  return days.dates.map((date) =>
    days.dateNotStated ? { ...outage, date, dateNotStated: true } : { ...outage, date }
  );
}
