import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { toLatin } from '../../src/lib/text/serbianScript';

// The Address Register is the state's own list of municipalities, settlements and streets,
// which is what the seed lists have been standing in for. Importing it separates two
// things that have been the same thing: what places exist, which nobody has to guess at
// any more, and how a source spells them, which stays a parsing problem.
//
// Fetch the streets codebook first -- it carries settlement and municipality columns, so
// one file answers all three:
//
//   curl -L -o ulica.zip 'https://download.geosrbija.rs/download-api/opendata-proxy/\
//     export?category=ar&layer=ulica_ar&geometry=true&fileName=ulica_csv&format=csv'
//   unzip ulica.zip
//   npm run rgz -- ulica.csv
//
// 205 MB of it is the WKT geometry of every street, which this throws away: the site
// draws no map, and the register is 10 MB once it is gone. The download is therefore not
// committed; only what comes out of it is.
const OUTPUT_DIRECTORY = 'data/rgz';
const SOURCE = process.argv[2] ?? 'ulica.csv';

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

interface Street {
  id: string;
  settlementId: string;
  nameCyrillic: string;
  type: string;
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
  const nameCyrillic = titleCase(upperCaseName);

  return { id, nameCyrillic, nameLatin: toLatin(nameCyrillic) };
}

async function run(): Promise<void> {
  const municipalities = new Map<string, Place>();
  const settlements = new Map<string, Settlement>();
  const streets: Street[] = [];

  const lines = createInterface({
    input: createReadStream(SOURCE, 'utf-8'),
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
      id: row[Column.StreetId],
      settlementId,
      nameCyrillic: titleCase(row[Column.StreetName]),
      type: titleCase(row[Column.StreetType])
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

  // Street names per municipality, as written. Two things read them and they used to be
  // stored twice: the collector wants them folded, to ask whether an announcement names
  // one, and the search index wants them as a reader would recognise them. Folding is
  // cheap and lossy in one direction only, so what is committed is the readable form and
  // the collector folds it on load.
  const names = new Map<string, Set<string>>();

  for (const street of streets) {
    const municipalityId = settlements.get(street.settlementId)?.municipalityId;

    if (!municipalityId) {
      continue;
    }

    const set = names.get(municipalityId) ?? new Set<string>();
    set.add(street.nameCyrillic);
    names.set(municipalityId, set);
  }

  await writeFile(
    `${OUTPUT_DIRECTORY}/streetsByMunicipality.json`,
    `${JSON.stringify(
      Object.fromEntries(
        [...names].map(([id, set]) => [id, [...set].sort((left, right) => left.localeCompare(right, 'sr'))])
      )
    )}\n`
  );

  // The full table, with the id each street is subscribed by, is what the address
  // typeahead needs and nothing else does. It is an order of magnitude larger and is
  // regenerated rather than committed.
  await writeFile(`${OUTPUT_DIRECTORY}/streets.json`, `${JSON.stringify(streets)}\n`);

  console.log(`municipalities ${municipalities.size}`);
  console.log(`settlements    ${settlements.size}`);
  console.log(`streets        ${streets.length} (${retired} retired, dropped)`);
  console.log(`street names   in ${names.size} municipalities`);
}

await run();
