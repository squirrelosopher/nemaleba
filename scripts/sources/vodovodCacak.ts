import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseCacakNotice } from '../parsing/vodovodCacak';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://vodovodca.rs/wp-json/wp/v2/posts';
const ANNOUNCEMENTS = 3;
const POSTS = 12;

// The notice itself is an image, so the title is all there is to read.
export class VodovodCacakSource implements OutageSource {
  readonly id = 'jkp-vodovod-cacak';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Чачак';
  readonly silenceIsExpected = true;

  readonly provider: Provider = {
    id: 'jkp-vodovod-cacak',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Чачак',
    phone: '032 303 600',
    url: 'https://vodovodca.rs/',
    coverage: ['cacak']
  };

  async collect(): Promise<RawOutage[]> {
    const posts = await fetchPosts(ENDPOINT, ANNOUNCEMENTS, POSTS);

    return posts.flatMap((post) => parseCacakNotice(post.title.rendered, post.date, post.link));
  }
}
