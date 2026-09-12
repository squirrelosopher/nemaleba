import { HTML_LANG, localeOf } from '$lib/i18n/locale';
import type { Handle } from '@sveltejs/kit';

// The lang attribute lives on <html>, above anything Svelte renders, so it can only be
// set while the page is being generated. Leaving it at the default told screen readers
// and search engines that every translated page was Serbian Latin.
export const handle: Handle = async ({ event, resolve }) => {
  const locale = localeOf(event.params.locale);

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', HTML_LANG[locale])
  });
};
