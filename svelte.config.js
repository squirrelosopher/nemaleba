import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const basePath = process.env.BASE_PATH ?? '';

// Latin is served bare; the other two take a prefix. Latin's own /sr-lat prefix used to be
// prerendered as well, which was a byte-identical copy of every page whose canonical
// pointed back at the bare URL -- a quarter of the build that nothing linked to and
// crawlers were told to ignore. static/_redirects sends it to the canonical instead.
const LOCALE_PREFIXES = ['', '/sr-cyr', '/en'];

const STATIC_PATHS = ['/', '/obavestenja', '/obavestenja/podesavanja'];

function entries() {
  let paths = [...STATIC_PATHS];

  try {
    const registry = JSON.parse(readFileSync('static/data/registry.json', 'utf-8'));
    paths = paths.concat(
      registry.cities.flatMap((city) => [`/${city.id}`, `/${city.id}/komentari`])
    );
  } catch {
    // A missing dataset only means fewer pages to prerender, not a broken build.
  }

  return LOCALE_PREFIXES.flatMap((prefix) =>
    paths.map((path) => `${prefix}${path}`.replace(/\/$/, '') || '/')
  );
}

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: '404.html', strict: false }),
    paths: { base: basePath },
    prerender: { entries: entries() }
  }
};
