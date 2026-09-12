import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseNoviSadAnnouncement } from '../parsing/vikNoviSad';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://www.vikns.rs/wp-json/wp/v2/posts';
const ANNOUNCEMENTS_CATEGORY = 43;
const POSTS = 20;

export class VikNoviSadSource implements OutageSource {
  readonly id = 'jkp-vik-novi-sad';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод и канализација Нови Сад';

  readonly provider: Provider = {
    id: 'jkp-vik-novi-sad',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Нови Сад',
    phone: '0800 333 021',
    url: 'https://www.vikns.rs/najava-radova/',
    coverage: ['novi-sad']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, ANNOUNCEMENTS_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseNoviSadAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
