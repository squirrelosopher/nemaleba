import { readSubscriptions } from '../devApiServer';
import {
  normalisePreferences,
  type NotificationPreferences
} from '../../src/lib/notifications/preferences';

export interface Subscriber {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  preferences: NotificationPreferences;
}

export interface SubscriberDirectory {
  subscribersOf(cityId: string): Promise<Subscriber[]>;
  subscribedCities(): Promise<string[]>;
  forget(endpoint: string): Promise<void>;
}

export class LocalSubscriberDirectory implements SubscriberDirectory {
  async subscribersOf(cityId: string): Promise<Subscriber[]> {
    const stored = await readSubscriptions();

    return stored
      .filter((entry) => entry.cities.includes(cityId))
      .map((entry) => ({
        ...(entry.subscription as Omit<Subscriber, 'preferences'>),
        preferences: normalisePreferences(entry.preferences)
      }));
  }

  async subscribedCities(): Promise<string[]> {
    const stored = await readSubscriptions();
    return [...new Set(stored.flatMap((entry) => entry.cities))];
  }

  async forget(): Promise<void> {
    return;
  }
}

export class RemoteSubscriberDirectory implements SubscriberDirectory {
  constructor(
    private readonly origin: string,
    private readonly token: string
  ) {}

  async subscribersOf(cityId: string): Promise<Subscriber[]> {
    const rows = await this.request<Subscriber[]>(
      `/subscribers?city=${encodeURIComponent(cityId)}`
    );

    return rows.map((row) => ({ ...row, preferences: normalisePreferences(row.preferences) }));
  }

  async subscribedCities(): Promise<string[]> {
    return this.request<string[]>('/subscribers/cities');
  }

  async forget(endpoint: string): Promise<void> {
    await fetch(`${this.origin}/subscribers?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.origin}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    if (!response.ok) {
      throw new Error(`subscriber directory ${response.status} for ${path}`);
    }

    return (await response.json()) as T;
  }
}

export function createDirectory(): SubscriberDirectory {
  const origin = process.env.PUSH_ADMIN_ORIGIN;
  const token = process.env.PUSH_ADMIN_TOKEN;

  return origin && token
    ? new RemoteSubscriberDirectory(origin, token)
    : new LocalSubscriberDirectory();
}
