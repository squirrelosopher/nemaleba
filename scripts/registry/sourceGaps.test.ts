import { describe, expect, it } from 'vitest';
import type { City, DailyTotals } from '../../src/lib/domain/city';
import { NATIONAL_COVERAGE, type Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { mergeHistory } from './dailyHistory';
import { gapsFor, utilitiesMissingFor } from './sourceGaps';

function city(id: string, branchCyrillic: string): City {
  return { id, nameCyrillic: id, nameLatin: id, branchCyrillic };
}

const CITIES = [city('nis', 'Ниш'), city('leskovac', 'Лесковац'), city('beograd', 'Београд')];

const NAISSUS: Provider = {
  id: 'jkp-naissus-nis',
  utility: Utility.Water,
  nameCyrillic: 'Наиссус',
  phone: '',
  url: '',
  coverage: ['nis']
};

const EPS: Provider = { ...NAISSUS, id: 'eps', utility: Utility.Electricity, coverage: NATIONAL_COVERAGE };

describe('source gaps', () => {
  it('lists the cities a water source covers', () => {
    const gaps = gapsFor([{ provider: NAISSUS, branches: null, lastReadAt: '2026-11-27T09:12:00Z' }], CITIES);

    expect(gaps).toEqual([
      {
        providerId: 'jkp-naissus-nis',
        utility: Utility.Water,
        cityIds: ['nis'],
        lastReadAt: '2026-11-27T09:12:00Z'
      }
    ]);
    expect(utilitiesMissingFor('nis', gaps)).toEqual(new Set([Utility.Water]));
    expect(utilitiesMissingFor('beograd', gaps).size).toBe(0);
  });

  it('narrows a national source to the branches of its unreadable feeds', () => {
    const gaps = gapsFor([{ provider: EPS, branches: ['Ниш', 'Лесковац'], lastReadAt: null }], CITIES);

    expect(gaps[0].cityIds).toEqual(['nis', 'leskovac']);
  });
});

describe('daily history with missing data', () => {
  const morning: DailyTotals[] = [{ date: '2026-11-27', electricityOutages: 4, waterOutages: 12 }];

  // The day's last run writes the day. An unreadable 23:00 run recorded Niš's water as 0.
  it('keeps the last readable figure for a utility that could not be read', () => {
    const night = { date: '2026-11-27', electricityOutages: 5, waterOutages: 0 };

    expect(mergeHistory(morning, night, new Set([Utility.Water]))).toEqual([
      { date: '2026-11-27', electricityOutages: 5, waterOutages: 12 }
    ]);
  });

  it('takes the new figure when everything was read', () => {
    const night = { date: '2026-11-27', electricityOutages: 5, waterOutages: 0 };

    expect(mergeHistory(morning, night)).toEqual([night]);
  });
});
