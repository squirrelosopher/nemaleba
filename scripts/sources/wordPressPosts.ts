import { fetchJson } from './httpClient';

export interface WordPressPost {
  link: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
}

const FIELDS = 'link,date,title,content';

// The failure is raised rather than logged. Swallowing it returned an empty list, which
// is indistinguishable from a feed that had nothing to say -- so Niš answering 403 to the
// collector's user agent read as "the parser stopped working" and refused to publish the
// other seventeen sources with it.
export async function fetchPosts(
  endpoint: string,
  category: number,
  perPage: number
): Promise<WordPressPost[]> {
  const url = `${endpoint}?categories=${category}&per_page=${perPage}&_fields=${FIELDS}`;

  return await fetchJson<WordPressPost[]>(url);
}
