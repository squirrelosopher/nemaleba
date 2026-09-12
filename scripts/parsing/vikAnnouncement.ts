import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import type { OutageKind } from '../../src/lib/domain/utility';
import { Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, stripTags } from './html';

const SHORTCODE = /\[[^\]]*\]/g;
const TIME_SEGMENT = /\(\s*од\s*(\d{1,2}[:.]\d{2})\s*(?:до|–|-)\s*(\d{1,2}[:.]\d{2})[^)]*\)/g;
const TITLE_DATE = /(\d{2})\.(\d{2})\.(\d{4})/;
const AREA_LIST = /(?:насељима|потрошачи у|улицама)\s*:?\s*([^.]+)\./i;
const ABBREVIATIONS = /(^|[\s(])(ул|бр|бб)\./gi;
const STREET_PREFIX = /^(?:ул\.?|улица|улици)\s*/i;
const SENTENCE_END = '.';
const MAX_STREET_LENGTH = 70;
const CITY = 'Крагујевац';

function normaliseTime(value: string): string {
  return value.replace('.', ':');
}

function toTimeWindow(start: string, end: string): TimeWindow {
  const from = normaliseTime(start);
  const to = normaliseTime(end);
  return { start: from, end: to };
}

function lastSentenceOf(text: string): string {
  const withoutAbbreviations = text.replace(ABBREVIATIONS, '$1$2');
  const boundary = withoutAbbreviations.lastIndexOf(SENTENCE_END);

  return boundary === -1
    ? withoutAbbreviations.trim()
    : withoutAbbreviations.slice(boundary + 1).trim();
}

function splitLocation(text: string): { area: string; streets: string[] } {
  const parts = lastSentenceOf(text)
    .split(',')
    .map((part) => part.replace(/^[\s–-]+/, '').trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return { area: CITY, streets: [] };
  }

  const [first, ...rest] = parts;

  if (rest.length === 0) {
    return STREET_PREFIX.test(first)
      ? { area: CITY, streets: [first.replace(STREET_PREFIX, '').trim()] }
      : { area: first.length <= MAX_STREET_LENGTH ? first : CITY, streets: [] };
  }

  const streets = rest
    .map((street) => street.replace(STREET_PREFIX, '').trim())
    .filter((street) => street.length > 0 && street.length <= MAX_STREET_LENGTH);

  return { area: first.length <= MAX_STREET_LENGTH ? first : CITY, streets };
}

function plainTextOf(content: string): string {
  return collapseWhitespace(stripTags(content.replace(SHORTCODE, ' ')));
}

function dateOf(title: string, published: string): string {
  const match = title.match(TITLE_DATE);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : published.slice(0, 10);
}

function extractAreaList(body: string): string[] {
  const match = body.match(AREA_LIST);

  if (!match) {
    return [];
  }

  return match[1]
    .split(/,|\sи\s/)
    .map((area) => area.trim())
    .filter((area) => area.length > 1 && area.length <= MAX_STREET_LENGTH);
}

export function parseVikAnnouncement(
  title: string,
  content: string,
  published: string,
  kind: OutageKind,
  sourceUrl: string
): RawOutage[] {
  const body = plainTextOf(content);
  const base = {
    utility: Utility.Water,
    kind,
    date: dateOf(plainTextOf(title), published),
    cityNameCyrillic: CITY,
    branchCyrillic: CITY,
    sourceUrl
  };

  const matches = [...body.matchAll(TIME_SEGMENT)];

  if (matches.length === 0) {
    return [
      {
        ...base,
        areaLabel: CITY,
        time: null,
        streets: extractAreaList(body),
        reason: null,
        note: body || null
      }
    ];
  }

  const outages: RawOutage[] = [];
  let cursor = 0;

  for (const match of matches) {
    const timeStart = match.index ?? 0;
    const timeEnd = timeStart + match[0].length;
    const sentenceEnd = body.indexOf(SENTENCE_END, timeEnd);
    const entryEnd = sentenceEnd === -1 ? body.length : sentenceEnd + 1;

    const location = splitLocation(body.slice(cursor, timeStart));
    const reason = body.slice(timeEnd, entryEnd).replace(/^[\s,]+/, '').replace(/\.$/, '').trim();

    outages.push({
      ...base,
      areaLabel: location.area,
      time: toTimeWindow(match[1], match[2]),
      streets: location.streets,
      reason: reason || null,
      note: body.slice(cursor, entryEnd).replace(/^[\s.,]+/, '').trim() || null
    });

    cursor = entryEnd;
  }

  return outages;
}
