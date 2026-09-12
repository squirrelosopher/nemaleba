import { isLocaleSegment } from '$lib/i18n/locale';
import type { ParamMatcher } from '@sveltejs/kit';

// Without this a city slug would be read as a locale and every city page would 404.
export const match: ParamMatcher = (param) => isLocaleSegment(param);
