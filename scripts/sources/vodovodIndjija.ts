import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { parseIndjijaAnnouncement } from '../parsing/vodovodIndjija';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vodovodindjija.co.rs/wp-json/wp/v2/posts';
const FAULTS_CATEGORY = 1;
const WORKS_CATEGORY = 52;
const POSTS = 12;

export class VodovodIndjijaSource implements OutageSource {
  readonly id = 'jkp-vodovod-indjija';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Инђија';

  readonly provider: Provider = {
    id: 'jkp-vodovod-indjija',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Инђија',
    phone: '022 561 445',
    url: 'https://vodovodindjija.co.rs/',
    coverage: ['indjija']
  };

  async collect(): Promise<RawOutage[]> {
    const [faults, works] = await Promise.all([
      fetchPosts(ENDPOINT, FAULTS_CATEGORY, POSTS),
      fetchPosts(ENDPOINT, WORKS_CATEGORY, POSTS)
    ]);

    return [
      ...faults.flatMap((post) =>
        parseIndjijaAnnouncement(post.content.rendered, post.date, post.link, OutageKind.Emergency)
      ),
      ...works.flatMap((post) =>
        parseIndjijaAnnouncement(post.content.rendered, post.date, post.link, OutageKind.Planned)
      )
    ];
  }
}
