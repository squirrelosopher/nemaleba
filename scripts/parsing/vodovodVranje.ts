import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { announcedDays, onEachDay } from './dates';
import { timeWindowIn } from './waterInterruption';

const CITY = 'Врање';
const BLOCK_END = /<\/(?:p|li|h[1-6]|div)>|<br\s*\/?>/gi;
const ANNOUNCEMENT = /^Због\s/u;
const WITHOUT_WATER = /без\s+воде|прекид\s+водоснабдевањ/i;
const AREA = /у\s+(?:улици|селу|насељу|месту)\s+(.+?)\s*(?:,|\s+без\s+воде)/iu;
const EMERGENCY = /квар|хавариј|оштећењ/i;
const MAX_NOTE_LENGTH = 400;

function paragraphs(content: string): string[] {
  return content
    .replace(BLOCK_END, '\n')
    .split('\n')
    .map((block) => collapseWhitespace(decodeEntities(stripTags(block))))
    .filter(Boolean);
}

export function parseVranjeAnnouncement(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const blocks = paragraphs(content);
  const days = announcedDays([title, blocks.join(' ')], postedAt);

  return blocks
    .filter((block) => ANNOUNCEMENT.test(block) && WITHOUT_WATER.test(block))
    .flatMap((block) =>
      onEachDay(days, {
        utility: Utility.Water,
        kind: EMERGENCY.test(block) ? OutageKind.Emergency : OutageKind.Planned,
        cityNameCyrillic: CITY,
        branchCyrillic: CITY,
        areaLabel: block.match(AREA)?.[1]?.trim() ?? CITY,
        time: timeWindowIn(block),
        streets: [],
        reason: null,
        note: block.slice(0, MAX_NOTE_LENGTH),
        sourceUrl
      })
    );
}
