import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { toCyrillic } from '../../src/lib/text/serbianScript';
import { collapseWhitespace, decodeEntities, stripTags } from './html';
import { isoDateIn, timeWindowIn } from './waterInterruption';

const CITY = 'Пожаревац';
const ENTRY = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/gi;
const LOCATION = /<p\b[^>]*>([\s\S]*?)<\/p>/i;
const DESCRIPTION = /<div\b[^>]*class="[^"]*\bprose\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
const OUTAGE_HEADING = /isključenje\s+vode|havarij|radovi\s+na\s+mreži/i;
const EMERGENCY_HEADING = /havarij/i;
const EMERGENCY_BODY = /квар|хавариј|оштећењ/i;
const MAX_NOTE_LENGTH = 400;

function text(html: string): string {
  return collapseWhitespace(decodeEntities(stripTags(html)));
}

export function parsePozarevacNotices(page: string, sourceUrl: string): RawOutage[] {
  return [...page.matchAll(ENTRY)].flatMap((entry) => {
    const heading = text(entry[1]);

    if (!OUTAGE_HEADING.test(heading)) {
      return [];
    }

    const date = isoDateIn(heading);

    if (!date) {
      return [];
    }

    const where = text(entry[2].match(LOCATION)?.[1] ?? '');
    const body = toCyrillic(text(entry[2].match(DESCRIPTION)?.[1] ?? ''));
    const emergency = EMERGENCY_HEADING.test(heading) || EMERGENCY_BODY.test(body);

    return [
      {
        utility: Utility.Water,
        kind: emergency ? OutageKind.Emergency : OutageKind.Planned,
        date,
        cityNameCyrillic: CITY,
        branchCyrillic: CITY,
        areaLabel: where ? toCyrillic(where) : CITY,
        time: timeWindowIn(body),
        streets: [],
        reason: null,
        note: body.slice(0, MAX_NOTE_LENGTH),
        sourceUrl
      }
    ];
  });
}
