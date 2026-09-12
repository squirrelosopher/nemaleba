import { base } from '$app/paths';
import { loadRegistry } from '$lib/data/outageRepository';
import type { LayoutLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const load: LayoutLoad = async ({ fetch }) => {
  return { registry: await loadRegistry(fetch, base) };
};
