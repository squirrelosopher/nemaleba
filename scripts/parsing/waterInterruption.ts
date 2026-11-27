import type { TimeWindow } from '../../src/lib/domain/outage';
import { clock } from './dates';

const RANGE = /(?:у\s+периоду\s*)?(?:од\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова\s*)?(?:до|-|–|—)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|часа|час)/i;
const UNTIL = /(?<!\p{L})до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|часа|час)/iu;
const FROM = /(?<!\p{L})од\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|часа|час)/iu;

const LEADING_MARK = /^[\s\-–—•]+/;
const STREET_NOISE = /^(?:у\s+|део\s+|делу\s+|дела\s+)+/i;
const STREET_PREFIX = /^(?:улицама|улици|улиц[аеиу]|ул\.?)\s+/i;
const NOT_A_STREET = /без\s+вод|водоснабдев|потрошач|корисни|стрпљењ|радниц/i;
const MAX_STREET_LENGTH = 95;

export function timeWindowIn(text: string): TimeWindow | null {
  const range = text.match(RANGE);

  // A range whose numbers no clock shows ("од 10.75 до 12") is unreadable as a whole; its
  // "до 12" is not a closing time to fall back on.
  if (range) {
    const start = clock(range[1], range[2]);
    const end = clock(range[3], range[4]);
    return start && end ? { start, end } : null;
  }

  const until = text.match(UNTIL);
  const untilClock = until && clock(until[1], until[2]);

  if (untilClock) {
    return { start: null, end: untilClock };
  }

  const from = text.match(FROM);
  const fromClock = from && clock(from[1], from[2]);

  return fromClock ? { start: fromClock, end: null } : null;
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
