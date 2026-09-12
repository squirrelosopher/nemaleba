import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, UTILITIES } from '../../src/lib/domain/utility';
import type { WordPressPost } from '../sources/wordPressPosts';
import { parseBorWorkPlan } from './vodovodBor';
import { parseBvkFaults, parseBvkPlannedWorks } from './bvkPages';
import { parseCacakNotice } from './vodovodCacak';
import { FeedReading, parseEpsFeed } from './epsTable';
import { parseGornjiMilanovacReport } from './jkpGornjiMilanovac';
import { parseIndjijaAnnouncement } from './vodovodIndjija';
import { parseKladovoNotice } from './jedinstvoKladovo';
import { parseLeskovacNotices } from './vodovodLeskovac';
import { parseNisAnnouncement } from './naissusNis';
import { parseNoviSadAnnouncement } from './vikNoviSad';
import { parsePozarevacNotices } from './vodovodPozarevac';
import { parseRumaAnnouncement } from './vodovodRuma';
import { parseValjevoAnnouncement } from './vodovodValjevo';
import { parseVikAnnouncement } from './vikAnnouncement';
import { parseVranjeAnnouncement } from './vodovodVranje';
import { NOMINATIVE } from './serbianPlaces';
import { parseWaterProse } from './waterProse';
import { parseZrenjaninWorks } from './vikZrenjanin';

const FIXTURES = 'data/fixtures';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{2}:\d{2}$/;
const CYRILLIC = /[Ѐ-ӿ]/;

function text(name: string): string {
  return readFileSync(`${FIXTURES}/${name}`, 'utf-8');
}

function posts(name: string): WordPressPost[] {
  return JSON.parse(text(name)) as WordPressPost[];
}

// Every source funnels its posts through the same shape, so one helper stands in for the
// adapter without pulling its I/O along.
function eachPost(
  name: string,
  parse: (post: WordPressPost) => RawOutage[]
): RawOutage[] {
  return posts(name).flatMap(parse);
}

// What a row has to be true of whatever produced it. A parser that starts inventing dates,
// dropping the city or handing back an empty label fails here rather than on the site,
// which is the only place the current source-health check would not notice: it counts
// rows, and a wrong row counts the same as a right one.
function expectWellFormed(outages: RawOutage[]): void {
  for (const outage of outages) {
    expect(UTILITIES).toContain(outage.utility);
    expect(Object.values(OutageKind)).toContain(outage.kind);

    expect(outage.date).toMatch(ISO_DATE);
    expect(Number.isNaN(Date.parse(outage.date))).toBe(false);

    expect(outage.cityNameCyrillic).toMatch(CYRILLIC);
    expect(outage.branchCyrillic).toMatch(CYRILLIC);
    expect(outage.areaLabel.trim()).not.toHaveLength(0);
    expect(outage.sourceUrl.trim()).not.toHaveLength(0);

    if (outage.time) {
      expect(outage.time.start ?? outage.time.end).toMatch(CLOCK);
    }

    for (const street of outage.streets) {
      expect(street.trim()).not.toHaveLength(0);
    }
  }
}

interface Case {
  name: string;
  parse: () => RawOutage[];
}

const CASES: Case[] = [
  {
    name: 'EPS Beograd',
    parse: () =>
      parseEpsFeed(text('eps-beograd.html'), 'Београд', 'https://elektrodistribucija.rs/x')
        .outages
  },
  {
    name: 'БВК кварови',
    parse: () => parseBvkFaults(text('bvk-faults.html'), 'https://www.bvk.rs/kvarovi-na-mrezi/')
  },
  {
    name: 'БВК планирани радови',
    parse: () =>
      parseBvkPlannedWorks(text('bvk-planned.html'), 'https://www.bvk.rs/planirani-radovi/')
  },
  {
    name: 'Наиссус Ниш',
    parse: () =>
      eachPost('naissus-nis.json', (post) =>
        parseNisAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Водовод Нови Сад',
    parse: () =>
      eachPost('novi-sad.json', (post) =>
        parseNoviSadAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Водовод Крагујевац, планирано',
    parse: () =>
      eachPost('kragujevac-planned.json', (post) =>
        parseVikAnnouncement(
          post.title.rendered,
          post.content.rendered,
          post.date,
          OutageKind.Planned,
          post.link
        )
      )
  },
  {
    name: 'Водовод Крагујевац, хаварије',
    parse: () =>
      eachPost('kragujevac-emergency.json', (post) =>
        parseVikAnnouncement(
          post.title.rendered,
          post.content.rendered,
          post.date,
          OutageKind.Emergency,
          post.link
        )
      )
  },
  {
    name: 'Водовод Зрењанин',
    parse: () =>
      eachPost('zrenjanin.json', (post) =>
        parseZrenjaninWorks(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Водовод Бор',
    parse: () =>
      eachPost('bor.json', (post) =>
        parseBorWorkPlan(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'ЈКП Горњи Милановац',
    parse: () =>
      eachPost('gornji-milanovac.json', (post) =>
        parseGornjiMilanovacReport(
          post.title.rendered,
          post.content.rendered,
          post.date,
          post.link
        )
      )
  },
  {
    name: 'Водовод Рума',
    parse: () =>
      eachPost('ruma.json', (post) =>
        parseRumaAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Водовод Инђија, кварови',
    parse: () =>
      eachPost('indjija-faults.json', (post) =>
        parseIndjijaAnnouncement(post.content.rendered, post.date, post.link, OutageKind.Emergency)
      )
  },
  {
    name: 'Водовод Инђија, радови',
    parse: () =>
      eachPost('indjija-works.json', (post) =>
        parseIndjijaAnnouncement(post.content.rendered, post.date, post.link, OutageKind.Planned)
      )
  },
  {
    name: 'Водовод Ваљево',
    parse: () =>
      eachPost('valjevo.json', (post) =>
        parseValjevoAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Водовод Врање',
    parse: () =>
      eachPost('vranje.json', (post) =>
        parseVranjeAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Јединство Кладово',
    parse: () =>
      eachPost('kladovo.json', (post) =>
        parseKladovoNotice(post.title.rendered, post.content.rendered, post.date, post.link)
      )
  },
  {
    name: 'Водовод Чачак',
    parse: () =>
      eachPost('cacak.json', (post) => parseCacakNotice(post.title.rendered, post.date, post.link))
  },
  {
    name: 'Водовод Лесковац',
    parse: () =>
      parseLeskovacNotices(
        text('leskovac.html'),
        'https://www.vodovodle.rs/servisne-informacije.php'
      )
  },
  {
    name: 'Водовод Пожаревац',
    parse: () => parsePozarevacNotices(text('pozarevac.html'), 'https://vodovod012.rs/vesti')
  },
  // Both take the published date, where the sources differ only in where they read it
  // from: Pančevo prefers the one in its own title. Which of the two arrives changes
  // nothing the prose parser does with it.
  {
    name: 'Водовод Сремска Митровица',
    parse: () =>
      eachPost('sremska-mitrovica.json', (post) =>
        parseWaterProse(post.content.rendered, post.date.slice(0, 10), post.link, {
          city: 'Сремска Митровица',
          nominative: NOMINATIVE
        })
      )
  },
  {
    name: 'Водовод Панчево',
    parse: () =>
      eachPost('pancevo.json', (post) =>
        parseWaterProse(post.content.rendered, post.date.slice(0, 10), post.link, {
          city: 'Панчево',
          nominative: NOMINATIVE
        })
      )
  }
];

describe('parsers against captured fixtures', () => {
  it.each(CASES)('$name yields well-formed rows', ({ parse }) => {
    const outages = parse();

    expect(outages.length).toBeGreaterThan(0);
    expectWellFormed(outages);
  });

  // A digest rather than the rows themselves: the Belgrade feed alone carries street lists
  // thousands of characters long, and a snapshot nobody can read is a snapshot nobody
  // checks. Count, first and last still move the moment a parser changes its mind.
  it.each(CASES)('$name keeps its shape', ({ name, parse }) => {
    const outages = parse();

    expect({
      count: outages.length,
      first: outages[0],
      last: outages[outages.length - 1]
    }).toMatchSnapshot(name);
  });
});

describe('a feed with nothing in it', () => {
  // Distinguishing "no works announced" from "the page moved under us" is what the whole
  // source-health check rests on, so the quiet day is pinned as deliberately as a busy one.
  it('reads as empty rather than unreadable', () => {
    const feed = parseEpsFeed(text('eps-nis.html'), 'Ниш', 'https://elektrodistribucija.rs/x');

    expect(feed.reading).toBe(FeedReading.Empty);
    expect(feed.outages).toHaveLength(0);
  });
});
