import { error } from '@sveltejs/kit';
import { base } from '$app/paths';
import { loadCityDataset } from '$lib/data/outageRepository';
import { streetNamed } from '$lib/search/streetSearch';
import type { PageLoad } from './$types';

// Never prerendered. There are 58,947 streets with a page on this site and three locales,
// so prerendering them would be a hundred and seventy thousand files for URLs nobody
// arrives at from outside -- a reader reaches one by typing in the search box, which is a
// client-side navigation with the dataset already in hand.
export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const [dataset, street] = await Promise.all([
    loadCityDataset(fetch, base, params.city),
    // The slug cannot be spelled back into a name -- it is folded, undiacriticked and
    // Latin -- so the register is asked. Resolving it here rather than in the component
    // is what keeps the heading from being blank until a fetch lands.
    streetNamed(fetch, base, params.city, params.street)
  ]);

  if (!dataset) {
    error(404, 'Град није пронађен');
  }

  // A slug the register has no street for is not a page. Rendering one would answer a
  // made-up address with "nothing names this street", which reads as reassurance.
  if (!street) {
    error(404, 'Улица није пронађена');
  }

  return { dataset, street };
};
