import type { RawOutage, TimeWindow } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { extractRows, textOf } from './html';

const HEADER_LABELS = new Set(['Огранак', 'Општина', 'Време', 'Улице']);
const BRANCH_MUNICIPALITY_TIME_STREETS = 4;
const MUNICIPALITY_TIME_STREETS = 3;

const DOTTED_DATE = /(\d{2})\.(\d{2})\.(\d{4})/;
const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const TIME_RANGE = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;
const NUMBERED_STREETS = /:\s/;

function parseDate(header: string): string | null {
  const iso = header.match(ISO_DATE);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const dotted = header.match(DOTTED_DATE);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : null;
}

// The feed gives this column as a range or not at all. A cell naming no range holds no
// window either, and the row reads as all day rather than repeating an unparsed string.
function parseTime(value: string): TimeWindow | null {
  const match = value.match(TIME_RANGE);

  return match ? { start: match[1], end: match[2] } : null;
}

function splitStreets(value: string): string[] {
  const separator = NUMBERED_STREETS.test(value) ? /,\s{2,}/ : /,\s*/;

  return value
    .split(separator)
    .map((street) => street.replace(/[,\s]+$/, '').trim())
    .filter((street) => street.length > 0);
}

export const FeedReading = {
  Rows: 'rows',
  Empty: 'empty',
  Unreadable: 'unreadable'
} as const;

export type FeedReading = (typeof FeedReading)[keyof typeof FeedReading];

export interface EpsFeed {
  reading: FeedReading;
  outages: RawOutage[];
}

// A feed that names its own date has been read, so a table with no rows under that date
// is the utility announcing nothing rather than a guess of ours. One that names no date
// has changed shape, or was never the page we asked for, and says nothing either way.
export function parseEpsFeed(html: string, defaultBranch: string, sourceUrl: string): EpsFeed {
  const rows = extractRows(html);
  const heading = textOf(html.match(/<td[^>]*>[\s\S]*?<\/td>/i)?.[0] ?? '');
  const date = parseDate(heading);

  if (!date) {
    return { reading: FeedReading.Unreadable, outages: [] };
  }

  const outages: RawOutage[] = [];

  for (const cells of rows) {
    if (cells.length === BRANCH_MUNICIPALITY_TIME_STREETS) {
      const [branch, municipality, time, streets] = cells;
      if (HEADER_LABELS.has(branch)) {
        continue;
      }
      outages.push(buildOutage(branch, municipality, time, streets, date, sourceUrl));
      continue;
    }

    if (cells.length === MUNICIPALITY_TIME_STREETS) {
      const [municipality, time, streets] = cells;
      if (HEADER_LABELS.has(municipality)) {
        continue;
      }
      outages.push(buildOutage(defaultBranch, municipality, time, streets, date, sourceUrl));
    }
  }

  return {
    reading: outages.length > 0 ? FeedReading.Rows : FeedReading.Empty,
    outages
  };
}

function buildOutage(
  branch: string,
  municipality: string,
  time: string,
  streets: string,
  date: string,
  sourceUrl: string
): RawOutage {
  return {
    utility: Utility.Electricity,
    kind: OutageKind.Planned,
    date,
    cityNameCyrillic: municipality.trim(),
    branchCyrillic: branch.trim(),
    areaLabel: municipality.trim(),
    time: parseTime(time),
    streets: splitStreets(streets),
    reason: null,
    note: streets.trim() || null,
    sourceUrl
  };
}
