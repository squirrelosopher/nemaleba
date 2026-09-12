import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';

const CITY = 'Нови Сад';
const MAX_STREET_LENGTH = 90;

const TITLE_DATE = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/;
// Split on a full stop that is not part of a date or numbered street ("23. октобра").
const SENTENCE_BREAK = /(?<!\d)\.\s+/;
const WITHOUT_WATER = /без\s+воде/i;
const UNTIL = /до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:сати|часова|ч)/i;
const FROM_UNTIL = /од\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:до)\s*(\d{1,2})(?:[:.](\d{2}))?/i;
const AFTER_VERB = /бити\s+(.+?)\s*$/i;
const IN_AREA = /\s+у\s+([\p{Lu}][\p{L}\s]+)$/u;

// Announcements name the settlement in the locative ("у Петроварадину"), which reads
// wrong once it is lifted out of the sentence and shown as a label.
const NOMINATIVE: Record<string, string> = {
  Петроварадину: 'Петроварадин',
  'Сремској Каменици': 'Сремска Каменица',
  Ветернику: 'Ветерник',
  Футогу: 'Футог',
  Ковиљу: 'Ковиљ',
  Руменки: 'Руменка',
  Каћу: 'Каћ',
  Будисави: 'Будисава',
  Бегечу: 'Бегеч',
  Кисачу: 'Кисач',
  Ченеју: 'Ченеј',
  Степановићеву: 'Степановићево',
  'Новом Лединцима': 'Нови Лединци',
  'Старим Лединцима': 'Стари Лединци',
  Сремској: 'Сремска Каменица'
};

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

  return null;
}

export function parseNoviSadAnnouncement(
  title: string,
  content: string,
  published: string,
  sourceUrl: string
): RawOutage[] {
  const heading = collapseWhitespace(decodeEntities(stripTags(title)));
  const body = collapseWhitespace(decodeEntities(stripTags(content)));

  const titleDate = heading.match(TITLE_DATE);
  const date = titleDate
    ? `${titleDate[3]}-${titleDate[2].padStart(2, '0')}-${titleDate[1].padStart(2, '0')}`
    : published.slice(0, 10);

  return body
    .split(SENTENCE_BREAK)
    .filter((sentence) => WITHOUT_WATER.test(sentence))
    .map((raw) => {
    const sentence = `${raw.trim().replace(/\.$/, '')}.`;
    const tail = sentence.match(AFTER_VERB)?.[1]?.replace(/\.$/, '').trim() ?? '';
    const inflected = tail.match(IN_AREA)?.[1]?.trim();
    const area = inflected ? NOMINATIVE[inflected] ?? inflected : undefined;
    const street = inflected ? tail.replace(IN_AREA, '').trim() : tail;

    return {
      utility: Utility.Water,
      kind: OutageKind.Emergency,
      date,
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: area && area.length <= MAX_STREET_LENGTH ? area : CITY,
      time: timeOf(sentence),
      streets: street && street.length <= MAX_STREET_LENGTH ? [street] : [],
      reason: null,
      note: sentence,
      sourceUrl
    };
  });
}
