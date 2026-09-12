import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import {
  DEFAULT_PREFERENCES,
  normalisePreferences,
  type NotificationPreferences
} from './preferences';

export const PushState = {
  Unsupported: 'unsupported',
  NeedsHomeScreen: 'needs-home-screen',
  NotConfigured: 'not-configured',
  Idle: 'idle',
  Working: 'working',
  Subscribed: 'subscribed',
  Blocked: 'blocked',
  Failed: 'failed'
} as const;

export type PushState = (typeof PushState)[keyof typeof PushState];

const SUBSCRIBED_CITIES_KEY = 'nemaleba:cities';


function endpoint(): string {
  return env.PUBLIC_API_ENDPOINT ?? '';
}

function applicationServerKey(): string {
  return env.PUBLIC_VAPID_KEY ?? '';
}

export function isConfigured(): boolean {
  return endpoint().length > 0 && applicationServerKey().length > 0;
}

export function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function decodeKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function readSubscribedCities(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SUBSCRIBED_CITIES_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function writeSubscribedCities(cities: string[]): void {
  try {
    localStorage.setItem(SUBSCRIBED_CITIES_KEY, JSON.stringify(cities));
  } catch {
    return;
  }
}

export function isCachedSubscription(cityId: string): boolean {
  return readSubscribedCities().includes(cityId);
}

async function existingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribedCities(): Promise<string[]> {
  if (!isSupported() || !isConfigured()) {
    return [];
  }

  const subscription = await existingSubscription();

  if (!subscription) {
    writeSubscribedCities([]);
    return [];
  }

  const query = encodeURIComponent(subscription.endpoint);
  const response = await fetch(`${endpoint()}/push/cities?endpoint=${query}`);

  if (!response.ok) {
    return readSubscribedCities();
  }

  const cities = (await response.json()) as string[];
  writeSubscribedCities(cities);

  return cities;
}

export async function registerServiceWorker(): Promise<void> {
  if (!isSupported()) {
    return;
  }

  try {
    await navigator.serviceWorker.register(`${base}/sw.js`);
  } catch {
    return;
  }
}

async function pushSubscription(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await existingSubscription();

  return (
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(applicationServerKey())
    }))
  );
}

async function send(path: string, body: unknown): Promise<boolean> {
  const response = await fetch(`${endpoint()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return response.ok;
}

export async function loadPreferences(): Promise<NotificationPreferences> {
  if (!isSupported() || !isConfigured()) {
    return DEFAULT_PREFERENCES;
  }

  const subscription = await existingSubscription();

  if (!subscription) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const query = encodeURIComponent(subscription.endpoint);
    const response = await fetch(`${endpoint()}/push/preferences?endpoint=${query}`);

    return response.ok ? normalisePreferences(await response.json()) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(preferences: NotificationPreferences): Promise<boolean> {
  if (!isSupported() || !isConfigured()) {
    return false;
  }

  try {
    const subscription = await existingSubscription();

    if (!subscription) {
      return false;
    }

    return await send('/push/preferences', { endpoint: subscription.endpoint, ...preferences });
  } catch {
    return false;
  }
}

export async function updateLocale(locale: string): Promise<void> {
  const current = await loadPreferences();

  if (current.locale === locale) {
    return;
  }

  await savePreferences({ ...current, locale });
}

export async function subscribeToCity(cityId: string): Promise<PushState> {
  if (!isSupported()) {
    return PushState.Unsupported;
  }

  if (!isConfigured()) {
    return PushState.NotConfigured;
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return PushState.Blocked;
  }

  try {
    const known = await subscribedCities();
    const subscription = await pushSubscription();
    const cities = [...new Set([...known, cityId])];
    const accepted = await send('/push/subscribe', { subscription, cities });

    if (!accepted) {
      return PushState.Failed;
    }

    writeSubscribedCities(cities);
    return PushState.Subscribed;
  } catch {
    return PushState.Failed;
  }
}

export async function unsubscribeFromCity(cityId: string): Promise<PushState> {
  try {
    const cities = (await subscribedCities()).filter((entry) => entry !== cityId);
    const subscription = await pushSubscription();
    await send('/push/subscribe', { subscription, cities });
    writeSubscribedCities(cities);
  } catch {
    return PushState.Failed;
  }

  return PushState.Idle;
}
