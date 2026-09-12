import { mkdir, writeFile } from 'node:fs/promises';
import type { City } from '../../src/lib/domain/city';

const OUTPUT_ROOT = 'static';

const INDEXED_PREFIXES = ['', '/sr-cyr', '/en'];

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urls(origin: string, cities: City[]): string[] {
  const paths = ['', ...cities.map((city) => `/${city.id}`)];

  return INDEXED_PREFIXES.flatMap((prefix) =>
    paths.map((path) => `${origin}${prefix}${path}/`)
  );
}

export async function writeSiteIndex(cities: City[], generatedAt: string): Promise<void> {
  const origin = (process.env.SITE_ORIGIN ?? '').replace(/\/$/, '');

  await mkdir(OUTPUT_ROOT, { recursive: true });

  if (!origin) {
    await writeFile(`${OUTPUT_ROOT}/robots.txt`, 'User-agent: *\nAllow: /\n', 'utf-8');
    return;
  }

  const day = generatedAt.slice(0, 10);

  const entries = urls(origin, cities)
    .map((url) => `  <url>\n    <loc>${escape(url)}</loc>\n    <lastmod>${day}</lastmod>\n  </url>`)
    .join('\n');

  await writeFile(
    `${OUTPUT_ROOT}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
    'utf-8'
  );

  await writeFile(
    `${OUTPUT_ROOT}/robots.txt`,
    `User-agent: *\nAllow: /\nDisallow: /obavestenja\nDisallow: /en/obavestenja\nDisallow: /sr-cyr/obavestenja\n\nSitemap: ${origin}/sitemap.xml\n`,
    'utf-8'
  );
}
