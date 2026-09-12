import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseKladovoNotice } from '../parsing/jedinstvoKladovo';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://jedinstvojp.rs/wp-json/wp/v2/posts';
const SERVICE_INFORMATION = 14;
const POSTS = 12;

export class JedinstvoKladovoSource implements OutageSource {
  readonly id = 'jp-jedinstvo-kladovo';
  readonly utility = Utility.Water;
  readonly label = 'ЈП Јединство Кладово';
  readonly silenceIsExpected = true;

  readonly provider: Provider = {
    id: 'jp-jedinstvo-kladovo',
    utility: Utility.Water,
    nameCyrillic: 'Јединство Кладово',
    phone: '019 801 250',
    url: 'https://jedinstvojp.rs/',
    coverage: ['kladovo']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, SERVICE_INFORMATION, POSTS);

    return posts.flatMap((post) =>
      parseKladovoNotice(post.title.rendered, post.content.rendered, post.date, post.link)
    );
  }
}
