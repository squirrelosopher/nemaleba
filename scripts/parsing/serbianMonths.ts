const GENITIVE_MONTHS = [
  'јануара', 'фебруара', 'марта', 'априла', 'маја', 'јуна',
  'јула', 'августа', 'септембра', 'октобра', 'новембра', 'децембра'
];

export const DAY_AND_MONTH = new RegExp(`(\\d{1,2})\\.?\\s*(${GENITIVE_MONTHS.join('|')})`, 'i');

export function monthFromGenitive(name: string): number | null {
  const index = GENITIVE_MONTHS.indexOf(name.toLowerCase());
  return index === -1 ? null : index + 1;
}

/** "29. августа" plus the year the post was published. */
export function dateFromPhrase(phrase: string, publishedIso: string): string | null {
  const match = phrase.match(DAY_AND_MONTH);

  if (!match) {
    return null;
  }

  const month = monthFromGenitive(match[2]);

  if (month === null) {
    return null;
  }

  const year = publishedIso.slice(0, 4);
  return `${year}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}
