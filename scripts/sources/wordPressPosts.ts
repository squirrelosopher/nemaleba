import { fetchJson, type FetchOptions } from './httpClient';
import { warn } from './sourceLog';

export interface WordPressPost {
  link: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
}

const FIELDS = 'link,date,title,content';

export async function fetchPosts(
  endpoint: string,
  category: number,
  perPage: number,
  options: FetchOptions = {}
): Promise<WordPressPost[]> {
  const url = `${endpoint}?categories=${category}&per_page=${perPage}&_fields=${FIELDS}`;

  try {
    return await fetchJson<WordPressPost[]>(url, options);
  } catch (error) {
    warn(`  skipped ${url}: ${(error as Error).message}`);
    return [];
  }
}
