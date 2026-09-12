import type { CityDataset, Registry } from '$lib/domain/city';

type Fetcher = typeof fetch;

const HTTP_NOT_FOUND = 404;

export async function loadRegistry(fetcher: Fetcher, base: string): Promise<Registry> {
  const response = await fetcher(`${base}/data/registry.json`);

  if (!response.ok) {
    throw new Error(`registry unavailable (${response.status})`);
  }

  return (await response.json()) as Registry;
}

export async function loadCityDataset(
  fetcher: Fetcher,
  base: string,
  cityId: string
): Promise<CityDataset | null> {
  const path = `${base}/data/cities/${cityId}.json`;
  const response = await fetcher(path);

  if (response.status === HTTP_NOT_FOUND) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`city dataset unavailable (${response.status}) for ${cityId}`);
  }

  return (await response.json()) as CityDataset;
}

// Straight from the network, past whatever the browser is holding. A notification is
// sent the moment the data is collected, while the page carrying it is published a
// minute later and then cached for ten, so a reader who taps at once can be looking at
// a page older than the outage they were told about.
export async function reloadCityDataset(
  base: string,
  cityId: string
): Promise<CityDataset | null> {
  try {
    const response = await fetch(`${base}/data/cities/${cityId}.json`, { cache: 'reload' });

    return response.ok ? ((await response.json()) as CityDataset) : null;
  } catch {
    return null;
  }
}
