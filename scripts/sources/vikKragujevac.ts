import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { parseVikAnnouncement } from '../parsing/vikAnnouncement';
import { fetchPosts } from './wordPressPosts';

const ENDPOINT = 'https://jkpvik-kg.com/wp-json/wp/v2/posts';
const POSTS_PER_CATEGORY = 20;

const CATEGORY_KINDS: Array<{ category: number; kind: OutageKind }> = [
  { category: 1, kind: OutageKind.Planned },
  { category: 3, kind: OutageKind.Emergency }
];

export class VikKragujevacSource implements OutageSource {
  readonly id = 'jkp-vik-kragujevac';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод и канализација Крагујевац';

  readonly provider: Provider = {
    id: 'jkp-vik-kragujevac',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Крагујевац',
    phone: '0800 009 008',
    url: 'https://jkpvik-kg.com/iskljucenja/',
    coverage: ['kragujevac']
  };

  // Two categories, planned and emergency, and one of them refusing says nothing about
  // the other. This is the largest water source on the site, so what can be read is kept
  // and what cannot is reported, rather than the pair being abandoned together.
  private unreadable: string[] = [];

  async collect(): Promise<RawOutage[]> {
    this.unreadable = [];

    const batches = await Promise.all(
      CATEGORY_KINDS.map(({ category, kind }) => this.collectCategory(category, kind))
    );

    return batches.flat();
  }

  unreadableFeeds(): string[] {
    return this.unreadable;
  }

  private async collectCategory(category: number, kind: OutageKind): Promise<RawOutage[]> {
    try {
      const posts = await fetchPosts(ENDPOINT, category, POSTS_PER_CATEGORY);

      return posts.flatMap((post) =>
        parseVikAnnouncement(post.title.rendered, post.content.rendered, post.date, kind, post.link)
      );
    } catch (error) {
      this.unreadable.push(`category ${category}: ${(error as Error).message}`);
      return [];
    }
  }
}
