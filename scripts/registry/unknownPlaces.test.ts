import { describe, expect, it } from 'vitest';
import type { RawOutage } from '../../src/lib/domain/outage';
import { OutageKind, Utility } from '../../src/lib/domain/utility';
import { findUnknownPlaces, identify } from './unknownPlaces';

function outage(branch: string, municipality: string): RawOutage {
  return {
    utility: Utility.Electricity,
    kind: OutageKind.Planned,
    date: '2026-09-08',
    areaLabel: municipality,
    time: null,
    streets: [],
    reason: null,
    note: null,
    sourceUrl: 'https://elektrodistribucija.rs/x',
    cityNameCyrillic: municipality,
    branchCyrillic: branch
  };
}

describe('what counts as a finding', () => {
  // Ražanj and Bačka Topola arrived on one afternoon, both real municipalities absent from
  // the seed lists, and both were reported as if somebody had to decide something. The
  // register decides it.
  it('says nothing about a place the register vouches for', () => {
    const found = findUnknownPlaces(
      [outage('Крушевац', 'Ражањ'), outage('Суботица', 'Бачка Топола')],
      {}
    );

    expect(found).toEqual({});
  });

  it('says nothing about a seeded place either', () => {
    expect(findUnknownPlaces([outage('Ниш', 'Алексинац')], {})).toEqual({});
  });

  // What is left is the case the ledger was built for: a name no register knows is a
  // spelling, and its outages are sitting on a page of their own.
  it('reports a name no register knows', () => {
    const found = findUnknownPlaces([outage('Ниш', 'Алексинацц')], {});

    expect(Object.keys(found)).toEqual(['Ниш|Алексинацц']);
    expect(identify(found['Ниш|Алексинацц'])).toContain('not in the register');
  });

  it('reports a branch this site does not read', () => {
    expect(Object.keys(findUnknownPlaces([outage('Приштина', 'Ражањ')], {}))).toEqual([
      'Приштина|Ражањ'
    ]);
  });

  it('drops a finding the register has since been asked about', () => {
    const previous = {
      'Крушевац|Ражањ': {
        branch: 'Крушевац',
        municipality: 'Ражањ',
        entries: 1,
        sourceUrl: 'https://elektrodistribucija.rs/x',
        firstSeen: '2026-09-08',
        lastSeen: '2026-09-08'
      }
    };

    expect(findUnknownPlaces([], previous)).toEqual({});
  });
});
