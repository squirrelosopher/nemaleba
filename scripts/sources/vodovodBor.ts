import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseBorWorkPlan } from '../parsing/vodovodBor';
import { BROWSER_USER_AGENT } from './httpClient';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vodovodbor.com/wp-json/wp/v2/posts';
const DAILY_WORKS_CATEGORY = 22;
const POSTS = 6;

export class VodovodBorSource implements OutageSource {
  readonly id = 'jkp-vodovod-bor';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Бор';

  readonly provider: Provider = {
    id: 'jkp-vodovod-bor',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Бор',
    phone: '030 458 850',
    url: 'https://vodovodbor.com/',
    coverage: ['bor']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, DAILY_WORKS_CATEGORY, POSTS, {
      userAgent: BROWSER_USER_AGENT
    });

    return posts.flatMap((post) =>
      parseBorWorkPlan(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
