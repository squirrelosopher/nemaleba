import { readFileSync } from 'node:fs';

// The Address Register's own list of what places exist, which is the thing the seed lists
// have been standing in for. It answers one question and not the other: whether a name is
// a real Serbian municipality or settlement, never how a utility chose to spell it. The
// spelling stays a parsing problem, and the alias below is where the two meet.
//
// Regenerate with `npm run rgz -- ulica.csv`; see scripts/dev/importRgz.ts.
const DIRECTORY = 'data/rgz';

export const PlaceKind = {
  Municipality: 'municipality',
  Settlement: 'settlement'
} as const;

export type PlaceKind = (typeof PlaceKind)[keyof typeof PlaceKind];

export interface RgzPlace {
  id: string;
  kind: PlaceKind;
  nameCyrillic: string;
  nameLatin: string;
  municipalityId?: string;
}

interface RawPlace {
  id: string;
  nameCyrillic: string;
  nameLatin: string;
  municipalityId?: string;
}

function load(file: string, kind: PlaceKind): RgzPlace[] {
  const raw = JSON.parse(readFileSync(`${DIRECTORY}/${file}`, 'utf-8')) as RawPlace[];

  return raw.map((place) => ({ ...place, kind }));
}

// Every name the register prints is upper case, and the import title-cases it, so the two
// disagree with this project wherever it writes a second word in lower case: the register
// has "Савски Венац" where the site has "Савски венац". They are the same place, and a
// lookup that cared would report three of Belgrade's municipalities as unheard of.
function key(name: string): string {
  return name.toLocaleLowerCase('sr').replace(/\s+/g, ' ').trim();
}

// A municipality wins a name a settlement also carries: the site's pages are
// municipalities, and every settlement sharing a name with one is inside it.
function index(): Map<string, RgzPlace> {
  const byName = new Map<string, RgzPlace>();

  for (const place of load('settlements.json', PlaceKind.Settlement)) {
    byName.set(key(place.nameCyrillic), place);
  }

  for (const place of load('municipalities.json', PlaceKind.Municipality)) {
    byName.set(key(place.nameCyrillic), place);
  }

  return byName;
}

let cache: Map<string, RgzPlace> | null = null;

function places(): Map<string, RgzPlace> {
  cache ??= index();

  return cache;
}

// A qualifier the site added to tell two same-named places apart -- "Палилула (Ниш)" --
// is its own invention, and the register spells it the same way for the same reason.
// Trying the bare name second is what covers the ones where it does not.
const QUALIFIED = /^(.+?)\s*\(([^)]+)\)\s*$/;

// `within` is the city a name was read under, and it is tried as a qualifier because the
// register qualifies from the other direction: this project writes Belgrade's Палилула
// bare and only marks Niš's, while the register marks both.
export function placeNamed(name: string, within?: string): RgzPlace | undefined {
  // The qualified reading comes first, because the bare one can be a different place
  // entirely: "Палилула" alone is a village in Merošina, and answering with it handed
  // Niš the streets of a municipality nowhere near it while losing its own.
  const qualified = within ? places().get(key(`${name} (${within})`)) : undefined;

  if (qualified) {
    return qualified;
  }

  const direct = places().get(key(name));

  if (direct) {
    return direct;
  }

  const bare = name.match(QUALIFIED)?.[1];

  return bare ? places().get(key(bare)) : undefined;
}

export function describePlace(place: RgzPlace): string {
  return `${place.kind} ${place.nameCyrillic} (${place.id})`;
}
