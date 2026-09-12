import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseVranjeAnnouncement } from '../parsing/vodovodVranje';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vodovodvranje.rs/wp-json/wp/v2/posts';
const NOTICES_CATEGORY = 8;
const POSTS = 15;

export class VodovodVranjeSource implements OutageSource {
  readonly id = 'jp-vodovod-vranje';
  readonly utility = Utility.Water;
  readonly label = 'ЈП Водовод Врање';

  readonly provider: Provider = {
    id: 'jp-vodovod-vranje',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Врање',
    phone: '017 421 601',
    url: 'https://vodovodvranje.rs/',
    coverage: ['vranje']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, NOTICES_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseVranjeAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
