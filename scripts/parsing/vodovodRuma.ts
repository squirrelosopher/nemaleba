import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, stripTags } from './html';
import { isoDateIn, splitStreetList, timeWindowIn } from './waterInterruption';

const CITY = 'Рума';
const NEIGHBOURING_MUNICIPALITIES = new Set(['Ириг']);
const TITLE_AREA = /^Обавештење\s*[-–—]\s*(.+)$/i;
const INTERRUPTED = /без\s+водоснабдевањ|прекид[у]?\s+водоснабдевањ|санациј[аеу]\s+квара|квар\s+на\s+водоводн/i;
const AFTER_CONSUMERS = /потрошач[аи][^:]*:\s*(.+)$/i;
const IN_SETTLEMENTS = /у\s+насељима\s+(.+)$/i;
const IN_STREET = /.*\sу\s+([^,.]*?улиц[аеиу][^,.]*)/i;
const STREET_THEN_PLACE = /^(.+?)\s+у\s+\p{Lu}[\p{L}]+$/u;
const MAX_AREA_LENGTH = 60;
const MAX_NOTE_LENGTH = 600;

export function parseRumaAnnouncement(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const heading = collapseWhitespace(stripTags(title));
  const body = collapseWhitespace(stripTags(content).replace(/\s+/g, ' '));

  if (!INTERRUPTED.test(body)) {
    return [];
  }

  const area = heading.match(TITLE_AREA)?.[1]?.trim() ?? CITY;
  const municipality = NEIGHBOURING_MUNICIPALITIES.has(area) ? area : CITY;
  const announced = isoDateIn(body);

  const listed =
    body.match(AFTER_CONSUMERS)?.[1] ??
    body.match(IN_SETTLEMENTS)?.[1] ??
    body.match(IN_STREET)?.[1] ??
    '';

  const named = splitStreetList(listed.replace(STREET_THEN_PLACE, '$1'));

  return [
    {
      utility: Utility.Water,
      kind: announced ? OutageKind.Planned : OutageKind.Emergency,
      date: announced ?? postedAt.slice(0, 10),
      cityNameCyrillic: municipality,
      branchCyrillic: CITY,
      areaLabel: area.length <= MAX_AREA_LENGTH ? area : CITY,
      time: timeWindowIn(body),
      streets: named.filter((street) => !area.includes(street)),
      reason: null,
      note: body.slice(0, MAX_NOTE_LENGTH),
      sourceUrl
    }
  ];
}
