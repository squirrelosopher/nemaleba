import { base } from '$app/paths';
import { page } from '$app/state';
import { PUBLIC_BASE_PATH } from '$env/static/public';
import { DEFAULT_LOCALE, LOCALE_SEGMENTS, isLocaleSegment, type Locale } from './locale';

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

// Site-absolute and base-free, which is what absolute URLs need.
//
// The prefix is read from the configured value rather than from `base`, which is a
// relative string like ".." while prerendering and so never matched the pathname it was
// meant to strip. Under a project site served from a subdirectory that left the prefix in
// place and every canonical, hreflang and og:url carried it twice.
export function withoutLocale(path: string): string {
  const prefix = PUBLIC_BASE_PATH || (base.startsWith('/') ? base : '');

  let pathname = path;

  if (prefix && pathname.startsWith(prefix)) {
    pathname = pathname.slice(prefix.length);
  }

  const [, first] = pathname.split('/');

  if (first && isLocaleSegment(first)) {
    pathname = pathname.slice(first.length + 1);
  }

  return pathname || '/';
}

export function pathWithoutLocale(): string {
  return withoutLocale(page.url.pathname);
}

// Latin is served bare, so it never takes a segment. Its /sr-lat alias is reachable by
// typing it and canonical-links back here.
export function localePath(path: string, locale: Locale): string {
  const canonical = withTrailingSlash(path);

  if (locale === DEFAULT_LOCALE) {
    return canonical;
  }

  return `/${LOCALE_SEGMENTS[locale]}${canonical}`;
}

// Links keep whichever form the reader arrived on, so someone on /sr-lat stays there and
// someone on the bare canonical stays there too.
export function href(path: string): string {
  const canonical = withTrailingSlash(path);
  const segment = page.params.locale;

  if (!segment) {
    return `${base}${canonical}`;
  }

  return `${base}/${segment}${canonical}`;
}

export function localeHref(path: string, locale: Locale): string {
  return `${base}${localePath(path, locale)}`;
}
