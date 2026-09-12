import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseRumaAnnouncement } from '../parsing/vodovodRuma';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vodovod-ruma.co.rs/wp-json/wp/v2/posts';
const NOTICES_CATEGORY = 1;
const POSTS = 20;

export class VodovodRumaSource implements OutageSource {
  readonly id = 'jkp-vodovod-ruma';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Рума';

  readonly provider: Provider = {
    id: 'jkp-vodovod-ruma',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Рума',
    phone: '022 478 322',
    url: 'https://vodovod-ruma.co.rs/',
    coverage: ['ruma']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, NOTICES_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseRumaAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
