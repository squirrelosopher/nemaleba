import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { isoDateIn, splitStreetList, timeWindowIn } from './waterInterruption';

const CITY = 'Лесковац';
const REGION = /<!--\s*NOVA SAOPSTENJA BEGIN\s*-->([\s\S]*?)<!--\s*NOVA SAOPSTENJA END\s*-->/i;
const SECTION = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/gi;
const POSTED_DATE = /class=['"]dateandcategories['"][^>]*>([\s\S]*?)<\/div>/i;
const PARAGRAPH = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
const INTERRUPTED = /прекид[ау]?\s+(?:у\s+)?водоснабдевањ|без\s+вод[еы]/i;
const STREET_LIST = /улице\s*:?\s*(.+?)(?:\.|$)/i;
const EMERGENCY = /квар|хавариј|оштећењ/i;
const MAX_NOTE_LENGTH = 500;

function text(html: string): string {
  return collapseWhitespace(decodeEntities(stripTags(html)));
}

function bodyOf(section: string): string {
  return text([...section.matchAll(PARAGRAPH)].map((paragraph) => paragraph[1]).join(' '));
}

export function parseLeskovacNotices(page: string, sourceUrl: string): RawOutage[] {
  const region = page.match(REGION)?.[1] ?? '';

  return [...region.matchAll(SECTION)].flatMap((section) => {
    const body = bodyOf(section[2]);

    if (!INTERRUPTED.test(body)) {
      return [];
    }

    const postedOn = text(section[2].match(POSTED_DATE)?.[1] ?? '');
    const listed = body.match(STREET_LIST)?.[1] ?? '';

    return [
      {
        utility: Utility.Water,
        kind: EMERGENCY.test(body) ? OutageKind.Emergency : OutageKind.Planned,
        date: isoDateIn(body) ?? isoDateIn(postedOn) ?? '',
        cityNameCyrillic: CITY,
        branchCyrillic: CITY,
        areaLabel: CITY,
        time: timeWindowIn(body),
        streets: splitStreetList(listed),
        reason: null,
        note: body.slice(0, MAX_NOTE_LENGTH),
        sourceUrl
      }
    ];
  });
}
