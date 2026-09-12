import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { base } from '$app/paths';
import { loadCityDataset } from '$lib/data/outageRepository';
import { failIfAsked } from '$lib/dev/failurePreview';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params, url }) => {
  if (dev) {
    failIfAsked(url);
  }

  const dataset = await loadCityDataset(fetch, base, params.city);

  if (!dataset) {
    error(404, 'Град није пронађен');
  }

  return { dataset };
};
