import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { isoDateIn, timeWindowIn } from './waterInterruption';

// Kladovo writes one sentence per notice and writes it the same way every time:
//   Дана 07.08.2026. године доћи ће до привременог затварања воде
//   у насељу Сип у периоду од 10 до 11 часова.
const CITY = 'Кладово';
const BLOCK_END = /<\/(?:p|li|h[1-6]|div)>|<br\s*\/?>/gi;
const INTERRUPTED = /затварањ[аеу]\s+воде|без\s+воде|прекид[ау]?\s+(?:у\s+)?водоснабдевањ/i;
const AREA = /у\s+(?:насељу|селу|месту|улици)\s+(.+?)(?=\s+у\s+периоду|\s+од\s+\d|,|\.|$)/iu;
const EMERGENCY = /квар|хавариј|оштећењ|пуцањ/i;
const MAX_NOTE_LENGTH = 400;
const MAX_AREA_LENGTH = 60;
const MIN_NOTICE_LENGTH = 40;

function blocks(content: string): string[] {
  return content
    .replace(BLOCK_END, '\n')
    .split('\n')
    .map((block) => collapseWhitespace(decodeEntities(stripTags(block))))
    .filter(Boolean);
}

export function parseKladovoNotice(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  return blocks(content)
    .filter((block) => INTERRUPTED.test(block) && block.length >= MIN_NOTICE_LENGTH)
    .map((block) => {
      const area = block.match(AREA)?.[1]?.trim();

      return {
        utility: Utility.Water,
        kind: EMERGENCY.test(block) ? OutageKind.Emergency : OutageKind.Planned,
        date: isoDateIn(block) ?? isoDateIn(title) ?? postedAt.slice(0, 10),
        cityNameCyrillic: CITY,
        branchCyrillic: CITY,
        areaLabel: area && area.length <= MAX_AREA_LENGTH ? area : CITY,
        time: timeWindowIn(block),
        streets: [],
        reason: null,
        note: block.slice(0, MAX_NOTE_LENGTH),
        sourceUrl
      };
    });
}
