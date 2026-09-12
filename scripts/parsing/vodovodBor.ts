import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { toCyrillic } from '../../src/lib/text/serbianScript';
import { decodeEntities } from './html';
import { isoDateIn } from './waterInterruption';

const CITY = 'Бор';
const WATER_SECTION = /Sanacija\s+kvarova\s+na\s+vodovodnoj\s+mre[žz]i\s*:?([\s\S]*?)(?=\n\s*\d\s*\.|$)/i;
const NOT_A_LOCATION = /merni[mh]?\s+mesti|[šs]ahta|po\s+prijavama|nema\s+radova|^-+$/i;
const MAX_STREET_LENGTH = 95;
const MAX_NOTE_LENGTH = 600;

function textLines(html: string): string[] {
  return decodeEntities(
    html
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
  )
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim());
}

export function parseBorWorkPlan(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const heading = decodeEntities(title.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const body = textLines(content).join('\n');
  const section = body.match(WATER_SECTION)?.[1];

  if (!section) {
    return [];
  }

  const streets = section
    .split('\n')
    .map((line) => line.replace(/^[\s\-–—•]+/, '').replace(/[.;]+$/, '').trim())
    .filter((line) => line.length > 2 && line.length <= MAX_STREET_LENGTH)
    .filter((line) => !NOT_A_LOCATION.test(line))
    .map(toCyrillic);

  if (streets.length === 0) {
    return [];
  }

  return [
    {
      utility: Utility.Water,
      kind: OutageKind.Emergency,
      date: isoDateIn(heading) ?? postedAt.slice(0, 10),
      cityNameCyrillic: CITY,
      branchCyrillic: CITY,
      areaLabel: CITY,
      time: null,
      streets,
      reason: 'Санација кварова на водоводној мрежи',
      note: toCyrillic(section.replace(/\s+/g, ' ').trim()).slice(0, MAX_NOTE_LENGTH),
      sourceUrl
    }
  ];
}
