import type { City } from '$lib/domain/city';
import { translator } from '$lib/i18n/translator.svelte';
import { trail } from './trail.svelte';

const HOME = '/';
const NOTIFICATIONS = '/obavestenja';
const PREFERENCES = '/obavestenja/podesavanja';
const COMMENTS = 'komentari';

export interface BackLink {
  path: string;
  label: string;
}

function home(): BackLink {
  return { path: HOME, label: translator.t('allMunicipalities') };
}

// Routes are written with a trailing slash, comparisons here are not.
function route(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

// Names a route the way the reader would name it, so any page can say where back goes.
function describe(raw: string, cities: City[]): BackLink | null {
  const path = route(raw);

  if (path === HOME) {
    return home();
  }

  if (path === PREFERENCES) {
    return { path, label: translator.t('notificationPreferences') };
  }

  if (path.startsWith(NOTIFICATIONS)) {
    return { path: NOTIFICATIONS, label: translator.t('notificationsTitle') };
  }

  const [, cityId, section] = path.split('/');
  const city = cities.find((candidate) => candidate.id === cityId);

  if (!city) {
    return null;
  }

  return section === COMMENTS
    ? { path, label: translator.t('comments') }
    : { path, label: translator.place(city.nameCyrillic) };
}

// The page behind this one, or the list of municipalities for a reader who arrived cold.
export function backLink(cities: City[], skip?: string): BackLink {
  const previous = trail.previous;

  if (!previous || route(previous) === route(skip ?? '')) {
    return home();
  }

  return describe(previous, cities) ?? home();
}
