import { describe, expect, it } from 'vitest';
import { canonicalMunicipality } from './cityRollup';
import { PlaceKind, everyRegisteredName, placeNamed } from './rgzPlaces';
import { SEED_BRANCHES } from './seedCities';

// Београд and Ниш are cities made of municipalities, and the register holds the parts
// rather than the whole. They are the only two names on this site that are not a place
// the register knows, and both are deliberate.
const CITIES_OF_MUNICIPALITIES = new Set(['Београд', 'Ниш']);

// The name with any qualifier and every capital taken off it.
function letters(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase();
}

function seeded(): string[] {
  return SEED_BRANCHES.flatMap((seed) => [
    seed.branch,
    ...seed.municipalities.map((municipality) => canonicalMunicipality(seed.branch, municipality))
  ]);
}

describe('the seed lists against the Address Register', () => {
  // What this buys: a name written by hand and spelled the way no register does is caught
  // here, rather than quietly becoming a page of its own that no source ever fills.
  it('names a real place every time', () => {
    const unknown = [...new Set(seeded())]
      .filter((name) => !CITIES_OF_MUNICIPALITIES.has(name))
      .filter((name) => placeNamed(name) === undefined);

    expect(unknown).toEqual([]);
  });

  it('does not know the two cities of municipalities', () => {
    for (const city of CITIES_OF_MUNICIPALITIES) {
      expect(placeNamed(city)).toBeUndefined();
    }
  });

  // The rollup forgives a mistyped character, which means it rewrites names -- so the one
  // thing it must never do is rewrite a real one. Fifty-odd places in the register sit a
  // single edit from a municipality written down here, Ковиљ beside Ковин among them, and
  // the whole register is run past every branch to check that none of them moves.
  //
  // Only the letters are compared, because the two older rewrites are deliberate and both
  // leave them alone: the qualifier that tells the two Палилулаs apart goes on or comes
  // off, and the register prints Савски Венац where this site writes Савски венац.
  it('never rewrites a name the register knows', () => {
    const moved = everyRegisteredName().flatMap((name) =>
      SEED_BRANCHES.map((seed) => canonicalMunicipality(seed.branch, name))
        .filter((rolled) => letters(rolled) !== letters(name))
        .map((rolled) => `${name} → ${rolled}`)
    );

    expect(moved).toEqual([]);
  });
});

describe('looking a place up', () => {
  it('ignores how the second word is cased', () => {
    expect(placeNamed('Савски венац')?.id).toBe(placeNamed('Савски Венац')?.id);
    expect(placeNamed('Стари град')?.nameCyrillic).toBe('Стари Град');
  });

  it('reads a qualifier the register shares', () => {
    expect(placeNamed('Палилула (Ниш)')?.id).toBe('71323');
    expect(placeNamed('Палилула (Београд)')?.id).toBe('70203');
  });

  it('falls back to the bare name when the qualifier is ours alone', () => {
    expect(placeNamed('Кладово (Зајечар)')?.nameCyrillic).toBe('Кладово');
  });

  // Villages matter because the water sources name them rather than the municipality:
  // Ruma covers its own, and Novi Sad's announcements are written about Kać and Futog.
  it('answers for a village as well as a municipality', () => {
    expect(placeNamed('Лаћарак')?.kind).toBe(PlaceKind.Settlement);
    expect(placeNamed('Каћ')?.kind).toBe(PlaceKind.Settlement);
    expect(placeNamed('Костолац')?.kind).toBe(PlaceKind.Municipality);
  });

  it('has nothing for a name nobody uses', () => {
    expect(placeNamed('Небиштан')).toBeUndefined();
  });
});
