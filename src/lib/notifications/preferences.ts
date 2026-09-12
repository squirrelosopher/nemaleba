export interface NotificationPreferences {
  locale: string;
  electricity: boolean;
  water: boolean;
  /**
   * Collapse a run's outages into one notification. Off, each city gets its own, which
   * is what lets a notification open the place it is about — one card cannot open two.
   * On, everything arrives as a single card, which can only open the notifications page
   * unless it happens to cover one city.
   */
  grouped: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  locale: 'sr-latn',
  electricity: true,
  water: true,
  grouped: false
};

export function normalisePreferences(value: unknown): NotificationPreferences {
  const raw = (value ?? {}) as Partial<Record<keyof NotificationPreferences, unknown>>;

  return {
    locale: typeof raw.locale === 'string' && raw.locale.length > 0
      ? raw.locale
      : DEFAULT_PREFERENCES.locale,
    electricity: raw.electricity !== false,
    water: raw.water !== false,
    // The two above default on, so anything but an explicit false is on. This one
    // defaults off, so only an explicit true is on.
    grouped: raw.grouped === true
  };
}
