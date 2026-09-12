import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';

const MAX_STREET_LENGTH = 95;

// A full stop inside a street name ("Улица 23. октобра") must not end the sentence.
const SENTENCE_BREAK = /(?<!\d)\.\s+/;
const WITHOUT_WATER = /без\s+воде/i;
const RESOLVED = /нормализовано|нормализован/i;

const FROM_UNTIL = /(?:од|у времену од)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:до|-)\s*(\d{1,2})(?:[:.](\d{2}))?/i;
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

function pad(value: string | undefined): string {
  return (value ?? '00').padStart(2, '0');
}

function timeOf(sentence: string): TimeWindow | null {
  const range = sentence.match(FROM_UNTIL);

  if (range) {
    const start = `${pad(range[1])}:${pad(range[2])}`;
    const end = `${pad(range[3])}:${pad(range[4])}`;
    return { start, end };
  }

  const until = sentence.match(UNTIL);

  if (until) {
    const end = `${pad(until[1])}:${pad(until[2])}`;
    return { start: null, end };
  }

  const from = sentence.match(FROM) ?? sentence.match(AT);

  if (from) {
    const start = `${pad(from[1])}:${pad(from[2])}`;
    return { start, end: null };
  }

  return null;
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
}

export function parseWaterProse(
  content: string,
  date: string,
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
    .map((raw) => {
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

      return {
        utility: Utility.Water,
        kind: options.kind ?? OutageKind.Emergency,
        date,
        cityNameCyrillic: options.city,
        branchCyrillic: options.city,
        areaLabel: area && area.length <= MAX_STREET_LENGTH ? area : options.city,
        time: timeOf(sentence),
        streets: splitStreets(streets),
        reason: null,
        note: sentence,
        sourceUrl
      };
    })
    .filter((outage) => outage.streets.length > 0 || outage.time !== null);
}
