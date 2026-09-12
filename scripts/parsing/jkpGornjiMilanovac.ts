import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { collapseWhitespace, stripTags } from './html';
import { isoDateIn, splitStreetList, timeWindowIn } from './waterInterruption';

const CITY = 'Горњи Милановац';
const SERVICE_TITLE = /Сервисне\s+информације\s+за/i;
const WATER_HEADING = /ВОДОСНА[БД]{2}ЕВАЊЕ/;
const NEXT_HEADING = /[КK]ОМУНАЛНА|ГРОБЉЕ|ЗЕЛЕНИЛО|ПИЈАЦА|ПАРКИНГ/;
const SENTENCE_BREAK = /(?<!\d)\.\s+/;
const INTERRUPTED = /прекид|без\s+воде|нема\s+воде/i;
const UNCHANGED = /остаје\s+непромењен|нормализован/i;
const AFFECTED_CONSUMERS = /(?:корисник|потрошач)\S*\s+у\s+(.+)$/i;
const AFFECTED_AREA = /(?:на\s+подручју|у\s+водоснабдевању\s+у)\s+(.+)$/i;
const MAX_NOTE_LENGTH = 600;

function waterSection(body: string): string {
  const start = body.search(WATER_HEADING);

  if (start < 0) {
    return '';
  }

  const rest = body.slice(start).replace(WATER_HEADING, '');
  const end = rest.search(NEXT_HEADING);

  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

export function parseGornjiMilanovacReport(
  title: string,
  content: string,
  postedAt: string,
  sourceUrl: string
): RawOutage[] {
  const heading = collapseWhitespace(stripTags(title));

  if (!SERVICE_TITLE.test(heading)) {
    return [];
  }

  const section = waterSection(collapseWhitespace(stripTags(content).replace(/\s+/g, ' ')));
  const date = isoDateIn(heading) ?? postedAt.slice(0, 10);

  return section
    .split(SENTENCE_BREAK)
    .map((sentence) => sentence.trim())
    .filter((sentence) => INTERRUPTED.test(sentence) && !UNCHANGED.test(sentence))
    .map((sentence) => {
      const listed =
        sentence.match(AFFECTED_CONSUMERS)?.[1] ?? sentence.match(AFFECTED_AREA)?.[1] ?? '';

      return {
        utility: Utility.Water,
        kind: OutageKind.Emergency,
        date,
        cityNameCyrillic: CITY,
        branchCyrillic: CITY,
        areaLabel: CITY,
        time: timeWindowIn(sentence),
        streets: splitStreetList(listed),
        reason: null,
        note: sentence.slice(0, MAX_NOTE_LENGTH),
        sourceUrl
      };
    })
    .filter((outage) => outage.streets.length > 0);
}
