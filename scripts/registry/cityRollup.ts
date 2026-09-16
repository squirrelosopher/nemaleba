import { placeNamed } from './rgzPlaces';
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

// The same names again, kept per branch, because that is the only scope in which a
// misspelling can be judged: "Чикарица" is Belgrade's Чукарица and is nothing at all
// anywhere else.
const WRITTEN_BY_BRANCH = new Map<string, string[]>();

for (const group of CITY_GROUPS) {
  WRITTEN_BY_BRANCH.set(group.branch, [group.city, ...group.municipalities]);
}

for (const seed of SEED_BRANCHES) {
  const written = WRITTEN_BY_BRANCH.get(seed.branch) ?? [];

  WRITTEN_BY_BRANCH.set(seed.branch, [
    ...new Set([...written, seed.branch, ...seed.municipalities])
  ]);
}

// One substitution, insertion or deletion. Two is no longer a misspelling but a different
// name, and the shortest place names here are five letters -- at two edits Ковин reaches
// Ковач, and guessing between them is worse than not guessing.
const EDIT_BUDGET = 1;

// Whether two names are within the budget of each other. The distance itself is never
// wanted, so the walk stops caring once the cheapest row exceeds the budget.
function withinEditBudget(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > EDIT_BUDGET) {
    return false;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row++) {
    const current = [row];

    for (let column = 1; column <= right.length; column++) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);

      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, substitution);
    }

    if (Math.min(...current) > EDIT_BUDGET) {
      return false;
    }

    previous = current;
  }

  return previous[right.length] <= EDIT_BUDGET;
}

// A name no register has heard of, one character away from a municipality this branch has
// already written down, is that municipality misspelled. BVK published Чукарица as
// "Чикарица" for a single day; the site gave the typo a city page of its own, and the
// outage sat there where nobody looking at Чукарица would ever see it.
//
// Narrow on purpose, and the register being asked first is what does the work: fifty-odd
// real Serbian places sit one edit from a municipality this site has written down --
// Ковиљ beside Ковин, Раковац beside Рековац -- and every one of them has to stay
// itself. A name within reach of two of the branch's own municipalities is left alone
// rather than guessed at, so growing the lists costs at worst a correction not made.
function corrected(branch: string, name: string): string {
  if (placeNamed(name, branch) !== undefined) {
    return name;
  }

  const candidates = (WRITTEN_BY_BRANCH.get(branch) ?? []).filter((written) =>
    withinEditBudget(name.toLowerCase(), written.toLowerCase())
  );

  return candidates.length === 1 ? candidates[0] : name;
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

// How a source's spelling of a place becomes this project's: the branch it may have
// appended taken off, the capitals it disagrees about folded in, and a single mistyped
// character forgiven.
function bareName(branch: string, municipality: string): string {
  return corrected(branch, asWritten(withoutBranch(branch, municipality)));
}

export function canonicalMunicipality(branch: string, municipality: string): string {
  const bare = bareName(branch, municipality);
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
  const bare = bareName(branch, municipality);

  return PARENT_CITY.get(keyOf(branch, bare)) ?? municipality;
}
