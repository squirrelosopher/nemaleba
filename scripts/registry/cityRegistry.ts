import type { City, DailySummary, DailyTotals, Registry } from '../../src/lib/domain/city';
import type { Provider } from '../../src/lib/domain/provider';
import type { RawOutage } from '../../src/lib/domain/outage';
import { toLatin, toSlug } from '../../src/lib/text/serbianScript';
import { parentCity } from './cityRollup';
import { placeNamed } from './rgzPlaces';
import { SEED_BRANCHES } from './seedCities';

function createCity(nameCyrillic: string, branchCyrillic: string): City {
  return {
    id: toSlug(nameCyrillic),
    nameCyrillic,
    nameLatin: toLatin(nameCyrillic),
    branchCyrillic
  };
}

export class CityRegistry {
  private readonly cities = new Map<string, City>();

  constructor(previous?: Registry) {
    for (const seed of SEED_BRANCHES) {
      this.add(createCity(seed.branch, seed.branch));

      for (const municipality of seed.municipalities) {
        this.add(createCity(municipality, seed.branch));
      }
    }

    for (const city of previous?.cities ?? []) {
      this.add(city);
    }
  }

  // A place nobody wrote down is named the way the register names it, not the way the
  // feed that happened to arrive first did. The two differ in case often enough --
  // "Бачка топола" for Бачка Топола -- and whichever spelling landed first used to stick
  // for good. Seeded places are added before this runs and keep the spelling chosen for
  // them, since the slug is the same either way and the first writer wins.
  observe(outage: RawOutage): void {
    this.add(createCity(this.written(outage), outage.branchCyrillic));
  }

  isBranch(city: City): boolean {
    return city.branchCyrillic === city.nameCyrillic;
  }

  // A branch page is the city, not the whole distribution area. ED Niš also covers
  // Aleksinac, which is its own town with its own page, so rolling the municipality
  // up to its parent city keeps a city page to that city — and makes these counts
  // agree with the overview table, which rolls up the same way.
  matches(city: City, outage: RawOutage): boolean {
    return this.isBranch(city)
      ? parentCity(outage.branchCyrillic, outage.cityNameCyrillic) === city.nameCyrillic
      : outage.cityNameCyrillic === city.nameCyrillic;
  }

  all(): City[] {
    return [...this.cities.values()].sort((left, right) =>
      left.nameLatin.localeCompare(right.nameLatin, 'sr')
    );
  }

  toRegistry(summary: DailySummary, history: DailyTotals[], providers: Provider[]): Registry {
    return {
      generatedAt: new Date().toISOString(),
      summary,
      history,
      providers,
      cities: this.all()
    };
  }

  // The register's spelling, unless this place already has a page. Both name Belgrade's
  // Палилула, and the register qualifies it -- so preferring the register gave it a
  // second page at `palilula-beograd` beside the seeded `palilula`, since a renamed place
  // slugs differently and the check below no longer recognises it.
  private written(outage: RawOutage): string {
    const { cityNameCyrillic: name, branchCyrillic: branch } = outage;

    if (this.cities.has(toSlug(name))) {
      return name;
    }

    return placeNamed(name, branch)?.nameCyrillic ?? name;
  }

  // First writer wins, which is what keeps a seeded spelling from being replaced by a
  // source's own and a name from flickering between runs.
  private add(city: City): void {
    if (!this.cities.has(city.id)) {
      this.cities.set(city.id, city);
    }
  }
}
