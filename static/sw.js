const DEFAULT_TITLE = 'nemaleba.rs';
// Resolved against this file rather than the domain root: project Pages serve the whole
// site from a subdirectory, where a leading slash points outside the app.
const ICON = new URL('icon-192.png', self.location).href;
const BADGE = new URL('badge-96.png', self.location).href;
const HOME = new URL('./', self.location).href;
const DB_NAME = 'nemaleba';
const DB_VERSION = 1;
const STORE = 'notifications';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = readPayload(event);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: ICON,
        badge: BADGE,
        data: { url: payload.url, id: entryId(payload) }
      }),
      rememberAll(payload).then(announce)
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(focusTarget(onThisOrigin(event.notification.data?.url)));
});

// A notification carries whatever origin the sender was configured with, and the reader
// is on the one they subscribed from — which is not always the same site. Only the path
// travels; where it opens is decided here.
function onThisOrigin(url) {
  try {
    const asked = new URL(url ?? './', self.location);

    return new URL(asked.pathname + asked.search, self.location).href;
  } catch {
    return HOME;
  }
}

async function focusTarget(target) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = clients.find((client) => samePage(client.url, target));

  if (!existing) {
    return self.clients.openWindow(target);
  }

  try {
    const navigated = await existing.navigate(target);
    return (navigated ?? existing).focus();
  } catch {
    return existing.focus();
  }
}

function samePage(clientUrl, target) {
  try {
    const left = new URL(clientUrl);
    const right = new URL(target, left.origin);

    return left.origin === right.origin && left.pathname === right.pathname;
  } catch {
    return false;
  }
}

function entryId(payload) {
  return payload.cityId && payload.outageId
    ? `${payload.cityId}:${payload.outageId}`
    : `${payload.tag}:${Date.now()}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function rememberAll(payload) {
  const entries = Array.isArray(payload.entries) && payload.entries.length > 0
    ? payload.entries
    : [payload];

  for (const entry of entries) {
    await remember(entry);
  }
}

async function remember(payload) {
  try {
    const db = await openDatabase();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');

      transaction.objectStore(STORE).put({
        id: entryId(payload),
        cityId: payload.cityId ?? null,
        outageId: payload.outageId ?? null,
        date: payload.date ?? null,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        receivedAt: Date.now(),
        read: false
      });

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch {
    return;
  }
}

async function announce() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of clients) {
    client.postMessage({ type: 'nemaleba:notification' });
  }
}

function readPayload(event) {
  if (!event.data) {
    return { title: DEFAULT_TITLE, body: '', tag: 'nemaleba', url: '/' };
  }

  try {
    const parsed = event.data.json();

    return {
      title: parsed.title ?? DEFAULT_TITLE,
      body: parsed.body ?? '',
      tag: parsed.tag ?? 'nemaleba',
      url: parsed.url ?? '/',
      cityId: parsed.cityId ?? null,
      outageId: parsed.outageId ?? null,
      date: parsed.date ?? null,
      entries: Array.isArray(parsed.entries) ? parsed.entries : null
    };
  } catch {
    return { title: DEFAULT_TITLE, body: event.data.text(), tag: 'nemaleba', url: '/' };
  }
}
