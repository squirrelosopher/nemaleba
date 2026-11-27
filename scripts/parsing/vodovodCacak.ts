import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { announcedDays, onEachDay } from './dates';
import { splitStreetList, timeWindowIn } from './waterInterruption';

// Čačak posts the notice as an image and leaves the body empty, so the title is the
// whole announcement:
//   Извођење радова на раскрсници улица Немањине и Кнеза Милоша
//   у периоду 15.-16.08.2026. године
const CITY = 'Чачак';
const ABOUT_WATER = /радов|квар|хавариј|прекид|вод[аеоу]|водоснабдевањ|рестрикциј/i;
const NOT_AN_OUTAGE = /цен[аеи]|ценовник|тендер|набавк|конкурс|запошљавањ|извештај|одлук/i;
const STREETS = /(?:улиц[аеи]|ул\.)\s+(.+?)(?=\s+у\s+периоду|\s+у\s+Чачку|\s+од\s+\d|$)/iu;
const EMERGENCY = /квар|хавариј|оштећењ|пуцањ/i;

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

  return onEachDay(announcedDays([heading], postedAt), {
    utility: Utility.Water,
    kind: EMERGENCY.test(heading) ? OutageKind.Emergency : OutageKind.Planned,
    cityNameCyrillic: CITY,
    branchCyrillic: CITY,
    areaLabel: CITY,
    time: timeWindowIn(heading),
    streets: splitStreetList(listed),
    reason: null,
    note: heading,
    sourceUrl
  });
}
