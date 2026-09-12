import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import { NATIONAL_COVERAGE, type Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { FeedReading, parseEpsFeed } from '../parsing/epsTable';
import { fetchText } from './httpClient';
import { warn } from './sourceLog';

const ORIGIN = 'https://elektrodistribucija.rs';
const FORECAST_DAYS = 4;

interface FeedDefinition {
  defaultBranch: string;
  url: (day: number) => string;
}

const FEEDS: FeedDefinition[] = [
  {
    defaultBranch: 'Београд',
    url: (day) => `${ORIGIN}/planirana-iskljucenja-beograd/Dan_${day}_Iskljucenja.htm`
  },
  // The Latin name belongs to the URL and nothing else. A branch reaches the dataset as
  // a name, and every name in the dataset is Cyrillic: a Latin one would slug alike but
  // compare unequal, so its outages would quietly miss the city they belong to.
  ...[
    { path: 'Kragujevac', branch: 'Крагујевац' },
    { path: 'Kraljevo', branch: 'Краљево' },
    { path: 'Nis', branch: 'Ниш' },
    { path: 'NoviSad', branch: 'Нови Сад' }
  ].map(({ path, branch }) => ({
    defaultBranch: branch,
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
  private unreadable: string[] = [];

  async collect(): Promise<RawOutage[]> {
    this.unreadable = [];

    const requests = FEEDS.flatMap((feed) =>
      Array.from({ length: FORECAST_DAYS }, (_, day) => this.collectFeed(feed, day))
    );

    const results = await Promise.all(requests);

    return results.flat();
  }

  unreadableFeeds(): string[] {
    return this.unreadable;
  }

  private async collectFeed(feed: FeedDefinition, day: number): Promise<RawOutage[]> {
    const url = feed.url(day);

    try {
      const parsed = parseEpsFeed(await fetchText(url), feed.defaultBranch, url);

      if (parsed.reading === FeedReading.Unreadable) {
        this.note(url, 'no date in the heading');
      }

      return parsed.outages;
    } catch (error) {
      this.note(url, (error as Error).message);
      return [];
    }
  }

  private note(url: string, reason: string): void {
    warn(`  unreadable ${url}: ${reason}`);
    this.unreadable.push(url);
  }
}
