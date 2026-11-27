import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import { NATIONAL_COVERAGE, type Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { FeedReading, parseEpsFeed } from '../parsing/epsTable';
import { fetchText } from './httpClient';
import { FeedReadings } from './feedReadings';

const ORIGIN = 'https://elektrodistribucija.rs';
const FORECAST_DAYS = 4;

interface FeedDefinition {
  defaultBranch: string;
  // The branches whose outages this regional feed carries, so that losing the feed tells
  // only those cities their electricity data is missing. Read off the committed dataset on
  // 2026-11-27 (which branch's rows came from which feed), plus Лесковац and Врање under
  // Niš and Нови Пазар under Kraljevo, which had no rows that day. Together they hold all
  // 26 branches the register's cities carry; a new branch belongs in one of them.
  branches: string[];
  url: (day: number) => string;
}

const FEEDS: FeedDefinition[] = [
  {
    defaultBranch: 'Београд',
    branches: ['Београд'],
    url: (day) => `${ORIGIN}/planirana-iskljucenja-beograd/Dan_${day}_Iskljucenja.htm`
  },
  // The Latin name belongs to the URL and nothing else. A branch reaches the dataset as
  // a name, and every name in the dataset is Cyrillic: a Latin one would slug alike but
  // compare unequal, so its outages would quietly miss the city they belong to.
  ...[
    { path: 'Kragujevac', branch: 'Крагујевац', branches: ['Крагујевац', 'Пожаревац', 'Смедерево'] },
    {
      path: 'Kraljevo',
      branch: 'Краљево',
      branches: ['Краљево', 'Чачак', 'Крушевац', 'Ужице', 'Шабац', 'Јагодина', 'Лозница', 'Ваљево', 'Нови Пазар']
    },
    {
      path: 'Nis',
      branch: 'Ниш',
      branches: ['Ниш', 'Пирот', 'Прокупље', 'Зајечар', 'Лесковац', 'Врање']
    },
    {
      path: 'NoviSad',
      branch: 'Нови Сад',
      branches: ['Нови Сад', 'Сомбор', 'Суботица', 'Рума', 'Зрењанин', 'Панчево', 'Сремска Митровица']
    }
  ].map(({ path, branch, branches }) => ({
    defaultBranch: branch,
    branches,
    url: (day: number) =>
      `${ORIGIN}/planirana-iskljucenja-srbija/${path}_Dan_${day}_Iskljucenja.htm`
  }))
];

export class EpsDistribucijaSource implements OutageSource {
  readonly id = 'eps-distribucija';
  readonly utility = Utility.Electricity;
  readonly label = 'ЕПС Дистрибуција';

  readonly provider: Provider = {
    id: 'eps-distribucija',
    utility: Utility.Electricity,
    nameCyrillic: 'ЕПС Дистрибуција',
    phone: '0800 360 300',
    url: 'https://elektrodistribucija.rs/planirana-iskljucenja',
    coverage: NATIONAL_COVERAGE
  };

  // Five regions and four days each, and one of them going quiet says nothing about the
  // rest. A region that cannot be read is reported rather than counted as quiet: no rows
  // from Belgrade is a day with no works planned, or the page moving under us, and the
  // two look identical from the outage count alone.
  private readings = new FeedReadings();
  private missingBranches = new Set<string>();

  async collect(): Promise<RawOutage[]> {
    this.readings.start();
    this.missingBranches.clear();

    const requests = FEEDS.flatMap((feed) =>
      Array.from({ length: FORECAST_DAYS }, (_, day) => this.collectFeed(feed, day))
    );

    const results = await Promise.all(requests);

    return results.flat();
  }

  unreadableFeeds(): string[] {
    return this.readings.unreadable();
  }

  unreadableBranches(): string[] | null {
    return this.missingBranches.size > 0 ? [...this.missingBranches] : null;
  }

  private async collectFeed(feed: FeedDefinition, day: number): Promise<RawOutage[]> {
    const url = feed.url(day);
    let headingMissing = false;

    const { outages, failed } = await this.readings.readFeed(url, async () => {
      const parsed = parseEpsFeed(await fetchText(url), feed.defaultBranch, url);

      if (parsed.reading === FeedReading.Unreadable) {
        this.readings.note(url, 'no date in the heading');
        headingMissing = true;
      }

      return parsed.outages;
    });

    if (failed || headingMissing) {
      feed.branches.forEach((branch) => this.missingBranches.add(branch));
    }

    return outages;
  }
}
