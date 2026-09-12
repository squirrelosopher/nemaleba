import { MESSAGES, type MessageKey } from './messages';
import { PROVIDER_NAMES_ENGLISH } from './providerNames';
import {
  MONTHS_ENGLISH,
  MONTHS_SERBIAN,
  OUTAGES_ENGLISH,
  OUTAGES_SERBIAN,
  WEEKDAYS_ENGLISH,
  WEEKDAYS_SERBIAN,
  englishPlural,
  serbianPlural
} from './calendar';
import { toLatin } from '$lib/text/serbianScript';
import { formatTimeWindow } from '$lib/time/timeWindow';
import { DayRelation } from '$lib/time/outageSchedule';
import type { TimeWindow } from '$lib/domain/outage';
import type { Provider } from '$lib/domain/provider';
import { parseIsoDate } from '$lib/time/serbianCalendar';

import { page } from '$app/state';
import { HTML_LANG, Locale, localeOf } from './locale';

export { DEFAULT_LOCALE, LOCALE_SEGMENTS, LOCALES, Locale } from './locale';

const STORAGE_KEY = 'nemaleba:locale';

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

class Translator {
  // The URL is the only source of truth. Nothing has to be corrected after the page
  // paints, because the markup that arrives was rendered in this locale to begin with.
  current = $derived(localeOf(page.params.locale));

  // Kept only so a reader arriving on a bare URL can be sent to the prefix they chose
  // last time. It never decides what the current page renders.
  remember(locale: Locale): void {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      return;
    }
  }

  get isEnglish(): boolean {
    return this.current === Locale.English;
  }

  get htmlLang(): string {
    return HTML_LANG[this.current];
  }

  t(key: MessageKey, values?: Record<string, string | number>): string {
    const message = MESSAGES[key];
    const template = this.isEnglish ? message.en : message.sr;

    return interpolate(this.serbianScript(template), values);
  }

  place(cyrillicText: string): string {
    return this.current === Locale.Cyrillic ? cyrillicText : toLatin(cyrillicText);
  }

  providerName(provider: Provider): string {
    const english = this.isEnglish ? PROVIDER_NAMES_ENGLISH[provider.id] : undefined;

    return english ?? this.place(provider.nameCyrillic);
  }

  outageCount(count: number): string {
    return `${count} ${this.outageNoun(count)}`;
  }

  outageNoun(count: number): string {
    const noun = this.isEnglish
      ? englishPlural(count, OUTAGES_ENGLISH)
      : serbianPlural(count, OUTAGES_SERBIAN);

    return this.serbianScript(noun);
  }

  timeWindow(time: TimeWindow): string {
    return formatTimeWindow(time, (key, values) => this.t(key, values));
  }

  weekday(isoDate: string): string {
    const index = parseIsoDate(isoDate).getDay();

    return this.isEnglish
      ? WEEKDAYS_ENGLISH[index]
      : this.serbianScript(WEEKDAYS_SERBIAN[index]);
  }

  longDate(isoDate: string): string {
    const date = parseIsoDate(isoDate);

    return this.isEnglish
      ? `${date.getDate()} ${MONTHS_ENGLISH[date.getMonth()]}`
      : `${date.getDate()}. ${this.serbianScript(MONTHS_SERBIAN[date.getMonth()])}`;
  }

  dayHeading(relation: DayRelation, isoDate: string): string {
    if (relation === DayRelation.Today) {
      return this.t('today');
    }

    return relation === DayRelation.Tomorrow ? this.t('tomorrow') : this.weekday(isoDate);
  }

  private serbianScript(text: string): string {
    return this.current === Locale.Latin ? toLatin(text) : text;
  }
}

export const translator = new Translator();
