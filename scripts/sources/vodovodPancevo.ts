import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { NOMINATIVE } from '../parsing/serbianPlaces';
import { parseWaterProse } from '../parsing/waterProse';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://www.vodovodpa.rs/wp-json/wp/v2/posts';
const OUTAGES_CATEGORY = 7;
const POSTS = 15;
const TITLE_DATE = /(\d{1,2})[./](\d{1,2})[./](\d{4})/;

export class VodovodPancevoSource implements OutageSource {
  readonly id = 'jkp-vodovod-pancevo';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод и канализација Панчево';

  readonly provider: Provider = {
    id: 'jkp-vodovod-pancevo',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Панчево',
    phone: '013 318 220',
    url: 'https://www.vodovodpa.rs/',
    coverage: ['pancevo']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, OUTAGES_CATEGORY, POSTS);

    return posts.flatMap((post) => {
      const match = post.title.rendered.match(TITLE_DATE);
      const date = match
        ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
        : post.date.slice(0, 10);

      return parseWaterProse(post.content.rendered, date, post.link, {
        city: 'Панчево',
        nominative: NOMINATIVE
      });
    });
  }
}
