export interface NotificationEntry {
  id: string;
  cityId: string | null;
  outageId: string | null;
  date: string | null;
  title: string;
  body: string;
  url: string;
  receivedAt: number;
  read: boolean;
}

const DB_NAME = 'nemaleba';
const DB_VERSION = 1;
const STORE = 'notifications';
const UNREAD_KEY = 'nemaleba:unread';

function openDatabase(): Promise<IDBDatabase> {
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

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  if (typeof indexedDB === 'undefined') {
    return null;
  }

  try {
    const db = await openDatabase();

    const value = await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return value;
  } catch {
    return null;
  }
}

function rememberUnread(count: number): void {
  try {
    localStorage.setItem(UNREAD_KEY, String(count));
  } catch {
    return;
  }
}

// Read back before the log itself is, so a tab can carry its count from the first paint.
// The key held '1' or '0' before it held a number, and both still read as they should.
export function cachedUnreadCount(): number {
  try {
    return Number(localStorage.getItem(UNREAD_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function cachedUnread(): boolean {
  return cachedUnreadCount() > 0;
}

async function closeTrayCopies(ids: string[]): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const shown = await registration.getNotifications();

    for (const notification of shown) {
      if (ids.includes(notification.data?.id)) {
        notification.close();
      }
    }
  } catch {
    return;
  }
}

class NotificationLog {
  entries = $state<NotificationEntry[]>([]);
  unread = $state(0);
  hasUnread = $state(false);

  async load(): Promise<void> {
    const all = (await withStore<NotificationEntry[]>('readonly', (store) => store.getAll())) ?? [];

    this.entries = all.sort((left, right) => right.receivedAt - left.receivedAt);
    this.sync();
  }

  async markAllRead(): Promise<void> {
    const unread = this.entries.filter((entry) => !entry.read);

    if (unread.length === 0) {
      return;
    }

    for (const entry of unread) {
      await withStore('readwrite', (store) => store.put({ ...entry, read: true }));
    }

    this.entries = this.entries.map((entry) => ({ ...entry, read: true }));
    this.sync();
  }

  async remove(id: string): Promise<void> {
    await withStore('readwrite', (store) => store.delete(id));
    await closeTrayCopies([id]);

    this.entries = this.entries.filter((entry) => entry.id !== id);
    this.sync();
  }

  async clear(): Promise<void> {
    const ids = this.entries.map((entry) => entry.id);

    await withStore('readwrite', (store) => store.clear());
    await closeTrayCopies(ids);

    this.entries = [];
    this.sync();
  }

  private sync(): void {
    this.unread = this.entries.filter((entry) => !entry.read).length;
    this.hasUnread = this.unread > 0;
    rememberUnread(this.unread);
  }
}

export const notificationLog = new NotificationLog();
