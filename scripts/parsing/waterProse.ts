import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { announcedDays, clock, onEachDay } from './dates';
import { collapseWhitespace, decodeEntities, stripTags } from './html';

const MAX_STREET_LENGTH = 95;

// A full stop inside a street name ("Улица 23. октобра") must not end the sentence.
const SENTENCE_BREAK = /(?<!\d)\.\s+/;
const WITHOUT_WATER = /без\s+воде/i;
const RESOLVED = /нормализовано|нормализован/i;

// "од 12 до 30" is as likely a run of house numbers as a time, so a range counts only when
// it carries minutes or an hour word.
const FROM_UNTIL =
  /(?:од|у времену од)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:до|-)\s*(\d{1,2})(?:[:.](\d{2}))?(\s*(?:часова|часа|сати|ч)(?!\p{L}))?/iu;
const FROM = /(?:^|\s)од\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати)/i;
const UNTIL = /(?:^|\s)до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати)/i;
const AT = /(?:^|\s)у\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часа|часова|сати)/i;

// The location follows the verb that says people are left without water.
const AFTER_VERB = /(?:бити|остала|остало|остали|остати|остаје)\s+(.+)$/i;
const LEAD_NOUNS = /^(?:потрошачи|корисници|станари)\s*/i;
const STREET_LEAD = /^(?:у\s+)?(?:следећим\s+)?(?:улицама|улици|улица|делу\s+улице|делу\s+Улице|Улици|Улица)\s*:?\s*/i;
const IN_AREA = /\s+у\s+(\p{Lu}[\p{L}\s]{2,})$/u;
// "без воде су потрошачи у следећим улицама: X и Y" carries no verb from the list above.
const STREET_LIST = /улицама\s*:\s*(.+)$/i;
// Fragments that are never a street name.
const NOT_A_STREET = /без\s+воде|водоснабдев|напајањ|електрич|потрошач|корисни/i;

function timeOf(sentence: string): TimeWindow | null {
  const range = sentence.match(FROM_UNTIL);

  if (range && (range[2] ?? range[4] ?? range[5]) !== undefined) {
    const start = clock(range[1], range[2]);
    const end = clock(range[3], range[4]);
    return start && end ? { start, end } : null;
  }

  const until = sentence.match(UNTIL);
  const untilClock = until && clock(until[1], until[2]);

  if (untilClock) {
    return { start: null, end: untilClock };
  }

  const from = sentence.match(FROM) ?? sentence.match(AT);
  const fromClock = from && clock(from[1], from[2]);

  return fromClock ? { start: fromClock, end: null } : null;
}

function splitStreets(text: string): string[] {
  return text
    .split(/,|\sи\s/)
    .map((street) => street.replace(STREET_LEAD, '').trim().replace(/[.,;]$/, ''))
    .filter(
      (street) =>
        street.length > 2 && street.length <= MAX_STREET_LENGTH && !NOT_A_STREET.test(street)
    );
}

export interface ProseOptions {
  city: string;
  /** Settlement names appear in the locative; map the ones worth showing as labels. */
  nominative?: Record<string, string>;
  kind?: OutageKind;
  /** A day the source read outside the body (Pančevo's title); it wins over the prose. */
  statedDate?: string;
}

export function parseWaterProse(
  content: string,
  postedAt: string,
  sourceUrl: string,
  options: ProseOptions
): RawOutage[] {
  const body = collapseWhitespace(decodeEntities(stripTags(content)));

  if (RESOLVED.test(body) && !WITHOUT_WATER.test(body)) {
    return [];
  }

  return body
    .split(SENTENCE_BREAK)
    .filter((sentence) => WITHOUT_WATER.test(sentence))
    .flatMap((raw) => {
      const sentence = `${raw.trim().replace(/\.$/, '')}.`;
      const tail = (
        sentence.match(STREET_LIST)?.[1] ??
        sentence.match(AFTER_VERB)?.[1] ??
        ''
      )
        .replace(/\.$/, '')
        .trim();
      const located = tail.replace(LEAD_NOUNS, '').trim();

      const inflected = located.match(IN_AREA)?.[1]?.trim();
      const area = inflected ? options.nominative?.[inflected] ?? inflected : undefined;
      const streets = located.replace(IN_AREA, '').trim();

      // The sentence that says who is left without water usually names the day too
      // ("у петак, 21. августа 2026. године, ... без воде"); the rest of the post is the
      // next place to look.
      const days = options.statedDate
        ? { dates: [options.statedDate] }
        : announcedDays([sentence, body], postedAt);

      return onEachDay(days, {
        utility: Utility.Water,
        kind: options.kind ?? OutageKind.Emergency,
        cityNameCyrillic: options.city,
        branchCyrillic: options.city,
        areaLabel: area && area.length <= MAX_STREET_LENGTH ? area : options.city,
        time: timeOf(sentence),
        streets: splitStreets(streets),
        reason: null,
        note: sentence,
        sourceUrl
      });
    })
    .filter((outage) => outage.streets.length > 0 || outage.time !== null);
}
