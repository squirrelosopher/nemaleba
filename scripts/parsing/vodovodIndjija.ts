import type { RawOutage } from '../../src/lib/domain/outage';
import type { OutageKind } from '../../src/lib/domain/utility';
import { Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, stripTags } from './html';
import { isoDateIn, splitStreetList, timeWindowIn } from './waterInterruption';

const CITY = 'Инђија';
const INTERRUPTED = /прекинут[оа]?\s+водоснабдевањ|прекид\s+водоснабдевањ|без\s+водоснабдевањ/i;
const SETTLEMENT = /у\s+насељ[уи]\s+(\p{Lu}[\p{Ll}]+(?:\s+\p{Lu}[\p{Ll}]+){0,2})/u;
const STREET_LIST = /у\s+(?:следећим\s+)?улицама\s*:?\s*(.+)$/i;
const WHOLE_SETTLEMENT = /у\s+читавом\s+насељу/i;
const MAX_NOTE_LENGTH = 600;

export function parseIndjijaAnnouncement(
  content: string,
  postedAt: string,
  sourceUrl: string,
  kind: OutageKind
): RawOutage[] {
  const body = collapseWhitespace(stripTags(content).replace(/\s+/g, ' '));

  if (!INTERRUPTED.test(body)) {
    return [];
  }

  const listed = WHOLE_SETTLEMENT.test(body) ? '' : body.match(STREET_LIST)?.[1] ?? '';

  return [
    {
      utility: Utility.Water,
      kind,
      date: isoDateIn(body) ?? postedAt.slice(0, 10),
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: body.match(SETTLEMENT)?.[1]?.trim() ?? CITY,
      time: timeWindowIn(body),
      streets: splitStreetList(listed),
      reason: null,
      note: body.slice(0, MAX_NOTE_LENGTH),
      sourceUrl
    }
  ];
}
