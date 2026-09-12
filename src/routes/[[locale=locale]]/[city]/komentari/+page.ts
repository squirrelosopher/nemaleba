import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
  const { registry } = await parent();
  const city = registry.cities.find((candidate) => candidate.id === params.city);

  if (!city) {
    error(404, 'Град није пронађен');
  }

  return { city };
};
