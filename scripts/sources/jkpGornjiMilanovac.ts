import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseGornjiMilanovacReport } from '../parsing/jkpGornjiMilanovac';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://jkpgm.rs/wp-json/wp/v2/posts';
const SERVICE_CATEGORY = 23;
const POSTS = 10;

export class JkpGornjiMilanovacSource implements OutageSource {
  readonly id = 'jkp-gornji-milanovac';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Горњи Милановац';
  readonly silenceIsExpected = true;

  readonly provider: Provider = {
    id: 'jkp-gornji-milanovac',
    utility: Utility.Water,
    nameCyrillic: 'ЈКП Горњи Милановац',
    phone: '032 711 188',
    url: 'https://jkpgm.rs/',
    coverage: ['gornji-milanovac']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, SERVICE_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseGornjiMilanovacReport(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
