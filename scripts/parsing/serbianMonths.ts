const GENITIVE_MONTHS = [
  'јануара', 'фебруара', 'марта', 'априла', 'маја', 'јуна',
  'јула', 'августа', 'септембра', 'октобра', 'новембра', 'децембра'
];

export const MONTH_NAME = GENITIVE_MONTHS.join('|');

export function monthFromGenitive(name: string): number | null {
  const index = GENITIVE_MONTHS.indexOf(name.toLowerCase());
  return index === -1 ? null : index + 1;
}
