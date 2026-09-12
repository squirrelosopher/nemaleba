import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, decodeEntities, stripTags } from './html';

const BRANCH = 'Београд';
const POSTPONED = /одложен/i;

const TOGGLE = /data-title="([^"]+)"[\s\S]*?class='toggle_content[^']*'[^>]*>([\s\S]*?)<\/div><\/div>/g;
const DOTTED_DATE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
const UNTIL_HEADING = /<h1[^>]*>[\s\S]*?ДО\s*(\d{1,2}):(\d{2})[\s\S]*?<\/h1>/g;
const LIST_ITEM = /<li[^>]*>\s*<strong[^>]*>([^<]+?)\s*:?\s*<\/strong>\s*:?\s*([\s\S]*?)<\/li>/g;
const MUNICIPALITY_IN_TITLE = /општини\s+([\p{Lu}\p{Ll}\s]+?)(?:\s*$|,)/u;
const PERIOD = /од\s*(\d{1,2})[.:](\d{2})\s*до\s*(\d{1,2})[.:](\d{2})/;
const AFFECTED = /без воде[^.]*?потрошачи у\s+([\s\S]*?)\./;

function isoDate(value: string): string | null {
  const match = value.match(DOTTED_DATE);

  if (!match) {
    return null;
  }

  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function pad(value: string): string {
  return value.padStart(2, '0');
}

function splitStreets(value: string): string[] {
  return collapseWhitespace(decodeEntities(stripTags(value)))
    .split(',')
    .map((street) => street.trim())
    .filter((street) => street.length > 1);
}

function toggles(html: string): Array<{ title: string; content: string }> {
  TOGGLE.lastIndex = 0;
  const found: Array<{ title: string; content: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = TOGGLE.exec(html)) !== null) {
    found.push({ title: decodeEntities(match[1]), content: match[2] });
  }

  return found;
}

export function parseBvkFaults(html: string, sourceUrl: string): RawOutage[] {
  const outages: RawOutage[] = [];

  for (const { title, content } of toggles(html)) {
    const date = isoDate(title);

    if (!date) {
      continue;
    }

    UNTIL_HEADING.lastIndex = 0;
    const headings = [...content.matchAll(UNTIL_HEADING)];

    for (const [index, heading] of headings.entries()) {
      const start = (heading.index ?? 0) + heading[0].length;
      const end = headings[index + 1]?.index ?? content.length;
      const time: TimeWindow = {
        start: null,
        end: `${pad(heading[1])}:${heading[2]}`
      };

      LIST_ITEM.lastIndex = 0;

      for (const item of content.slice(start, end).matchAll(LIST_ITEM)) {
        const municipality = collapseWhitespace(decodeEntities(item[1])).replace(/:$/, '');

        outages.push({
          utility: Utility.Water,
          kind: OutageKind.Emergency,
          date,
          cityNameCyrillic: municipality,
          branchCyrillic: BRANCH,
          areaLabel: municipality,
          time,
          streets: splitStreets(item[2]),
          reason: null,
          note: collapseWhitespace(decodeEntities(stripTags(item[0]))) || null,
          sourceUrl
        });
      }
    }
  }

  return outages;
}

export function parseBvkPlannedWorks(html: string, sourceUrl: string): RawOutage[] {
  const outages: RawOutage[] = [];

  for (const { title, content } of toggles(html)) {
    const date = isoDate(title);

    if (!date || POSTPONED.test(title)) {
      continue;
    }

    const municipality = title.match(MUNICIPALITY_IN_TITLE)?.[1]?.trim();

    if (!municipality) {
      continue;
    }

    const text = collapseWhitespace(decodeEntities(stripTags(content)));
    const period = text.match(PERIOD);

    const time: TimeWindow | null = period
      ? {
          start: `${pad(period[1])}:${period[2]}`,
          end: `${pad(period[3])}:${period[4]}`
        }
      : null;

    const affected = text.match(AFFECTED)?.[1] ?? '';

    outages.push({
      utility: Utility.Water,
      kind: OutageKind.Planned,
      date,
      cityNameCyrillic: municipality,
      branchCyrillic: BRANCH,
      areaLabel: municipality,
      time,
      streets: affected
        ? affected.split(/,|\sи\s/).map((street) => street.trim()).filter((street) => street.length > 2)
        : [],
      reason: null,
      note: text || null,
      sourceUrl
    });
  }

  return outages;
}
