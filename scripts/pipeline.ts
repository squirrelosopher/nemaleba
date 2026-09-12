import { readFile } from 'node:fs/promises';
import type { AffectedCity, DailySummary, Registry } from '../src/lib/domain/city';
import type { RawOutage } from '../src/lib/domain/outage';
import { Utility } from '../src/lib/domain/utility';
import { toSlug } from '../src/lib/text/serbianScript';
import { CityRegistry } from './registry/cityRegistry';
import {
  findRegressions,
  isOverridden,
  readSourceHealth,
  record,
  writeSourceHealth,
  type SourceHealth
} from './registry/sourceHealth';
import { canonicalMunicipality, parentCity } from './registry/cityRollup';
import {
  describeCoverage,
  readCoverage,
  tally,
  writeCoverage,
  type Coverage
} from './registry/addressCoverage';
import { mergeHistory, totalsOn } from './registry/dailyHistory';
import { readCityHistory, writeCityDataset, writeRegistry } from './emit/datasetWriter';
import { writeSiteIndex } from './emit/siteIndex';
import { writeStreetIndex } from './emit/streetIndex';
import {
  describeUnknown,
  findUnknownPlaces,
  readUnknownPlaces,
  writeUnknownPlaces
} from './registry/unknownPlaces';
import { BvkBeogradSource } from './sources/bvkBeograd';
import { EpsDistribucijaSource } from './sources/epsDistribucija';
import { JedinstvoKladovoSource } from './sources/jedinstvoKladovo';
import { JkpGornjiMilanovacSource } from './sources/jkpGornjiMilanovac';
import { NaissusNisSource } from './sources/naissusNis';
import { VikNoviSadSource } from './sources/vikNoviSad';
import { VodovodBorSource } from './sources/vodovodBor';
import { VodovodCacakSource } from './sources/vodovodCacak';
import { VodovodIndjijaSource } from './sources/vodovodIndjija';
import { VodovodLeskovacSource } from './sources/vodovodLeskovac';
import { VodovodPancevoSource } from './sources/vodovodPancevo';
import { VodovodPozarevacSource } from './sources/vodovodPozarevac';
import { VodovodRumaSource } from './sources/vodovodRuma';
import { VodovodSremskaMitrovicaSource } from './sources/vodovodSremskaMitrovica';
import { VikKragujevacSource } from './sources/vikKragujevac';
import { VikZrenjaninSource } from './sources/vikZrenjanin';
import { VodovodValjevoSource } from './sources/vodovodValjevo';
import { VodovodVranjeSource } from './sources/vodovodVranje';
import type { OutageSource } from './sources/OutageSource';
import { captured } from './sources/sourceLog';
import { isoDate } from './time/serbianDate';

const REGISTRY_PATH = 'static/data/registry.json';
const FORECAST_DAYS = 7;

const RETAINED_PAST_DAYS: Record<Utility, number> = {
  [Utility.Electricity]: 1,
  [Utility.Water]: 7
};

const SOURCES: OutageSource[] = [
  new EpsDistribucijaSource(),
  new VikKragujevacSource(),
  new BvkBeogradSource(),
  new VikNoviSadSource(),
  new NaissusNisSource(),
  new VodovodPancevoSource(),
  new VodovodSremskaMitrovicaSource(),
  new VodovodRumaSource(),
  new VodovodIndjijaSource(),
  new VodovodBorSource(),
  new JkpGornjiMilanovacSource(),
  new VikZrenjaninSource(),
  new VodovodValjevoSource(),
  new VodovodVranjeSource(),
  new VodovodLeskovacSource(),
  new VodovodPozarevacSource(),
  new JedinstvoKladovoSource(),
  new VodovodCacakSource()
];

async function loadPreviousRegistry(): Promise<Registry | undefined> {
  try {
    return JSON.parse(await readFile(REGISTRY_PATH, 'utf-8')) as Registry;
  } catch {
    return undefined;
  }
}

interface SourceRunResult {
  source: OutageSource;
  outages: RawOutage[];
  lines: string[];
}

// Every source is a different host, so waiting for each in turn spent the run idle: the
// eighteen of them answer in seventeen seconds one after another and in three at once.
// A throw still fails the whole run, as it did before, but now says which source threw.
async function collectFrom(source: OutageSource): Promise<SourceRunResult> {
  try {
    const { result, lines } = await captured(() => source.collect());

    return { source, outages: result, lines };
  } catch (error) {
    throw new Error(`${source.id}: ${(error as Error).message}`, { cause: error });
  }
}

async function collectAll(): Promise<RawOutage[]> {
  const previous = await readSourceHealth();
  const runs = await Promise.all(SOURCES.map(collectFrom));

  const current: SourceHealth = {};
  const collected: RawOutage[] = [];

  // Reported and concatenated in the order SOURCES declares rather than the order they
  // happened to finish, so the log reads the same way every run and so does the dataset.
  for (const { source, outages, lines } of runs) {
    console.log(`fetching ${source.label}`);
    lines.forEach((line) => console.warn(line));
    console.log(`  ${outages.length} entries`);

    current[source.id] = record(previous, source.id, outages.length, source.unreadableFeeds?.());
    collected.push(...outages);
  }

  reportUnreadable(current);

  const quietByNature = new Set(
    SOURCES.filter((source) => source.silenceIsExpected).map((source) => source.id)
  );

  const regressions = findRegressions(previous, current, quietByNature);

  if (regressions.length > 0 && !isOverridden()) {
    console.error('\nrefusing to publish — a source stopped returning data:');
    regressions.forEach((line) => console.error(`  ${line}`));
    console.error('\nCheck the parsers against the live pages. Set ALLOW_EMPTY_SOURCES=1');
    console.error('to publish anyway if the silence is genuine.');
    process.exit(1);
  }

  await writeSourceHealth(current);
  return collected;
}

// A feed nobody can read is not a quiet feed, and the run goes on regardless: the rest
// of the country is still worth publishing, and the places behind that feed are better
// off with an empty page than with yesterday's outages presented as today's. The record
// keeps the gap so a page saying nothing can be told apart from a page with nothing
// to say.
function reportUnreadable(current: SourceHealth): void {
  for (const [id, run] of Object.entries(current)) {
    if (!run.unreadable?.length) {
      continue;
    }

    console.warn(`\n${id}: ${run.unreadable.length} feed(s) unreadable this run`);
    console.warn(`  last complete run: ${run.lastComplete ?? 'never'}`);
  }
}

// Counts today and everything announced after it, matching what a city page shows.
// Anything narrower hides tomorrow's outages from the overview and disagrees with
// the per-city tiles.
function summarise(outages: RawOutage[]): DailySummary {
  const today = isoDate(0);
  const upcoming = outages.filter((outage) => outage.date >= today);

  return {
    date: today,
    electricityOutages: upcoming.filter((outage) => outage.utility === Utility.Electricity).length,
    waterOutages: upcoming.filter((outage) => outage.utility === Utility.Water).length,
    affected: affectedCities(upcoming)
  };
}

// Keyed by the id the table links and keys its rows with, never by the name: two
// spellings of one municipality slug to one page, and two rows carrying one id is a
// duplicate key the moment the overview renders.
function affectedCities(outages: RawOutage[]): AffectedCity[] {
  const byCity = new Map<string, AffectedCity>();

  for (const outage of outages) {
    const name = parentCity(outage.branchCyrillic, outage.cityNameCyrillic);
    const id = toSlug(name);
    const entry = byCity.get(id) ?? {
      id,
      nameCyrillic: name,
      electricityOutages: 0,
      waterOutages: 0
    };

    if (outage.utility === Utility.Electricity) {
      entry.electricityOutages += 1;
    } else {
      entry.waterOutages += 1;
    }

    byCity.set(id, entry);
  }

  return [...byCity.values()].sort(
    (left, right) =>
      right.electricityOutages + right.waterOutages -
        (left.electricityOutages + left.waterOutages) ||
      left.nameCyrillic.localeCompare(right.nameCyrillic, 'sr')
  );
}

// Written to static/data rather than only logged, so the CI job commits it and the
// next run can say how long a name has been arriving. Nothing reads it at runtime.
async function reportUnknownPlaces(outages: RawOutage[]): Promise<void> {
  const places = findUnknownPlaces(outages, await readUnknownPlaces());
  await writeUnknownPlaces(places);

  const lines = describeUnknown(places);

  if (lines.length === 0) {
    return;
  }

  console.warn('\nnames outside the seed lists:');
  lines.forEach((line) => console.warn(`  ${line}`));
}

async function run(): Promise<void> {
  const latest = isoDate(FORECAST_DAYS);

  const collected = (await collectAll()).map((outage) => ({
    ...outage,
    cityNameCyrillic: canonicalMunicipality(outage.branchCyrillic, outage.cityNameCyrillic)
  }));

  const relevant = collected.filter((outage) => {
    const earliest = isoDate(-RETAINED_PAST_DAYS[outage.utility]);
    return outage.date >= earliest && outage.date <= latest;
  });

  console.log(`\n${relevant.length} entries retained through ${latest}`);

  await reportUnknownPlaces(relevant);

  const previous = await loadPreviousRegistry();
  const registry = new CityRegistry(previous);
  const history = mergeHistory(previous?.history ?? [], totalsOn(relevant, isoDate(0)));

  for (const outage of relevant) {
    registry.observe(outage);
  }

  const generatedAt = new Date().toISOString();
  const cities = registry.all();
  let populated = 0;

  const today = isoDate(0);

  // How precisely each city's announcements can be read is a running tally, not a verdict
  // on today: it decides whether a reader there is offered a subscription finer than the
  // whole municipality, and one quiet day should not take it away.
  const previousCoverage = await readCoverage();
  const coverage: Coverage = {};

  for (const city of cities) {
    const matching = relevant.filter((outage) => registry.matches(city, outage));
    const cityHistory = mergeHistory(await readCityHistory(city.id), totalsOn(matching, today));
    const written = await writeCityDataset(city, matching, cityHistory);

    coverage[city.id] = tally(previousCoverage, city, matching);

    if (written > 0) {
      populated += 1;
    }
  }

  await writeCoverage(coverage);

  await writeRegistry(
    registry.toRegistry(
      summarise(relevant),
      history,
      SOURCES.map((source) => source.provider)
    )
  );
  await writeSiteIndex(cities, generatedAt);

  // Written here rather than imported once, so it follows the city list: a municipality
  // that gains a page gains its streets in the same run.
  const streets = await writeStreetIndex(cities);

  console.log(`wrote ${cities.length} cities (${populated} with active outages)`);
  console.log(`wrote ${streets} searchable streets`);

  const readable = describeCoverage(coverage);

  if (readable.length > 0) {
    console.log(`\naddress precision earned by ${readable.length} cities:`);
    readable.forEach((line) => console.log(`  ${line}`));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
