import { describe, expect, it } from 'vitest';
import { OutageKind } from '../../src/lib/domain/utility';
import { FeedReading, parseEpsFeed } from './epsTable';
import { clock, dateFromPhrase, isoDateIn, postingDay, statedDaysIn } from './dates';
import { decodeEntities } from './html';
import { parseCacakNotice } from './vodovodCacak';
import { parseIndjijaAnnouncement } from './vodovodIndjija';
import { parseValjevoAnnouncement } from './vodovodValjevo';
import { parseVikAnnouncement } from './vikAnnouncement';
import { parseVranjeAnnouncement } from './vodovodVranje';
import { timeWindowIn } from './waterInterruption';
import { parseWaterProse } from './waterProse';

const URL = 'https://example.org/post';

describe('the year of a date written without one', () => {
  it('rolls into January when the post went up at the end of December', () => {
    expect(dateFromPhrase('3. јануара', '2026-12-30T10:00:00')).toBe('2027-01-03');
  });

  it('rolls back into December when the post went up in early January', () => {
    expect(dateFromPhrase('30. децембра', '2027-01-03T10:00:00')).toBe('2026-12-30');
  });
});

describe('an announcement that names no day', () => {
  const vranje = (title: string, postedAt: string) =>
    parseVranjeAnnouncement(
      title,
      '<p>Због квара на цевоводу у улици Козарачкој без воде су потрошачи.</p>',
      postedAt,
      URL
    );

  it('falls back to the posting day and says so', () => {
    const [outage] = vranje('Обавештење', '2026-11-27T08:00:00');

    expect(outage.date).toBe('2026-11-27');
    expect(outage.dateNotStated).toBe(true);
  });

  it('carries no flag when the day is written out', () => {
    const [outage] = vranje('Обавештење 28.11.2026.', '2026-11-27T08:00:00');

    expect(outage.date).toBe('2026-11-28');
    expect(outage.dateNotStated).toBeUndefined();
  });

  it('reads "sutra" against the posting day', () => {
    const [outage] = parseValjevoAnnouncement(
      'Obaveštenje',
      '<p>Sutra od 9 do 14 časova bez vode biće potrošači u ulici Vojvode Mišića.</p>',
      '2026-11-27T10:00:00',
      URL
    );

    expect(outage.date).toBe('2026-11-28');
    expect(outage.dateNotStated).toBeUndefined();
  });

  it('fails the run when the post carries no date either', () => {
    expect(() => vranje('Обавештење', '')).toThrow();
  });

  it('reads a day written with its month in words', () => {
    const [outage] = parseWaterProse(
      '<p>Због радова у петак, 21. августа 2026. године, у времену од 8 до 12 сати, без воде ће бити потрошачи у улици Новој.</p>',
      '2026-08-20T09:22:41',
      URL,
      { city: 'Сремска Митровица' }
    );

    expect(outage.date).toBe('2026-08-21');
    expect(outage.dateNotStated).toBeUndefined();
  });
});

describe('works announced over several days', () => {
  it('gives one row per day of a dotted range', () => {
    const outages = parseCacakNotice(
      'Извођење радова у улици Немањиној у периоду 15.-16.08.2026. године',
      '2026-08-14T10:00:00',
      URL
    );

    expect(outages.map((outage) => outage.date)).toEqual(['2026-08-15', '2026-08-16']);
  });

  it('gives one row per day of a "from ... until" range', () => {
    const outages = parseIndjijaAnnouncement(
      '<p>Од 01.12. до 03.12.2026. године биће прекинуто водоснабдевање у насељу Бешка.</p>',
      '2026-11-30T10:00:00',
      URL,
      OutageKind.Planned
    );

    expect(outages.map((outage) => outage.date)).toEqual([
      '2026-12-01',
      '2026-12-02',
      '2026-12-03'
    ]);
  });
});

describe('times', () => {
  it('does not read house numbers as hours', () => {
    const [outage] = parseWaterProse(
      '<p>Без воде ће бити потрошачи у улици Змај Јовиној од 12 до 30.</p>',
      '2026-08-20T09:22:41',
      URL,
      { city: 'Сремска Митровица' }
    );

    expect(outage.time).toBeNull();
  });

  it('rejects hours and minutes no clock shows', () => {
    expect(timeWindowIn('од 25 до 27 часова')).toBeNull();
    expect(timeWindowIn('од 10.75 до 12 часова')).toBeNull();
  });

  it('pads the hour of an electricity window', () => {
    const feed = parseEpsFeed(
      '<table><tr><td>Датум: 2026-12-01</td></tr>' +
        '<tr><td>Звездара</td><td>8:00 - 12:00</td><td>Улица</td></tr></table>',
      'Београд',
      URL
    );

    expect(feed.reading).toBe(FeedReading.Rows);
    expect(feed.outages[0].time).toEqual({ start: '08:00', end: '12:00' });
  });

  it('pads the hour of a Kragujevac window', () => {
    const [outage] = parseVikAnnouncement(
      'Обавештење 01.12.2026.',
      '<p>Центар, улица Краља Петра (од 8.00 до 12.00) због радова.</p>',
      '2026-11-30T10:00:00',
      OutageKind.Planned,
      URL
    );

    expect(outage.time).toEqual({ start: '08:00', end: '12:00' });
  });
});

describe('dates', () => {
  it('rejects a day no calendar has', () => {
    expect(isoDateIn('32.13.2026')).toBeNull();
  });
});

describe('entities', () => {
  it('decodes hexadecimal references and characters past the basic plane', () => {
    expect(decodeEntities('&#x201E;Водовод&#x201C; &#128167;')).toBe('"Водовод" 💧');
  });

  it('leaves a reference past the last code point as written', () => {
    expect(decodeEntities('&#x110000;')).toBe('&#x110000;');
  });
});

describe('reading the days a notice names', () => {
  it('takes both days of "10. и четвртак, 11. јуна"', () => {
    expect(statedDaysIn('у среду, 10. и четвртак, 11. јуна 2026. године')).toEqual([
      '2026-06-10',
      '2026-06-11'
    ]);
  });

  it('follows a range across New Year', () => {
    expect(statedDaysIn('од 30.12. до 02.01.2027.')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02'
    ]);
  });

  it('keeps only the first day of a range longer than two weeks', () => {
    expect(statedDaysIn('од 01.09.2026. до 31.12.2026.')).toEqual(['2026-09-01']);
  });

  it('does not read a street named after a date as one', () => {
    expect(statedDaysIn('у Булевару 23. октобра')).toBeNull();
  });

  it('leaves a notice that says both "данас" and "сутра" undated', () => {
    expect(postingDay('2026-11-27T10:00:00', 'Данас и сутра без воде.')).toEqual({
      dates: ['2026-11-27'],
      dateNotStated: true
    });
  });

  it('reads "данас" as the posting day', () => {
    expect(postingDay('2026-11-27T10:00:00', 'Данас од 9 часова без воде.')).toEqual({
      dates: ['2026-11-27']
    });
  });
});

describe('clock', () => {
  it('accepts midnight written as 24 and pads single-digit hours', () => {
    expect(clock('24', undefined)).toBe('24:00');
    expect(clock('7', '5')).toBe('07:05');
  });

  it('rejects 24 with minutes past it', () => {
    expect(clock('24', '30')).toBeNull();
  });
});
