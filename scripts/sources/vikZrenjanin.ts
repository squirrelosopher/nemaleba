import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseZrenjaninWorks } from '../parsing/vikZrenjanin';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vikzr.rs/wp-json/wp/v2/posts';
const LATEST_NEWS_CATEGORY = 113;
const POSTS = 12;

export class VikZrenjaninSource implements OutageSource {
  readonly id = 'jkp-vik-zrenjanin';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод и канализација Зрењанин';

  readonly provider: Provider = {
    id: 'jkp-vik-zrenjanin',
    utility: Utility.Water,
    nameCyrillic: 'Водовод и канализација Зрењанин',
    phone: '023 593 000',
    url: 'https://vikzr.rs/',
    coverage: ['zrenjanin']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, LATEST_NEWS_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseZrenjaninWorks(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
