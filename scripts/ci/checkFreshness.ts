import { readFile } from 'node:fs/promises';

// The dataset committed on the branch, which is the previous run's work: `generatedAt` is
// written by the collector and pushed back by notify, so the file on the branch says when
// outages were last read from the sources.
const REGISTRY_PATH = 'static/data/registry.json';

// Hours the collector is meant to be awake, UTC, matching the schedule in refresh.yml:
// hourly from 03:10 to 09:10, then every second hour to 20:10. Nothing runs overnight, so
// that silence is by design and is not counted against anybody -- which is the whole
// reason the gap is measured in waking hours rather than wall-clock ones. A plain
// difference has to tolerate the seven-hour night, and a threshold that tolerates the
// night cannot see a morning of dropped slots.
const WINDOW_OPENS_UTC = 3;
const WINDOW_CLOSES_UTC = 21;

// How much of that waking time the collector may miss. The widest gap the schedule itself
// leaves inside the window is the two hours of the afternoon cadence, so three hours is
// one dropped slot -- tolerable -- and anything beyond it is the schedule not running.
//
// What this is for: on 16 September 2026 five consecutive morning slots never fired,
// Kragujevac's announcement of that day's outages sat uncollected for three hours after
// it was published, and nothing anywhere said so. GitHub's `schedule` trigger is
// best-effort and was dropping roughly three slots in five; the worker cron now drives the
// workflow instead, and this is what notices when that stops working too.
const ALLOWED_AWAKE_HOURS = 3;

const MS_PER_HOUR = 3_600_000;

interface Stamped {
  generatedAt: string;
}

function startOfDay(moment: Date): Date {
  return new Date(Date.UTC(moment.getUTCFullYear(), moment.getUTCMonth(), moment.getUTCDate()));
}

function hoursOn(day: Date, from: Date, to: Date): number {
  const opens = day.getTime() + WINDOW_OPENS_UTC * MS_PER_HOUR;
  const closes = day.getTime() + WINDOW_CLOSES_UTC * MS_PER_HOUR;

  const overlap =
    Math.min(closes, to.getTime()) - Math.max(opens, from.getTime());

  return Math.max(0, overlap) / MS_PER_HOUR;
}

// The waking hours the interval covers, summed a day at a time so a gap running across
// several nights counts only the days inside it.
function awakeHoursBetween(from: Date, to: Date): number {
  let total = 0;

  for (let day = startOfDay(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    total += hoursOn(day, from, to);
  }

  return total;
}

async function lastCollection(): Promise<Date | null> {
  try {
    const stamped = JSON.parse(await readFile(REGISTRY_PATH, 'utf-8')) as Stamped;
    const moment = new Date(stamped.generatedAt);

    return Number.isNaN(moment.getTime()) ? null : moment;
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const previous = await lastCollection();

  // Nothing to compare against on a first run, or on a branch whose dataset has never
  // been committed. Silence is the right answer rather than a red run nobody can act on.
  if (!previous) {
    console.log(`${REGISTRY_PATH}: no previous collection recorded, nothing to measure`);
    return;
  }

  const now = new Date();
  const awake = awakeHoursBetween(previous, now);
  const measured = `${awake.toFixed(1)}h of waking time since ${previous.toISOString()}`;

  if (awake <= ALLOWED_AWAKE_HOURS) {
    console.log(`collector is current: ${measured}`);
    return;
  }

  console.error(`The collector has not run in ${measured}.\n`);
  console.error('Any outage published in that window reached nobody, and a gap this wide is');
  console.error(`slots dropped rather than merely late -- ${ALLOWED_AWAKE_HOURS}h is already one missed.`);
  console.error('Check that the worker cron is still dispatching this workflow and that its');
  console.error('GitHub token has not expired; both fail silently, which is what this is for.');

  process.exit(1);
}

await run();
