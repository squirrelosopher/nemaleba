import { SEED_BRANCHES } from './seedCities';

interface CityGroup {
  city: string;
  branch: string;
  municipalities: string[];
}

// Serbian cities that are subdivided into gradske opštine. Everything else is a single
// unit, so a municipality is already its own city.
const CITY_GROUPS: CityGroup[] = [
  {
    city: 'Београд',
    branch: 'Београд',
    municipalities: [
      'Вождовац', 'Врачар', 'Гроцка', 'Звездара', 'Земун', 'Лазаревац', 'Младеновац',
      'Нови Београд', 'Обреновац', 'Палилула', 'Раковица', 'Савски венац', 'Сопот',
      'Стари град', 'Сурчин', 'Чукарица', 'Барајево'
    ]
  },
  {
    city: 'Ниш',
    branch: 'Ниш',
    municipalities: ['Медијана', 'Палилула', 'Пантелеј', 'Црвени крст', 'Нишка Бања']
  },
  { city: 'Нови Сад', branch: 'Нови Сад', municipalities: ['Петроварадин'] },
  { city: 'Пожаревац', branch: 'Пожаревац', municipalities: ['Костолац'] },
  { city: 'Ужице', branch: 'Ужице', municipalities: ['Севојно'] },
  { city: 'Врање', branch: 'Врање', municipalities: ['Врањска Бања'] }
];

// "Палилула" names a city municipality of both Belgrade and Niš. Without qualifying it
// the two would slug to the same id and merge into one page.
const AMBIGUOUS_NAMES = new Set(
  CITY_GROUPS.flatMap((group) => group.municipalities).filter(
    (name, index, all) => all.indexOf(name) !== index
  )
);

function keyOf(branch: string, municipality: string): string {
  return `${branch}|${municipality}`;
}

// Every place name written by hand, indexed by its own lowercase form. Sources disagree
// with us about capitals -- EPS publishes Ниш's Нишка Бања as "Нишка бања" -- and a name
// that differs only there is the same place, so it is answered with our spelling rather
// than carried through as one we have never heard of.
const WRITTEN = new Map(
  [
    ...CITY_GROUPS.flatMap((group) => [group.city, ...group.municipalities]),
    ...SEED_BRANCHES.flatMap((seed) => [seed.branch, ...seed.municipalities])
  ].map((name) => [name.toLowerCase(), name])
);

function asWritten(name: string): string {
  return WRITTEN.get(name.toLowerCase()) ?? name;
}

const PARENT_CITY = new Map(
  CITY_GROUPS.flatMap((group) =>
    group.municipalities.map((municipality) => [keyOf(group.branch, municipality), group.city])
  )
);

const QUALIFIER_MARKS = ['-', '–', '—', '('];

// A source may disambiguate a repeated name on its own: EPS publishes Niš's Палилула as
// "Палилула - Ниш". Taking the branch back off leaves one spelling for the qualifier
// below to put on, so the two sources name the same municipality the same way.
function withoutBranch(branch: string, municipality: string): string {
  const trimmed = municipality.replace(/\)$/, '').trimEnd();

  if (!trimmed.endsWith(branch)) {
    return municipality;
  }

  const head = trimmed.slice(0, -branch.length).trimEnd();

  return QUALIFIER_MARKS.includes(head.at(-1) ?? '') ? head.slice(0, -1).trimEnd() : municipality;
}

export function canonicalMunicipality(branch: string, municipality: string): string {
  const bare = asWritten(withoutBranch(branch, municipality));
  const needsQualifier = AMBIGUOUS_NAMES.has(bare) && branch !== 'Београд';

  return needsQualifier ? `${bare} (${branch})` : bare;
}

const MUNICIPALITIES_BY_CITY = new Map(
  CITY_GROUPS.map((group) => [group.city, group.municipalities])
);

export function municipalitiesOf(city: string): readonly string[] {
  return MUNICIPALITIES_BY_CITY.get(city) ?? [];
}

// The lookup is keyed on the plain municipality name, while what arrives here has often
// been qualified already -- by us for an ambiguous name, or by the source itself. Taking
// the qualifier off first is what lets Niš's Палилула roll up to Ниш the way Belgrade's
// rolls up to Београд.
export function parentCity(branch: string, municipality: string): string {
  const bare = asWritten(withoutBranch(branch, municipality));

  return PARENT_CITY.get(keyOf(branch, bare)) ?? municipality;
}
