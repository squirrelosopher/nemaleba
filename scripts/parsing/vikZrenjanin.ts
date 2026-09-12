import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { isoDateIn, timeWindowIn } from './waterInterruption';

const CITY = 'Зрењанин';
const WORKS_HEADING = /РАДОВИ\s+НА\s+МРЕЖИ/;
const LIST_ITEM = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const CROSS_LINK = /<a\b/i;
const PLACE = /^(\p{Lu}[\p{Lu}\s.-]*?)(?:\s*\(([^)]+)\))?\s*[–—-]?\s*(?=\p{Ll})/u;
const EMERGENCY = /квар|хавариј|оштећењ/i;
const MIN_ANNOUNCEMENT_LENGTH = 12;
const MAX_NOTE_LENGTH = 400;

function inTitleCase(name: string): string {
  return name
    .toLocaleLowerCase('sr')
    .replace(/(^|[\s-])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toLocaleUpperCase('sr'));
}

function afterWorksHeading(content: string): string {
  const heading = content.search(WORKS_HEADING);

  return heading === -1 ? '' : content.slice(heading);
}

function listedWorks(content: string): string[] {
  return [...afterWorksHeading(content).matchAll(LIST_ITEM)]
    .map((item) => item[1])
    .filter((item) => !CROSS_LINK.test(item))
    .map((item) => collapseWhitespace(decodeEntities(stripTags(item))))
    .filter((item) => item.length >= MIN_ANNOUNCEMENT_LENGTH);
}

export function parseZrenjaninWorks(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const date = isoDateIn(title) ?? isoDateIn(stripTags(content)) ?? postedAt.slice(0, 10);

  return listedWorks(content).map((work) => {
    const place = work.match(PLACE);

    return {
      utility: Utility.Water,
      kind: EMERGENCY.test(work) ? OutageKind.Emergency : OutageKind.Planned,
      date,
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: place ? inTitleCase(place[1].trim()) : CITY,
      time: timeWindowIn(work),
      streets: [],
      reason: null,
      note: work.slice(0, MAX_NOTE_LENGTH),
      sourceUrl
    };
  });
}
