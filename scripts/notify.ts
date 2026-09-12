import { readFile } from 'node:fs/promises';
import webpush from 'web-push';
import type { CityDataset } from '../src/lib/domain/city';
import type { Outage } from '../src/lib/domain/outage';
import { Utility } from '../src/lib/domain/utility';
import { MESSAGES, type MessageKey } from '../src/lib/i18n/messages';
import { toLatin } from '../src/lib/text/serbianScript';
import { formatTimeWindow, type Say } from '../src/lib/time/timeWindow';
import { municipalitiesOf } from './registry/cityRollup';
import { NotificationLog } from './notify/notificationLog';
import {
  createDirectory,
  type Subscriber,
  type SubscriberDirectory
} from './notify/SubscriberDirectory';
import { isoDate } from './time/serbianDate';

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://nemaleba.rs';
// Names the outage the notification is about, so the city page can point at its row.
// Every entry in the notifications list carries it, and so does a card about a single
// outage. Only a card covering several drops it, having no one row to choose.
const HIGHLIGHT_PARAM = 'outage';
// Opens the city's electricity or water panel, for the cards that do drop it.
const UTILITY_PARAM = 'utility';
const NOTIFIED_HORIZON_DAYS = 1;
const DIGEST_LOCATIONS = 3;
const GONE_STATUSES = new Set([404, 410]);
const DELIVERY_BATCH = 20;

const TITLE_KEYS: Record<Utility, MessageKey> = {
  [Utility.Electricity]: 'pushElectricity',
  [Utility.Water]: 'pushWater'
};

const ENGLISH = 'en';
const CYRILLIC = 'sr-cyrl';

function inScript(text: string, locale: string): string {
  return locale === CYRILLIC ? text : toLatin(text);
}

function wordsIn(locale: string): Say {
  return (key, values) => say(key, locale, values);
}

function say(key: MessageKey, locale: string, values?: Record<string, string>): string {
  const message = MESSAGES[key];
  const text = locale === ENGLISH ? message.en : inScript(message.sr, locale);

  return values
    ? text.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match)
    : text;
}

interface Pending {
  cityId: string;
  cityNameCyrillic: string;
  outage: Outage;
}

// A city that rolls others up is the wider of the two pages one outage lands on. Which
// of the two a name is cannot be read off the outage: its areaLabel is often a
// settlement rather than a municipality, so comparing names would be a coin toss.
function rollsUpOthers(cityNameCyrillic: string): boolean {
  return municipalitiesOf(cityNameCyrillic).length > 0;
}

// Two subscriptions can cover the same outage: the municipality it happened in and the
// city above it. That is one thing to be told about, and the page worth opening is the
// municipality's, so it wins. The city above only stands in when nothing narrower is
// subscribed, which is what a reader following only Beograd should still get.
function onePerOutage(items: Pending[]): Pending[] {
  const chosen = new Map<string, Pending>();

  for (const item of items) {
    const held = chosen.get(item.outage.id);
    const narrower = held && rollsUpOthers(held.cityNameCyrillic) && !rollsUpOthers(item.cityNameCyrillic);

    if (!held || narrower) {
      chosen.set(item.outage.id, item);
    }
  }

  return [...chosen.values()];
}

interface Card {
  payload: string;
  outageIds: string[];
}

function idsOf(items: Pending[]): string[] {
  return items.map((item) => item.outage.id);
}

// One entry per outage, each pointing at its own row. These are what the notifications
// list renders and links, whichever shape the card itself took.
function entriesOf(items: Pending[], locale: string) {
  return items.map((item) => ({
    cityId: item.cityId,
    outageId: item.outage.id,
    date: item.outage.date,
    title: say(TITLE_KEYS[item.outage.utility], locale),
    body: inScript(describe(item.outage, wordsIn(locale)), locale),
    url: `${SITE_ORIGIN}/${item.cityId}/?${HIGHLIGHT_PARAM}=${item.outage.id}`
  }));
}

// Everything in one card, for a reader who asked for that. It opens the list, which is
// the one page that holds all of it however many cities the run touched.
function digestFor(items: Pending[], locale: string, today: string): Card {
  const names = [...new Set(items.map((item) => inScript(item.cityNameCyrillic, locale)))];
  const shown = names.slice(0, DIGEST_LOCATIONS);
  const locations = shown.join(', ') + (names.length > shown.length ? '…' : '');

  return {
    payload: JSON.stringify({
      title: say('pushDigestTitle', locale),
      body: say('pushDigestBody', locale, { locations }),
      tag: `nemaleba-digest-${today}`,
      url: `${SITE_ORIGIN}/obavestenja/`,
      entries: entriesOf(items, locale)
    }),
    outageIds: idsOf(items)
  };
}

function byCity(items: Pending[]): Pending[][] {
  const buckets = new Map<string, Pending[]>();

  for (const item of items) {
    const held = buckets.get(item.cityId) ?? [];
    held.push(item);
    buckets.set(item.cityId, held);
  }

  return [...buckets.values()];
}

/**
 * How many cards a subscriber's run turns into, and where each of them opens.
 *
 * Grouped: one card, and it opens the notifications list. Always — a reader who asked
 * for one card asked for one place to read them, and having it open a city on the runs
 * that happen to cover only one would make where it lands depend on the weather.
 *
 * Ungrouped, which is the default: one card per city. A city with one outage opens that
 * outage's row, since there is no ambiguity about which row it means. A city with
 * several opens the city, because none of the rows is the one the card is about.
 */
function cardsFor(items: Pending[], locale: string, today: string, grouped: boolean): Card[] {
  if (grouped) {
    return [digestFor(items, locale, today)];
  }

  return byCity(items).map((forCity) => oneCity(forCity, locale, today));
}

function oneCity(items: Pending[], locale: string, today: string): Card {
  const [first] = items;

  return items.length === 1
    ? payloadFor(first.cityId, first.outage, locale, today)
    : cityDigestFor(items, locale, today);
}

function loadEnvironment(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    return;
  }
}

async function readDataset(cityId: string): Promise<CityDataset | null> {
  try {
    return JSON.parse(await readFile(`static/data/cities/${cityId}.json`, 'utf-8')) as CityDataset;
  } catch {
    return null;
  }
}

function describe(outage: Outage, words: Say): string {
  const when = outage.time ? `${formatTimeWindow(outage.time, words)} · ` : '';
  const where = outage.streets.length > 0 ? outage.streets.join(', ') : outage.areaLabel;

  return `${when}${where}`;
}

/**
  * Where a card covering several outages opens: the city, since none of the rows is the
  * one it is about. Landing on one of five, with the other four reachable only by
  * scrolling back out of it, reads as the wrong promise.
  *
  * The panel is chosen when everything the card covers is electricity or is water. A
  * card covering both leaves the choice to the page.
  */
function cityUrl(cityId: string, outages: Outage[]): string {
  const utilities = new Set(outages.map((outage) => outage.utility));
  const [only] = utilities.size === 1 ? [...utilities] : [null];

  return only
    ? `${SITE_ORIGIN}/${cityId}/?${UTILITY_PARAM}=${only}`
    : `${SITE_ORIGIN}/${cityId}/`;
}

/**
  * One outage: the card names it, so it opens it. There is one row to arrive at and no
  * ambiguity about which — the reason a card opens the city at all is that several rows
  * have no single one to choose, and that does not apply here.
  *
  * The url is also what the notifications list shows for this card, since a payload
  * carrying no `entries` is remembered as itself. Pointing it anywhere but the row cost
  * the list its own link to that row.
  *
  * No `utility` alongside it: the page reads the panel off the outage it highlights.
  *
  * Tagged by city and day, so a later hour replaces this card rather than stacking a
  * second one beside it.
  */
function payloadFor(cityId: string, outage: Outage, locale: string, today: string): Card {
  return {
    payload: JSON.stringify({
      title: say(TITLE_KEYS[outage.utility], locale),
      body: inScript(describe(outage, wordsIn(locale)), locale),
      tag: `nemaleba-${cityId}-${today}`,
      url: `${SITE_ORIGIN}/${cityId}/?${HIGHLIGHT_PARAM}=${outage.id}`,
      cityId,
      outageId: outage.id,
      date: outage.date
    }),
    outageIds: [outage.id]
  };
}

// Several outages in one city: the city is the whole message, and the card opens it.
// What each of them is stays in `entries`, which is what the notifications list shows.
function cityDigestFor(items: Pending[], locale: string, today: string): Card {
  const { cityId, cityNameCyrillic } = items[0];

  return {
    payload: JSON.stringify({
      title: say('pushDigestTitle', locale),
      body: inScript(cityNameCyrillic, locale),
      tag: `nemaleba-${cityId}-${today}`,
      url: cityUrl(cityId, items.map((item) => item.outage)),
      entries: entriesOf(items, locale)
    }),
    outageIds: idsOf(items)
  };
}

const Delivery = {
  Sent: 'sent',
  Failed: 'failed',
  Gone: 'gone'
} as const;

type Delivery = (typeof Delivery)[keyof typeof Delivery];

async function forget(directory: SubscriberDirectory, endpoint: string): Promise<void> {
  try {
    await directory.forget(endpoint);
  } catch {
    console.warn('  could not drop a dead subscription');
  }
}

async function deliver(subscriber: Subscriber, payload: string): Promise<Delivery> {
  try {
    await webpush.sendNotification(subscriber as webpush.PushSubscription, payload);
    return Delivery.Sent;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;

    if (status && GONE_STATUSES.has(status)) {
      return Delivery.Gone;
    }

    console.warn(`  delivery failed (${status ?? 'unknown'})`);
    return Delivery.Failed;
  }
}

function wants(subscriber: Subscriber, utility: Utility): boolean {
  return utility === Utility.Electricity
    ? subscriber.preferences.electricity
    : subscriber.preferences.water;
}

async function run(): Promise<void> {
  loadEnvironment();

  const publicKey = process.env.PUBLIC_VAPID_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.log('VAPID keys missing — skipping notifications');
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:kontakt@nemaleba.rs',
    publicKey,
    privateKey
  );

  const directory = createDirectory();
  const log = await NotificationLog.open();
  const horizon = isoDate(NOTIFIED_HORIZON_DAYS);
  const today = isoDate(0);
  const forgotten = new Set<string>();
  const seen = new Set<string>();
  const attempted = new Set<string>();
  const landed = new Set<string>();
  let sent = 0;

  const queued = new Map<string, { subscriber: Subscriber; items: Pending[] }>();

  for (const cityId of await directory.subscribedCities()) {
    const dataset = await readDataset(cityId);

    if (!dataset) {
      continue;
    }

    const pending = dataset.outages.filter(
      (outage) => outage.date >= today && outage.date <= horizon && !log.wasDelivered(outage.id)
    );

    if (pending.length === 0) {
      continue;
    }

    for (const subscriber of await directory.subscribersOf(cityId)) {
      const wanted = pending.filter((outage) => wants(subscriber, outage.utility));

      if (wanted.length === 0) {
        continue;
      }

      const bucket = queued.get(subscriber.endpoint) ?? { subscriber, items: [] };

      bucket.items.push(
        ...wanted.map((outage) => ({
          cityId,
          cityNameCyrillic: dataset.city.nameCyrillic,
          outage
        }))
      );

      wanted.forEach((outage) => attempted.add(outage.id));
      queued.set(subscriber.endpoint, bucket);
    }

    for (const outage of pending) {
      seen.add(outage.id);
    }
  }

  // Each push is an independent request to someone else's server, so sending them one
  // after another makes the run take as long as the slowest subscriber times the number
  // of them. Batches keep that bounded without opening a socket per subscriber.
  const recipients = [...queued.values()];

  try {
    for (let index = 0; index < recipients.length; index += DELIVERY_BATCH) {
      const batch = recipients.slice(index, index + DELIVERY_BATCH);

      const results = await Promise.all(
        batch.map(async ({ subscriber, items }) => {
          const { locale, grouped } = subscriber.preferences;
          const cards = cardsFor(onePerOutage(items), locale, today, grouped);

          // A subscriber's own cards go one after another: they are the same push service
          // and, ungrouped, one per city they follow.
          const outcomes: Delivery[] = [];

          for (const card of cards) {
            const outcome = await deliver(subscriber, card.payload);
            outcomes.push(outcome);

            if (outcome === Delivery.Sent) {
              card.outageIds.forEach((id) => landed.add(id));
            }
          }

          return { subscriber, outcomes };
        })
      );

      for (const { subscriber, outcomes } of results) {
        sent += outcomes.filter((outcome) => outcome === Delivery.Sent).length;

        if (outcomes.includes(Delivery.Gone)) {
          forgotten.add(subscriber.endpoint);
          await forget(directory, subscriber.endpoint);
        }
      }
    }
  } finally {
    for (const id of seen) {
      if (!attempted.has(id) || landed.has(id)) {
        log.record(id);
      }
    }

    await log.save();
  }

  console.log(`sent ${sent} notifications, dropped ${forgotten.size} dead subscriptions`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
