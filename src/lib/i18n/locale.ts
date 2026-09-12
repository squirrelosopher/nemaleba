export const Locale = {
  Cyrillic: 'sr-cyrl',
  Latin: 'sr-latn',
  English: 'en'
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];

export const LOCALES: Locale[] = [Locale.Cyrillic, Locale.Latin, Locale.English];

// Latin is what most Serbs type into a search box, so it is served unprefixed and is the
// version crawlers index. The other two live under a prefix, and Latin's own prefix is an
// alias that points back at the bare URL.
export const DEFAULT_LOCALE: Locale = Locale.Latin;

// What appears in the URL. Deliberately distinct from the BCP 47 tags below, which are
// what hreflang and the html lang attribute need.
export const LOCALE_SEGMENTS: Record<Locale, string> = {
  [Locale.Cyrillic]: 'sr-cyr',
  [Locale.Latin]: 'sr-lat',
  [Locale.English]: 'en'
};

export const HTML_LANG: Record<Locale, string> = {
  [Locale.Cyrillic]: 'sr-Cyrl',
  [Locale.Latin]: 'sr-Latn',
  [Locale.English]: 'en'
};

const BY_SEGMENT = new Map<string, Locale>(
  LOCALES.map((locale) => [LOCALE_SEGMENTS[locale], locale])
);

export function isLocaleSegment(segment: string): boolean {
  return BY_SEGMENT.has(segment);
}

export function localeOf(segment: string | undefined): Locale {
  return (segment && BY_SEGMENT.get(segment)) || DEFAULT_LOCALE;
}
