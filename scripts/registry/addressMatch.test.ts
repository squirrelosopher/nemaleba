import { describe, expect, it } from 'vitest';
import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { addressCandidates } from '../../src/lib/address/addressText';
import { matchAddresses, Precision } from './addressMatch';
import { precisionOf, tally, type Coverage } from './addressCoverage';
import { placeNamed } from './rgzPlaces';

function outage(areaLabel: string, streets: string[], city: string): RawOutage {
  return {
    utility: Utility.Water,
    kind: OutageKind.Emergency,
    date: '2026-09-08',
    areaLabel,
    time: null,
    streets,
    reason: null,
    note: null,
    sourceUrl: 'https://example.invalid/x',
    cityNameCyrillic: city,
    branchCyrillic: city
  };
}

describe('reading addresses out of an announcement', () => {
  it('drops the words wrapped around a street name', () => {
    expect(addressCandidates('Ниш • Ораовачка бб • Светог Илије код броја 48')).toEqual([
      'ораовачка',
      'светог илије'
    ]);

    expect(addressCandidates('Ниш • улици Бранко Бјеговић 38')).toEqual(['бранко бјеговић']);
    expect(addressCandidates('део села Остатовица.')).toEqual(['остатовица']);
  });

  it('treats a stretch between two landmarks as the street it names', () => {
    expect(addressCandidates('Светосавска од Косовске до Партизанске')).toEqual([
      'светосавска',
      'косовске',
      'партизанске'
    ]);
  });
});

describe('which municipality a name belongs to', () => {
  // The register qualifies both Palilulas; this project qualifies only Niš's. Read bare
  // and without its city, "Палилула" is a village in Merošina, and answering with that
  // gave Niš the streets of a municipality nowhere near it while losing its own 753.
  it('reads Палилула as the one inside the city asking', () => {
    expect(placeNamed('Палилула', 'Ниш')?.id).toBe('71323');
    expect(placeNamed('Палилула', 'Београд')?.id).toBe('70203');
  });

  it('still answers bare, for whoever has no city to offer', () => {
    expect(placeNamed('Палилула')).toBeDefined();
  });
});

describe('matching against the register', () => {
  it('finds a street of a city made of municipalities', () => {
    const match = matchAddresses('Ниш', outage('Ниш', ['Косте Абрашевића'], 'Ниш'));

    expect(match.streets).toEqual(['косте абрашевића']);
  });

  it('finds a settlement named in the label', () => {
    const match = matchAddresses('Ниш', outage('Габровац', [], 'Ниш'));

    expect(match.settlements).toEqual(['габровац']);
  });

  it('finds nothing in an announcement that names no address', () => {
    const match = matchAddresses(
      'Аранђеловац',
      outage('Аранђеловац', ['од стадиона до пумпе Мол'], 'Аранђеловац')
    );

    expect(match).toEqual({ streets: [], settlements: [] });
  });

  // Naming the town an announcement is about is not precision, and the register has a
  // settlement of that name in every municipality, so it has to be refused explicitly.
  it('refuses the page own name as a settlement', () => {
    expect(matchAddresses('Ваљево', outage('Ваљево', [], 'Ваљево')).settlements).toEqual([]);
    expect(matchAddresses('Ниш', outage('Габровац', [], 'Ниш')).settlements).toEqual([
      'габровац'
    ]);
  });
});

describe('the precision a city earns', () => {
  const city = { id: 'x', nameCyrillic: 'Ниш', nameLatin: 'Niš', branchCyrillic: 'Ниш' };

  it('offers nothing finer until the sample is big enough', () => {
    expect(precisionOf({ outages: 20, streetNamed: 20, settlementNamed: 20 })).toBe(
      Precision.Municipality
    );
  });

  it('prefers the street, which carries the settlement with it', () => {
    expect(precisionOf({ outages: 100, streetNamed: 80, settlementNamed: 95 })).toBe(
      Precision.Street
    );
  });

  it('falls to the settlement where streets go unnamed', () => {
    expect(precisionOf({ outages: 100, streetNamed: 10, settlementNamed: 90 })).toBe(
      Precision.Settlement
    );
  });

  it('offers nothing finer where neither is named often enough', () => {
    expect(precisionOf({ outages: 100, streetNamed: 60, settlementNamed: 60 })).toBe(
      Precision.Municipality
    );
  });

  // A quiet day must not cost a city the precision it earned over weeks, which is why the
  // tally is carried rather than recomputed.
  it('adds to what earlier runs counted', () => {
    const previous: Coverage = {
      x: { outages: 39, streetNamed: 39, settlementNamed: 0, precision: Precision.Municipality }
    };

    const counted = tally(previous, city, [outage('Ниш', ['Косте Абрашевића'], 'Ниш')]);

    expect(counted.outages).toBe(40);
    expect(counted.streetNamed).toBe(40);
    expect(counted.precision).toBe(Precision.Street);
  });
});
