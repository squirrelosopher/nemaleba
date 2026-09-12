import type { TimeWindow } from '../../src/lib/domain/outage';

const EXPLICIT_DATE = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/;
const RANGE = /(?:у\s+периоду\s*)?(?:од\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова\s*)?(?:до|-|–|—)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|часа|час)/i;
const UNTIL = /(?<!\p{L})до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|часа|час)/iu;
const FROM = /(?<!\p{L})од\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|часа|час)/iu;

const LEADING_MARK = /^[\s\-–—•]+/;
const STREET_NOISE = /^(?:у\s+|део\s+|делу\s+|дела\s+)+/i;
const STREET_PREFIX = /^(?:улицама|улици|улиц[аеиу]|ул\.?)\s+/i;
const NOT_A_STREET = /без\s+вод|водоснабдев|потрошач|корисни|стрпљењ|радниц/i;
const MAX_STREET_LENGTH = 95;

function pad(value: string | undefined): string {
  return (value ?? '00').padStart(2, '0');
}

export function isoDateIn(text: string): string | null {
  const found = text.match(EXPLICIT_DATE);

  if (!found) {
    return null;
  }

  const [, day, month, year] = found;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function timeWindowIn(text: string): TimeWindow | null {
  const range = text.match(RANGE);

  if (range) {
    const start = `${pad(range[1])}:${pad(range[2])}`;
    const end = `${pad(range[3])}:${pad(range[4])}`;
    return { start, end };
  }

  const until = text.match(UNTIL);

  if (until) {
    const end = `${pad(until[1])}:${pad(until[2])}`;
    return { start: null, end };
  }

  const from = text.match(FROM);

  if (from) {
    const start = `${pad(from[1])}:${pad(from[2])}`;
    return { start, end: null };
  }

  return null;
}

export function splitStreetList(text: string): string[] {
  return text
    .split(/,|\sи\s|\n|•|;/)
    .map((part) => part.replace(LEADING_MARK, '').replace(STREET_NOISE, '').replace(STREET_PREFIX, ''))
    .map((part) => part.replace(/[.,;]+$/, '').trim())
    .filter(
      (part) =>
        part.length > 2 && part.length <= MAX_STREET_LENGTH && !NOT_A_STREET.test(part)
    );
}
