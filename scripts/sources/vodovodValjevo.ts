import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseValjevoAnnouncement } from '../parsing/vodovodValjevo';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vodovodva.co.rs/wp-json/wp/v2/posts';
const NEWS_CATEGORY = 1;
const POSTS = 15;

export class VodovodValjevoSource implements OutageSource {
  readonly id = 'jkp-vodovod-valjevo';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Ваљево';

  readonly provider: Provider = {
    id: 'jkp-vodovod-valjevo',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Ваљево',
    phone: '014 221 128',
    url: 'https://vodovodva.co.rs/',
    coverage: ['valjevo']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, NEWS_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseValjevoAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
