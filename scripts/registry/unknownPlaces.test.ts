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

  // What is left is the case the ledger was built for: a name no register knows and
  // nothing written down resembles, whose outages are sitting on a page of their own.
  it('reports a name no register knows', () => {
    const found = findUnknownPlaces([outage('Ниш', 'Небиштан')], {});

    expect(Object.keys(found)).toEqual(['Ниш|Небиштан']);
    expect(identify(found['Ниш|Небиштан'])).toContain('not in the register');
  });

  // A mistyped character never reaches the ledger, because the rollup has already
  // answered it: BVK's "Чикарица" is Чукарица, not a seventeenth Belgrade municipality
  // with a page of its own.
  it('says nothing about a name one character off a written one', () => {
    const found = findUnknownPlaces(
      [outage('Београд', 'Чикарица'), outage('Ниш', 'Алексинацц')],
      {}
    );

    expect(found).toEqual({});
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
