export const MONTHS_SERBIAN = [
  'јануар', 'фебруар', 'март', 'април', 'мај', 'јун',
  'јул', 'август', 'септембар', 'октобар', 'новембар', 'децембар'
];

export const MONTHS_ENGLISH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS_SERBIAN = [
  'недеља', 'понедељак', 'уторак', 'среда', 'четвртак', 'петак', 'субота'
];

export const WEEKDAYS_ENGLISH = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

export const OUTAGES_SERBIAN: PluralForms = {
  one: 'искључење',
  few: 'искључења',
  many: 'искључења'
};

export const OUTAGES_ENGLISH: PluralForms = {
  one: 'outage',
  few: 'outages',
  many: 'outages'
};

export function serbianPlural(count: number, forms: PluralForms): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return forms.one;
  }

  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return forms.few;
  }

  return forms.many;
}

export function englishPlural(count: number, forms: PluralForms): string {
  return count === 1 ? forms.one : forms.many;
}
