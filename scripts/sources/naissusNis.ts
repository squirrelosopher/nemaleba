import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseNisAnnouncement } from '../parsing/naissusNis';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://jkpnaissus.co.rs/wp-json/wp/v2/posts';
const SERVICE_CATEGORY = 42;
const POSTS = 15;

export class NaissusNisSource implements OutageSource {
  readonly id = 'jkp-naissus-nis';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Наиссус Ниш';

  readonly provider: Provider = {
    id: 'jkp-naissus-nis',
    utility: Utility.Water,
    nameCyrillic: 'Наиссус Ниш',
    phone: '0800 323 320',
    url: 'https://jkpnaissus.co.rs/',
    coverage: ['nis', 'medijana', 'pantelej', 'crveni-krst', 'palilula-nis', 'niska-banja']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, SERVICE_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseNisAnnouncement(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
