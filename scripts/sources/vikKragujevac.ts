import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { parseVikAnnouncement } from '../parsing/vikAnnouncement';
import { fetchJson } from './httpClient';
import { warn } from './sourceLog';

const ENDPOINT = 'https://jkpvik-kg.com/wp-json/wp/v2/posts';
const POSTS_PER_CATEGORY = 20;

const CATEGORY_KINDS: Array<{ category: number; kind: OutageKind }> = [
  { category: 1, kind: OutageKind.Planned },
  { category: 3, kind: OutageKind.Emergency }
];

interface WordPressPost {
  link: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
}

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

  async collect(): Promise<RawOutage[]> {
    const batches = await Promise.all(
      CATEGORY_KINDS.map(({ category, kind }) => this.collectCategory(category, kind))
    );

    return batches.flat();
  }

  private async collectCategory(category: number, kind: OutageKind): Promise<RawOutage[]> {
    const url = `${ENDPOINT}?categories=${category}&per_page=${POSTS_PER_CATEGORY}&_fields=link,date,title,content`;

    try {
      const posts = await fetchJson<WordPressPost[]>(url);

      return posts.flatMap((post) =>
        parseVikAnnouncement(post.title.rendered, post.content.rendered, post.date, kind, post.link)
      );
    } catch (error) {
      warn(`  skipped ${url}: ${(error as Error).message}`);
      return [];
    }
  }
}
