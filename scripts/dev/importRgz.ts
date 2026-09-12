import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { toLatin } from '../../src/lib/text/serbianScript';

// The Address Register is the state's own list of municipalities, settlements and streets,
// which is what the seed lists have been standing in for. Importing it separates two
// things that used to be one: what places exist, which nobody has to guess at any more,
// and how a source spells them, which stays a parsing problem.
//
//   npm run rgz                 fetches the register and imports it
//   npm run rgz -- ulica.csv    imports a copy already on disk
//
// The register changes slowly -- streets get named, municipalities essentially never
// change -- so this is a once-a-year job rather than something to schedule.
const OUTPUT_DIRECTORY = 'data/rgz';

// The streets codebook carries settlement and municipality columns, so one download
// answers all three files.
const DOWNLOAD_URL =
  'https://download.geosrbija.rs/download-api/opendata-proxy/export' +
  '?category=ar&layer=ulica_ar&geometry=true&fileName=ulica_csv&format=csv';

// 205 MB of the download is the WKT geometry of every street, thrown away on the way
// through: the site draws no map, and what is kept is a tenth of the size.
const enum Column {
  StreetId = 0,
  StreetName = 2,
  StreetType = 4,
  Retired = 8,
  SettlementId = 9,
  SettlementName = 10,
  MunicipalityId = 12,
  MunicipalityName = 13
}

interface Place {
  id: string;
  nameCyrillic: string;
  nameLatin: string;
}

interface Settlement extends Place {
  municipalityId: string;
}

interface Street extends Place {
  type: string;
  settlementId: string;
}

// The register quotes any field that could contain a comma, and the geometry always does.
// A split on commas would tear every row apart at the first coordinate.
function fields(line: string): string[] {
  const out: string[] = [];
  let value = '';
  let quoted = false;

  for (const character of line) {
    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      out.push(value);
      value = '';
      continue;
    }

    value += character;
  }

  out.push(value);

  return out;
}

// Register names are upper case throughout. Title case is what a reader expects and what
// every other name in this project is written in.
function titleCase(name: string): string {
  return name
    .toLocaleLowerCase('sr')
    .replace(/(^|[\s\-–(])(\p{Ll})/gu, (_, lead: string, letter: string) =>
      `${lead}${letter.toLocaleUpperCase('sr')}`
    );
}

function place(id: string, upperCaseName: string): Place {
  // A few names arrive padded, which slugs away to nothing visible and then sorts first
  // as an exact match.
  const nameCyrillic = titleCase(upperCaseName).trim();

  return { id, nameCyrillic, nameLatin: toLatin(nameCyrillic) };
}

async function download(into: string): Promise<string> {
  const archive = join(into, 'ulica.zip');

  console.log('fetching the register (about 50 MB)');

  const response = await fetch(DOWNLOAD_URL);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from the register`);
  }

  await writeFile(archive, Buffer.from(await response.arrayBuffer()));

  try {
    execFileSync('unzip', ['-q', '-o', archive, '-d', into]);
  } catch {
    throw new Error("`unzip` is needed to read the register's archive, and is not on PATH");
  }

  return join(into, 'ulica.csv');
}

async function read(source: string): Promise<void> {
  const municipalities = new Map<string, Place>();
  const settlements = new Map<string, Settlement>();
  const streets: Street[] = [];

  const lines = createInterface({
    input: createReadStream(source, 'utf-8'),
    crlfDelay: Infinity
  });

  let header = true;
  let retired = 0;

  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }

    if (line.length === 0) {
      continue;
    }

    const row = fields(line);

    // A retired street is one the register has withdrawn; it belongs to no address any
    // reader could give, so it is counted and dropped.
    if (row[Column.Retired].length > 0) {
      retired += 1;
      continue;
    }

    const municipalityId = row[Column.MunicipalityId];
    const settlementId = row[Column.SettlementId];

    if (!municipalities.has(municipalityId)) {
      municipalities.set(municipalityId, place(municipalityId, row[Column.MunicipalityName]));
    }

    if (!settlements.has(settlementId)) {
      settlements.set(settlementId, {
        ...place(settlementId, row[Column.SettlementName]),
        municipalityId
      });
    }

    streets.push({
      ...place(row[Column.StreetId], row[Column.StreetName]),
      type: titleCase(row[Column.StreetType]),
      settlementId
    });
  }

  const byName = (left: Place, right: Place) =>
    left.nameLatin.localeCompare(right.nameLatin, 'sr');

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  await writeFile(
    `${OUTPUT_DIRECTORY}/municipalities.json`,
    `${JSON.stringify([...municipalities.values()].sort(byName), null, 2)}\n`
  );

  await writeFile(
    `${OUTPUT_DIRECTORY}/settlements.json`,
    `${JSON.stringify([...settlements.values()].sort(byName), null, 2)}\n`
  );

  // The same shape as the other two, one level deeper: a street belongs to a settlement
  // the way a settlement belongs to a municipality. Written without indentation because
  // it is ninety-six thousand rows and nobody reads it by eye.
  await writeFile(
    `${OUTPUT_DIRECTORY}/streets.json`,
    `${JSON.stringify(streets.sort(byName))}\n`
  );

  console.log(`municipalities ${municipalities.size}`);
  console.log(`settlements    ${settlements.size}`);
  console.log(`streets        ${streets.length} (${retired} retired, dropped)`);
}

async function run(): Promise<void> {
  const given = process.argv[2];

  if (given) {
    await read(given);
    return;
  }

  const scratch = await mkdtemp(join(tmpdir(), 'rgz-'));

  try {
    await read(await download(scratch));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

await run();
