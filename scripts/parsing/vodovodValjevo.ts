import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { toCyrillic } from '../../src/lib/text/serbianScript';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { isoDateIn, timeWindowIn } from './waterInterruption';

const CITY = 'Ваљево';
const INTERRUPTED = /без\s+водоснабдевањ|прекид\s+водоснабдевањ|без\s+воде/i;
const EMERGENCY = /квар|хавариј|оштећењ/i;
const MAX_NOTE_LENGTH = 500;

function inCyrillic(html: string): string {
  return toCyrillic(collapseWhitespace(decodeEntities(stripTags(html))));
}

export function parseValjevoAnnouncement(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const body = inCyrillic(content);

  if (!INTERRUPTED.test(body)) {
    return [];
  }

  const heading = inCyrillic(title);

  return [
    {
      utility: Utility.Water,
      kind: EMERGENCY.test(body) ? OutageKind.Emergency : OutageKind.Planned,
      date: isoDateIn(body) ?? isoDateIn(heading) ?? postedAt.slice(0, 10),
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: CITY,
      time: timeWindowIn(body),
      streets: [],
      reason: null,
      note: body.slice(0, MAX_NOTE_LENGTH),
      sourceUrl
    }
  ];
}
