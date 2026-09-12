import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { City, CityDataset, DailyTotals, Registry } from '../../src/lib/domain/city';
import type { Outage, RawOutage } from '../../src/lib/domain/outage';

const OUTPUT_ROOT = 'static/data';
const CITIES_DIRECTORY = join(OUTPUT_ROOT, 'cities');
const ID_LENGTH = 12;

function identify(outage: RawOutage): string {
  const fingerprint = [
    outage.utility,
    outage.date,
    outage.cityNameCyrillic,
    outage.areaLabel,
    `${outage.time?.start ?? ''}-${outage.time?.end ?? ''}`,
    outage.streets.join('|'),
    outage.reason ?? ''
  ].join('::');

  return createHash('sha1').update(fingerprint).digest('hex').slice(0, ID_LENGTH);
}

function toOutage(raw: RawOutage): Outage {
  const { cityNameCyrillic, branchCyrillic, ...rest } = raw;
  return { id: identify(raw), ...rest };
}

function byDateThenTime(left: Outage, right: Outage): number {
  if (left.date !== right.date) {
    return left.date.localeCompare(right.date);
  }

  const leftStart = left.time?.start ?? '99:99';
  const rightStart = right.time?.start ?? '99:99';

  return leftStart.localeCompare(rightStart) || left.areaLabel.localeCompare(right.areaLabel, 'sr');
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

export async function readCityHistory(cityId: string): Promise<DailyTotals[]> {
  try {
    const stored = await readFile(join(CITIES_DIRECTORY, `${cityId}.json`), 'utf-8');
    return (JSON.parse(stored) as CityDataset).history ?? [];
  } catch {
    return [];
  }
}

export async function writeCityDataset(
  city: City,
  outages: RawOutage[],
  history: DailyTotals[]
): Promise<number> {
  await mkdir(CITIES_DIRECTORY, { recursive: true });

  const unique = new Map<string, Outage>();

  for (const raw of outages) {
    const outage = toOutage(raw);
    unique.set(outage.id, outage);
  }

  const dataset: CityDataset = {
    city,
    outages: [...unique.values()].sort(byDateThenTime),
    history
  };

  await writeJson(join(CITIES_DIRECTORY, `${city.id}.json`), dataset);
  return dataset.outages.length;
}

export async function writeRegistry(registry: Registry): Promise<void> {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeJson(join(OUTPUT_ROOT, 'registry.json'), registry);
}
