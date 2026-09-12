import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { municipalitiesOf } from '../registry/cityRollup';
import { dateFromPhrase } from './serbianMonths';

const CITY = 'Ниш';
const OWN_MUNICIPALITIES = new Set(municipalitiesOf(CITY));
const MAX_STREET_LENGTH = 90;

function municipalityOf(place: string | undefined): string {
  const named = place ? titleCase(place) : CITY;
  return OWN_MUNICIPALITIES.has(named) ? named : CITY;
}

// Each item in a post opens with an all-caps heading such as
// "ПОПРАВКА КВАРА У СЕЛУ СУПОВАЦ" or "ПЛАНИРАНИ РАДОВИ У НАСЕЉУ ДУВАНИШТЕ".
// Anchored at the start of the post or just after a full stop, so capitalised phrases
// occurring mid-sentence are not mistaken for new items.
// Single-letter words matter here: "У НАСЕЉУ" carries the place that follows.
const HEADING = /(?:^|\.\s+)(\p{Lu}{3,}(?:\s+[\p{Lu}\d]+)+)/gu;
// Deliberately narrow: "НА ВОДОВОДНОЈ МРЕЖИ" is not a place.
const PLACE_IN_HEADING = /(?:НАСЕЉУ|СЕЛУ|ОПШТИНИ)\s+(.+)$/u;
const PLANNED = /ПЛАНИРАН|НАЈАВ/u;

const FROM_UNTIL = /од\s+(\d{1,2})(?:[:.](\d{2}))?\s+до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|ч)/i;
const UNTIL = /до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:часова|сати|ч)/i;
const SINGLE_STREET = /у\s+улици\s+([^,.]+)/i;
const MANY_STREETS = /у\s+улицама\s+(.+?)(?=,\s*(?:као|али|уз|при)\s|\.|$)/i;

function pad(value: string | undefined): string {
  return (value ?? '00').padStart(2, '0');
}

function titleCase(text: string): string {
  return text
    .toLocaleLowerCase('sr')
    .split(/\s+/)
    .map((word) => word.charAt(0).toLocaleUpperCase('sr') + word.slice(1))
    .join(' ');
}

function timeOf(text: string): TimeWindow | null {
  const range = text.match(FROM_UNTIL);

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

  return null;
}

function streetsOf(text: string): string[] {
  const many = text.match(MANY_STREETS)?.[1];

  if (many) {
    return many
      .split(/,|\sи\s/)
      .map((street) => street.trim())
      .filter((street) => street.length > 1 && street.length <= MAX_STREET_LENGTH);
  }

  const single = text.match(SINGLE_STREET)?.[1]?.trim();
  return single && single.length <= MAX_STREET_LENGTH ? [single] : [];
}

interface Section {
  heading: string;
  body: string;
}

function sections(text: string): Section[] {
  HEADING.lastIndex = 0;
  const headings = [...text.matchAll(HEADING)];

  if (headings.length === 0) {
    return [{ heading: '', body: text }];
  }

  return headings.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? text.length;
    // Drop a dangling single capital, which is the "У" that opens the next sentence.
    const label = match[1].trim().replace(/\s+\p{Lu}$/u, '');
    return { heading: label, body: text.slice(start, end).trim() };
  });
}

export function parseNisAnnouncement(
  title: string,
  content: string,
  published: string,
  sourceUrl: string
): RawOutage[] {
  const heading = collapseWhitespace(decodeEntities(stripTags(title)));
  const body = collapseWhitespace(decodeEntities(stripTags(content)));

  return sections(body)
    .map((section) => {
    const label = section.heading || heading;
    const place = label.match(PLACE_IN_HEADING)?.[1]?.trim();
    const text = `${section.heading} ${section.body}`.trim();

    return {
      utility: Utility.Water,
      kind: PLANNED.test(label) ? OutageKind.Planned : OutageKind.Emergency,
      date: dateFromPhrase(section.body, published) ?? published.slice(0, 10),
      cityNameCyrillic: municipalityOf(place),
      branchCyrillic: CITY,
      areaLabel: place && place.length <= MAX_STREET_LENGTH ? titleCase(place) : CITY,
      time: timeOf(section.body),
      streets: streetsOf(section.body),
      reason: null,
      note: text || null,
      sourceUrl
    };
    })
    // A fragment with neither a time nor a street carries no usable information.
    .filter((outage) => outage.time !== null || outage.streets.length > 0);
}
