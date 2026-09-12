import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { NOMINATIVE } from '../parsing/serbianPlaces';
import { parseWaterProse } from '../parsing/waterProse';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://www.vodovodsm.rs/wp-json/wp/v2/posts';
const OUTAGES_CATEGORY = 17;
const POSTS = 15;

export class VodovodSremskaMitrovicaSource implements OutageSource {
  readonly id = 'jkp-vodovod-sremska-mitrovica';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Сремска Митровица';

  readonly provider: Provider = {
    id: 'jkp-vodovod-sremska-mitrovica',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Сремска Митровица',
    phone: '022 610 588',
    url: 'https://www.vodovodsm.rs/',
    coverage: ['sremska-mitrovica']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, OUTAGES_CATEGORY, POSTS);

    return posts.flatMap((post) =>
      parseWaterProse(post.content.rendered, post.date.slice(0, 10), post.link, {
        city: 'Сремска Митровица',
        nominative: NOMINATIVE
      })
    );
  }
}
