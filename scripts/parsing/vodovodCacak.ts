import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { isoDateIn, splitStreetList, timeWindowIn } from './waterInterruption';

// Čačak posts the notice as an image and leaves the body empty, so the title is the
// whole announcement:
//   Извођење радова на раскрсници улица Немањине и Кнеза Милоша
//   у периоду 15.-16.08.2026. године
const CITY = 'Чачак';
const ABOUT_WATER = /радов|квар|хавариј|прекид|вод[аеоу]|водоснабдевањ|рестрикциј/i;
const NOT_AN_OUTAGE = /цен[аеи]|ценовник|тендер|набавк|конкурс|запошљавањ|извештај|одлук/i;
// A range is written with the day first and the month only on the second date.
const DAY_RANGE = /(\d{1,2})\.\s*[-–—]\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/;
const STREETS = /(?:улиц[аеи]|ул\.)\s+(.+?)(?=\s+у\s+периоду|\s+у\s+Чачку|\s+од\s+\d|$)/iu;
const EMERGENCY = /квар|хавариј|оштећењ|пуцањ/i;

function firstDayOf(title: string): string | null {
  const range = title.match(DAY_RANGE);

  if (!range) {
    return isoDateIn(title);
  }

  const [, day, , month, year] = range;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseCacakNotice(
  title: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const heading = collapseWhitespace(decodeEntities(stripTags(title)));

  if (!ABOUT_WATER.test(heading) || NOT_AN_OUTAGE.test(heading)) {
    return [];
  }

  const listed = heading.match(STREETS)?.[1] ?? '';

  return [
    {
      utility: Utility.Water,
      kind: EMERGENCY.test(heading) ? OutageKind.Emergency : OutageKind.Planned,
      date: firstDayOf(heading) ?? postedAt.slice(0, 10),
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: CITY,
      time: timeWindowIn(heading),
      streets: splitStreetList(listed),
      reason: null,
      note: heading,
      sourceUrl
    }
  ];
}
