import { readFileSync } from 'node:fs';
import type { RawOutage } from '../../src/lib/domain/outage';
import { addressCandidates, foldForMatching } from '../../src/lib/address/addressText';
import { municipalitiesOf } from './cityRollup';
import { PlaceKind, placeNamed } from './rgzPlaces';

const DIRECTORY = 'data/rgz';

// How precisely a reader in this city could be told an outage is theirs. It is measured
// rather than declared: a utility that names streets makes street precision possible and
// one that names villages does not, and no amount of intent changes which.
export const Precision = {
  Street: 'street',
  Settlement: 'settlement',
  Municipality: 'municipality'
} as const;

export type Precision = (typeof Precision)[keyof typeof Precision];

export interface AddressMatch {
  streets: string[];
  settlements: string[];
}

interface Settlement {
  id: string;
  nameCyrillic: string;
  municipalityId: string;
}

interface Pool {
  streets: Set<string>;
  settlements: Set<string>;
  // The settlements that are the page itself. Nearly every announcement opens by naming
  // the town it is about, and the register has a settlement of that name, so counting it
  // read as perfect settlement precision for cities that never name a village: Valjevo
  // and Subotica both showed 100% on nothing but their own label.
  own: Set<string>;
}

interface Street {
  nameCyrillic: string;
  settlementId: string;
}

let settlementRows: Settlement[] | null = null;
let streetNames: Record<string, string[]> | null = null;

// The register is stored as it reads, so the folding a comparison needs happens here,
// once per run, and the grouping this asks for -- which streets belong to a municipality
// -- is derived through the settlement each one belongs to.
function load(): void {
  settlementRows ??= JSON.parse(
    readFileSync(`${DIRECTORY}/settlements.json`, 'utf-8')
  ) as Settlement[];

  if (streetNames) {
    return;
  }

  const municipalityOf = new Map(
    settlementRows.map((settlement) => [settlement.id, settlement.municipalityId])
  );

  const streets = JSON.parse(readFileSync(`${DIRECTORY}/streets.json`, 'utf-8')) as Street[];
  const folded: Record<string, string[]> = {};

  for (const street of streets) {
    const municipalityId = municipalityOf.get(street.settlementId);

    if (!municipalityId) {
      continue;
    }

    (folded[municipalityId] ??= []).push(foldForMatching(street.nameCyrillic));
  }

  streetNames = folded;
}

// Which municipalities a page speaks for. Usually itself; for Belgrade and Niš, every
// gradska opština inside them, because the page rolls their outages up the same way.
function municipalityIds(cityNameCyrillic: string): string[] {
  const parts = municipalitiesOf(cityNameCyrillic);
  const names = parts.length > 0 ? [...parts] : [cityNameCyrillic];

  return names.flatMap((name) => {
    const place = placeNamed(name, cityNameCyrillic);

    if (!place) {
      return [];
    }

    const id = place.kind === PlaceKind.Municipality ? place.id : place.municipalityId;

    return id ? [id] : [];
  });
}

const pools = new Map<string, Pool>();

function poolFor(cityNameCyrillic: string): Pool {
  const cached = pools.get(cityNameCyrillic);

  if (cached) {
    return cached;
  }

  load();

  const ids = new Set(municipalityIds(cityNameCyrillic));
  const parts = municipalitiesOf(cityNameCyrillic);
  const pool: Pool = {
    streets: new Set(),
    settlements: new Set(),
    own: new Set([cityNameCyrillic, ...parts].map(foldForMatching))
  };

  for (const id of ids) {
    for (const name of streetNames?.[id] ?? []) {
      pool.streets.add(name);
    }
  }

  for (const settlement of settlementRows ?? []) {
    if (ids.has(settlement.municipalityId)) {
      pool.settlements.add(foldForMatching(settlement.nameCyrillic));
    }
  }

  pools.set(cityNameCyrillic, pool);

  return pool;
}

// The label carries the settlement often enough to be worth reading -- Niš publishes
// "Габровац" there and the streets beneath it -- so both are offered to the matcher.
function textOf(outage: RawOutage): string {
  return [outage.areaLabel, ...outage.streets].join(' • ');
}

export function matchAddresses(cityNameCyrillic: string, outage: RawOutage): AddressMatch {
  const pool = poolFor(cityNameCyrillic);
  const streets = new Set<string>();
  const settlements = new Set<string>();

  for (const candidate of addressCandidates(textOf(outage))) {
    if (pool.streets.has(candidate)) {
      streets.add(candidate);
    }

    if (pool.settlements.has(candidate) && !pool.own.has(candidate)) {
      settlements.add(candidate);
    }
  }

  return { streets: [...streets], settlements: [...settlements] };
}
