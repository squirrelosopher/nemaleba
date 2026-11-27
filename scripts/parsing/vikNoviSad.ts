import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { announcedDays, clock, onEachDay } from './dates';
import { collapseWhitespace, decodeEntities, stripTags } from './html';

const CITY = 'Нови Сад';
const MAX_STREET_LENGTH = 90;

// Split on a full stop that is not part of a date or numbered street ("23. октобра").
const SENTENCE_BREAK = /(?<!\d)\.\s+/;
const WITHOUT_WATER = /без\s+воде/i;
const UNTIL = /до\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:сати|часова|ч)/i;
// "од 12 до 30" is as likely a run of house numbers as a time, so a range counts only when
// it carries minutes or an hour word.
const FROM_UNTIL =
  /од\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:до)\s*(\d{1,2})(?:[:.](\d{2}))?(\s*(?:сати|часова|часа|ч)(?!\p{L}))?/iu;
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

function timeOf(sentence: string): TimeWindow | null {
  const range = sentence.match(FROM_UNTIL);

  if (range && (range[2] ?? range[4] ?? range[5]) !== undefined) {
    const start = clock(range[1], range[2]);
    const end = clock(range[3], range[4]);
    return start && end ? { start, end } : null;
  }

  const until = sentence.match(UNTIL);
  const untilClock = until && clock(until[1], until[2]);

  return untilClock ? { start: null, end: untilClock } : null;
}

export function parseNoviSadAnnouncement(
  title: string,
  content: string,
  published: string,
  sourceUrl: string
): RawOutage[] {
  const heading = collapseWhitespace(decodeEntities(stripTags(title)));
  const body = collapseWhitespace(decodeEntities(stripTags(content)));

  const days = announcedDays([heading], published);

  return body
    .split(SENTENCE_BREAK)
    .filter((sentence) => WITHOUT_WATER.test(sentence))
    .flatMap((raw) => {
    const sentence = `${raw.trim().replace(/\.$/, '')}.`;
    const tail = sentence.match(AFTER_VERB)?.[1]?.replace(/\.$/, '').trim() ?? '';
    const inflected = tail.match(IN_AREA)?.[1]?.trim();
    const area = inflected ? NOMINATIVE[inflected] ?? inflected : undefined;
    const street = inflected ? tail.replace(IN_AREA, '').trim() : tail;

    return onEachDay(days, {
      utility: Utility.Water,
      kind: OutageKind.Emergency,
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: area && area.length <= MAX_STREET_LENGTH ? area : CITY,
      time: timeOf(sentence),
      streets: street && street.length <= MAX_STREET_LENGTH ? [street] : [],
      reason: null,
      note: sentence,
      sourceUrl
    });
  });
}
