# nemaleba.rs (WIP)

Искључења струје и воде у Србији. Static site on GitHub Pages, refreshed hourly by GitHub Actions.

## Data sources

| Utility | Source | Shape |
| --- | --- | --- |
| Electricity | ЕПС Дистрибуција | 5 regional HTML feeds × 4 days, all of Serbia |
| Water | ЈКП Водовод Крагујевац | WordPress REST API (`/wp-json/wp/v2/posts`) |
| Water | Београдски водовод (БВК) | HTML scrape of `/kvarovi-na-mrezi/` + `/planirani-radovi/` |
| Water | ЈКП ВиК Нови Сад | WordPress REST API, category `najava-radova-sr` |
| Water | ЈКП Наиссус Ниш | WordPress REST API, category `servisne-informacije` |
| Water | ЈКП ВиК Панчево | WordPress REST API, category `кварови-искључења` |
| Water | ЈКП Водовод Сремска Митровица | WordPress REST API, category `iskljucenja` |
| Water | ЈКП Водовод Рума | WordPress REST API, category `obavestenja` |
| Water | ЈКП Водовод Инђија | WordPress REST API, categories `хаварије` and `радови` |
| Water | ЈКП Водовод Бор | WordPress REST API, category `radovi-dnevni` |
| Water | ЈКП Горњи Милановац | WordPress REST API, category `сервисне-информације` |

Candidate utilities come from the industry body's own member directory at
udruzenjevodovoda.org/clanovi, which is the only reliable list; the domains follow no
naming pattern. Of the 36 members listed, eleven answer on `/wp-json/wp/v2/posts`, and of
those only some publish outages in a category worth reading: Čačak posts them as images
with no text at all, Loznica's `Kvarovi` stopped in 2019 and Zaječar's in 2023, and
Zrenjanin and Valjevo file everything under a single `Vesti`.

Bor serves `403` to the collector's own user agent while answering a browser one, so it is
the single source fetched under `BROWSER_USER_AGENT`. Its daily work plan is the richest
water feed of the lot, which is what buys the exception.

Ruma covers its villages as well as the town, so one source answers for several places at
once. Inđija splits faults and planned works into two categories, the same shape as BVK,
which is where its `OutageKind` comes from. Gornji Milanovac files the water report in the
same category as funeral notices, so the title has to be matched before the body is read,
and only the `ВОДОСНАБДЕВАЊЕ` section of it.

The homepage table rolls municipalities up to their parent city — Belgrade's 17 gradske
opštine become one `Београд` row — via `scripts/registry/cityRollup.ts`. That module also
qualifies `Палилула`, which names a city municipality of both Belgrade and Niš and would
otherwise collide on one slug.

Contacts and source links are driven by a `Provider` per source, carrying a phone number,
a `url` and a `coverage` of either `national` or a list of city ids. The footer reads
`coversCity` against the city in the URL, so both of its lines follow the page: the Niš
page cites ЕПС Дистрибуција and Наиссус, the Belgrade municipalities cite Београдски
водовод, and a page that names no city -- the homepage, the notification list -- falls
back to `beograd`, which is what every page showed before.

The two lines answer different questions, so they draw on different lists. *Sourced from*
names only what the page's rows were read from, which is a scraped source or nothing:
Aleksinac cites electricity alone. *To report a fault* also answers for the municipalities
no water source covers, out of `src/lib/domain/waterUtilities.ts` -- a contacts-only
directory of name and number per city, kept out of `registry.json` because it is static
and would otherwise be inlined into all 885 prerendered pages. A city a scraped source
covers is deliberately absent from it: that number already travels with the provider, and
recording it twice is how the two drift apart. A municipality in neither list shows
electricity alone rather than a number nobody answers.

BVK publishes two pages: `/kvarovi-na-mrezi/` (current faults, mapped to
`OutageKind.Emergency`) and `/planirani-radovi/` (announced works, mapped to
`OutageKind.Planned`). Entries whose title contains "Одложени" are postponed and skipped.

EPS returns `403` without a `User-Agent`. Its feeds only list branches that have outages
that day, so `static/data/registry.json` accumulates municipalities across runs and never
shrinks.

## Where the data comes from

None of this data is ours. The site reads what public utilities publish and shows it back,
and the places it names come from the state's own register.

**The Address Register (Адресни регистар)** — 168 municipalities, 4,719 settlements and
96,051 streets, published as open data by the Republic Geodetic Authority (Републички
геодетски завод) at [data.gov.rs](https://data.gov.rs/sr/datasets/adresni-registar-shifarnik/)
and [opendata.geosrbija.rs](https://opendata.geosrbija.rs), under the Serbian Open Data
Licence. That licence permits reuse and redistribution, commercial or not, free of charge,
and asks that the source be named — which is what this section is for. What is committed
under `data/rgz/` is derived from it: names and identifiers, with the geometry removed.

**The utilities themselves**, each named on every row that comes from it, and linked in
the footer of the page it appears on:

- ЕПС Дистрибуција, for planned electricity outages across the country
- the thirty-odd water utilities listed at the top of this file, each for its own town

Announcements are facts about public services. They are read from pages the utilities
publish openly, reshaped, and always attributed and linked back. Nothing is scraped behind
a login, nothing is republished as though it were ours, and `README` is not the only place
that says so: every outage row on the site carries its own source link.

**The contact directory** in `src/lib/domain/waterUtilities.ts` — phone numbers for the
water utility of each municipality — was assembled by hand from those utilities' own
public pages. Numbers change; corrections are welcome.

## Licence

[GNU AGPL-3.0-or-later](LICENSE). Use it, change it, run it. If you run a modified version
as a public service, the modified source has to be available to the people using it.

That is a deliberate choice and it has a limit worth stating plainly: the AGPL does not
forbid anyone from charging money. What it forbids is taking this work private. If you
want to use it commercially in a way the AGPL does not allow, ask.

## Layout

```
scripts/          data pipeline (Actions)
  sources/        HTTP fetch, one adapter per utility
  parsing/        HTML and announcement parsers
  registry/       accumulating city registry
  emit/           normalised JSON output
  notify/         subscriber directory, delivery log
src/lib/
  domain/         types, no I/O
  address/        folding an announcement's text and the register's onto each other
  text/           Cyrillic ↔ Latin, plurals
  time/           Serbian calendar, day grouping
  search/         city and street lookup
  components/     UI
src/routes/       home, /[city], /[city]/ulica/[street], error
data/rgz/         the Address Register, committed
data/fixtures/    one captured response per source, for the parser tests
worker/           Cloudflare Worker holding push subscriptions
static/data/      generated, committed
```

Adding a utility means adding one `OutageSource` implementation. Nothing else changes.

## Deployment

GitHub Pages, driven by `.github/workflows/refresh.yml`. Four jobs:

| job | runs on | does |
| --- | --- | --- |
| `build` | the schedule and pushes to `main` | tests the parsers, collects outages, builds the site |
| `deploy` | after `build` | publishes it to Pages |
| `notify` | the schedule only, after `deploy` | waits for the deployment to serve this build, sends pending notifications, commits the refreshed dataset back |
| `ledger` | after `build` | fails the run if a place name arrived that no register knows |

### Sending exactly once

Whether a reader has already been told about an outage is answered by
`static/data/notified.json`, a list of outage ids that lives in the repository. Four
things stand between that list and a reader hearing the same thing twice, and each of
them earned its place by failing.

**Only the schedule sends.** A code push has nothing to announce, and a push-triggered
run would send alongside the scheduled one — both reading the ledger before either
wrote to it. `build` and `deploy` still run on pushes, so the site stays current; only
`notify` is held back.

**One run at a time.** `concurrency: refresh` with `cancel-in-progress: false` keeps two
runs from overlapping however they were started.

**Never send what cannot be remembered.** Whatever was sent has to be written back, or
the next run sends it again. `persist-dataset.sh` retries a moved branch five times and
fails the job rather than passing quietly, so a run that announced something it could
not record is a red run rather than a silent repeat.

**The ledger is merged, not overwritten.** A run reads its ledger from the artifact its
own workflow built, which can be older than what is on the branch by the time it
finishes. `adopt-ledger.sh` unions it with the committed one before sending, and
`persist-dataset.sh` does the same again before committing — and, if the branch moved
under it, re-points at the new tip and retries. The freshly collected dataset wins; the
ledger is the union of both.

Delivery itself is recorded from the outcome, not from the intention. An outage is
written to the ledger when a card carrying it reached at least one subscriber, or when
no subscriber wanted it in the first place. A push that failed leaves it out, so the
next run tries again — which is why a dead push service costs a delay rather than a
silent miss.

### Linking into a deployment that exists

A notification links to the row it is about, so it can only be sent once the deployment
carrying that row is serving it. `notify` therefore `needs: deploy`, and `npm run
await:deploy` then polls `data/registry.json` on the live site until its `generatedAt`
matches the build, for up to ten minutes. Sending earlier pointed readers at a page that
told them the outage had been archived.

`notify` also takes the dataset as a workflow artifact from `build` rather than
collecting it again, so what is announced is exactly what was deployed.

### Configuration

One repository **variable** (Settings → Secrets and variables → Actions → Variables):

| variable | purpose |
| --- | --- |
| `SITE_ORIGIN` | where the site is served, e.g. `https://squirrelosopher.github.io/nemaleba` or `https://nemaleba.rs` |
| `API_ENDPOINT` | Worker origin, baked into the build |

`BASE_PATH`, `PUBLIC_BASE_PATH` and `PUBLIC_SITE_ORIGIN` are derived from `SITE_ORIGIN`
inside the job rather than set by hand: a project site is served under `/<repo>` and a
custom domain from the root, and the first two let the pre-paint locale redirect and the
asset paths work either way, while the last puts absolute URLs into `hreflang`, the link
previews and `sitemap.xml`.

The **secrets** are all optional — without them the site still builds, and the
notification button disables itself rather than failing on tap:

| secret | purpose |
| --- | --- |
| `PUBLIC_VAPID_KEY` | public push key, baked into the build |
| `VAPID_PRIVATE_KEY` | signs push payloads |
| `VAPID_SUBJECT` | `mailto:` contact for the push service |
| `PUSH_ADMIN_ORIGIN` / `PUSH_ADMIN_TOKEN` | lets the job read subscribers from the Worker |

The dataset is committed back by the workflow's own `GITHUB_TOKEN`, which needs
`contents: write` — already declared at the top of the workflow. Settings → Actions →
General → Workflow permissions must allow read and write for that to hold.

### Compute budget

Thirteen runs a day, not twenty-four, and the schedule says why: measured over the 225
announcements in `data/fixtures`, 07:00 and 08:00 local carry a third of the day and
nothing has ever been published between 23:00 and 05:00.

GitHub bills each job rounded up to the whole minute, and a run is four jobs, so the
arithmetic matters: roughly 390 runs a month against an allowance of 2,000 minutes on a
private repository. Public repositories are unmetered.

## Working on another machine

```
git clone git@github.com:squirrelosopher/nemaleba.git
cd nemaleba
npm install
npm run dev
```

That is enough to run and develop the site. The dataset is committed, so the app has
real data without touching any source.

Two Node versions are involved. The site builds on Node 20; Wrangler refuses to run on
anything below 22, so keep both available (`nvm install 20 && nvm install 22`) and switch
only for `worker/` commands.

### What is not in the repository

`.env` is gitignored and holds the push keys. Without it the notify button disables
itself and `npm run notify` skips, so everything else still works — you only need it to
develop notifications.

```
PUBLIC_API_ENDPOINT=/api
PUBLIC_VAPID_KEY=…
VAPID_PRIVATE_KEY=…
VAPID_SUBJECT=mailto:…
```

`PUBLIC_SITE_ORIGIN` and `PUBLIC_BASE_PATH` may be left empty locally. Without the first,
`hreflang`, the canonical link and the link-preview tags are simply omitted rather than
emitted with a wrong origin.

Recover the values from **Settings → Secrets and variables → Actions**. Secrets cannot be
read back once set, so if they are lost they have to be rotated — except the VAPID pair,
which cannot be (see below). Keep `PUBLIC_API_ENDPOINT=/api` locally so the dev server's
own endpoint is used rather than the deployed Worker.

`worker/.admin-token` is also gitignored and is the same value as the
`PUSH_ADMIN_TOKEN` variable, so it can be recovered the same way.

Do not generate fresh VAPID keys to replace lost ones. Every existing subscription is
encrypted against the old public key, so replacing them silently orphans every
subscriber.

### Where the pieces live

| thing | where |
| --- | --- |
| repository and CI | github.com/squirrelosopher/nemaleba |
| site | GitHub Pages, published by the `deploy` job |
| refresh schedule | the two crons in `.github/workflows/refresh.yml` |
| push subscriptions | Cloudflare Worker `nemaleba-push` + D1 `nemaleba-subscriptions` |
| secrets | GitHub Actions secrets; `ADMIN_TOKEN` also a Wrangler secret |

## Commands

```
npm run data        collect and write static/data
npm run notify      push new outages to subscribers
npm run await:deploy  wait until Pages serves the build just made (CI only)
npm run dev         dev server, incl. local /api/push/subscribe
npm run build       static build into build/
npm run push:keys   generate VAPID keys
npm run push:test   send one notification to local subscribers
```

In `npm run dev`, appending `?fail` to any city URL makes its load throw, so the generic
error page can be looked at: `http://localhost:5173/kragujevac/?fail`. A URL for a place
that does not exist gives the 404 page instead.

## Locale and prerendering

The locale lives in the URL, so the markup that arrives is already in the right language
and nothing is corrected after it is on screen.

| URL | locale |
| --- | --- |
| `/aleksinac` | Serbian Latin, canonical, indexed |
| `/sr-cyr/aleksinac` | Serbian Cyrillic, indexed |
| `/en/aleksinac` | English, indexed |

`/sr-lat/aleksinac` was prerendered too, as a byte-identical copy of the bare URL whose
canonical pointed back at it. Nothing in the site linked to it -- `localePath` returns the
bare path for Latin, so both the locale toggle and the `hreflang` tags point there -- and
crawlers were told to ignore it, so it was a quarter of the build serving nobody.
`static/_redirects` sends it to the canonical instead, which is a better answer than a
copy for the only reader it ever had: someone who typed the prefix.

Latin is served bare because it is what most people type into a search box. `src/params/locale.ts`
keeps a city slug from being read as a locale, `src/lib/i18n/routing.ts` builds links that
keep whichever form the reader arrived on, and `src/hooks.server.ts` resolves the `lang`
attribute while the page is generated, since it sits above anything Svelte renders.

A reader who chose a locale earlier and then opens a bare URL is redirected to their
prefix by the inline script in `app.html`, before the first paint. A URL that names a
locale always outranks the stored choice, which also makes a redirect loop impossible.

This replaced an earlier approach that prerendered only Latin and hid the page until
hydration could correct it. That was a race: it cost non-default readers a blank page on a
cold load, and it left the other two languages invisible to crawlers.

Every page exists in all three forms, so `prerender.entries` in `svelte.config.js` is
built from the city list rather than crawled — roughly 790 pages, about half a minute.

## What is prerendered, and what is not

The rule is: prerender what strangers arrive at, serve dynamically what readers navigate
to.

| level | count | prerendered |
| --- | --- | --- |
| city or municipality | 130 × 3 locales | yes |
| `/{city}/komentari` | 130 × 3 | yes |
| street | 58,947 | no |

A shared `/nis/` link previews with an `og:` title and a description carrying live outage
counts, and WhatsApp, Viber and Facebook do not execute JavaScript; those group chats are
how this site travels. Google ranks the same pages for "nema struje &lt;city&gt;". Both
arguments are about *strangers*, and neither applies to a street: a reader reaches
`/{city}/ulica/{street}` by typing in the search box, which is a client-side navigation
with the dataset already in hand, so the page costs nothing to render there and 58,947 ×
3 would be 176,841 files.

`export const prerender = false` on that route puts it behind the SPA fallback:
`adapter-static` writes `404.html`, GitHub Pages serves it for any unknown path, and the
app routes itself from the URL.

The status line is the one thing that does not come out right. GitHub Pages has no
redirects file, so a street page renders correctly but answers `404`. Nothing depends on
it — street pages are absent from the sitemap and are reached from the site's own search
— and `static/_redirects` records the rule that would fix it on a host that reads one.

`static/.nojekyll` is required and easy to lose: without it GitHub Pages runs the output
through Jekyll, which drops directories beginning with an underscore, and `build/_app`
holds every script and stylesheet the site has.

The comments pages are 26 MB of a 59 MB build and their content comes from the Worker at
runtime, so they look like the next thing to drop. They are not, yet: `+layout.ts` awaits
`registry.json` before even the header can paint, so unprerendering them today buys disk
and costs a blank screen on every cold load. The change worth making first is deferring
that load, which would speed up every page.

## Street search

`static/data/streets/` is the register's street list, sharded on the first letter of the
slug — 33 files, 2.5 MB in total, the largest 268 KB. A reader's first keystroke names
the file, so nothing is fetched until they type and nothing is fetched twice. The slug
folds both scripts onto the same letters, so `beogradska` and `Београдска` ask for the
same shard, which is what the city search already relied on.

Written by `scripts/emit/streetIndex.ts` on every run rather than imported once, so a
municipality that gains a page gains its streets with it. A street whose municipality has
no page is left out: 58,947 of the register's 71,221 are offered, and a search result that
leads nowhere is worse than one that is missing.

A street name is rarely unique — Београдска is in dozens of municipalities — so a result
row names the place as well, and the city is the tie-break in the ordering rather than
whatever order the register happened to be walked in.

The street page answers one question, and says so outright when the answer is nothing.
An announcement that describes its area without naming a street cannot be attributed to
one, so "no announcement names this street" is printed with the reason beside it and a
link to everything the city has. A reader who read silence there as "nothing is wrong"
would have been misled by us.

## Source health

`npm run data` records how many entries each source produced in
`static/data/sources.json`. If a source that has produced entries before returns none,
the run exits non-zero and publishes nothing.

That case is almost always a broken parser rather than a quiet day, and publishing it
would tell every visitor their power is fine — the worst way for this site to be wrong.
Set `ALLOW_EMPTY_SOURCES=1` to publish anyway when the silence is genuine.

## Preferences and subscription state

Language (`nemaleba:locale`), theme (`nemaleba:theme`) and the subscribed-city cache
(`nemaleba:cities`) live in `localStorage`. No cookies, nothing sent to a server.

Subscription state is *not* trusted from `localStorage`. On mount the button reads the
cache for an instant render, then reconciles against the server: it takes the browser's
`PushSubscription` endpoint and asks `GET /cities?endpoint=…` which cities that endpoint is
registered for. Clearing site data therefore cannot leave someone subscribed with no way
to opt out.

## Push notifications

Subscriptions live in a Cloudflare Worker backed by D1; the site itself stays static.
Actions reads subscribers over a token-protected endpoint and sends VAPID-signed pushes.

```
cd worker
npx wrangler login
npx wrangler d1 create nemaleba-subscriptions     # put the id in wrangler.toml
npx wrangler d1 migrations apply nemaleba-subscriptions --remote
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

Wrangler needs Node 22 or newer, which is ahead of what the site itself builds on.

Schema changes live in `worker/migrations` and are named `vMAJOR.MINOR.PATCH__what.sql`.
Wrangler applies the ones a database has not seen and records them in a `d1_migrations`
table, so `migrations apply` is safe to run repeatedly and says what is outstanding:

```
npx wrangler d1 migrations list nemaleba-subscriptions --remote
```

Nothing applies them for you. No CI job touches the Worker or the database, so a schema
change is a deliberate step taken before the deploy that depends on it.

There is one migration, and it describes the whole schema. It was four — an init and three
follow-ups that added the comments table, `comments.address_hash` and
`user_preferences.notify_grouped` — collapsed on the move to GitHub, while no database
outside development had anything worth keeping. A database migrated through the four has
the same tables, columns, types and defaults; only the column *order* differs, since
`ALTER TABLE` appends, and nothing reads a column by position.

From here on, write each migration as a new file rather than editing an earlier one.
`v1.0.0__init.sql` is all `CREATE TABLE IF NOT EXISTS`, which is safe to re-run but cannot
alter a table that already exists — adding a column to a live table needs its own
`ALTER TABLE` migration.

`ALLOWED_ORIGIN` is a comma separated list, so the Pages URL and the custom domain can
both call the Worker without a redeploy between them. A newly created workers.dev
subdomain serves TLS handshake failures for a minute or two while its certificate is
issued; that is not a misconfiguration.

Then set `PUBLIC_API_ENDPOINT` and `PUBLIC_VAPID_KEY` at build time, and
`VAPID_PRIVATE_KEY`, `PUSH_ADMIN_ORIGIN`, `PUSH_ADMIN_TOKEN` as Actions secrets.

Locally, `npm run dev` serves the same routes under `/api` and stores state in
`.cache/`, so both push and confirmations work without Cloudflare.

### Where a notification opens

`notify_grouped`, off by default, and shown as *Group notifications* on the notifications
page, decides how many cards a run becomes and therefore where each can land. The control
disables itself while neither utility is being notified about, since nothing then arrives
for grouping to shape.

| card | opens |
| --- | --- |
| grouped | `/obavestenja/` |
| one city, one outage | `/{city}?outage={id}` |
| one city, several outages | `/{city}?utility={electricity\|water}`, bare when it covers both |
| any entry in the list | `/{city}?outage={id}` |

Grouped, the single card opens the list. Always, including the runs that happen to touch
only one city — a reader who asked for one card asked for one place to read them, and
choosing by how many cities the weather produced would make where it lands unpredictable.

Ungrouped, one card per city. A city with one outage opens that outage's row, since there
is no ambiguity about which row is meant. A city with several opens the city, because
none of its rows is the one the card is about: landing on one of five, with the other
four reachable only by scrolling back out of it, is the wrong promise.

Whatever shape the card took, the notifications list receives one entry per outage and
every entry points at its own row. That is the payload's `entries` array, which does not
change with the setting — except for a single-outage card, which carries no `entries` and
is remembered as itself. Its own url is therefore also the list's link to that row, and
pointing it at the city once cost the list its only way back to the row.

A single outage also keeps its detail in the card — the time and the streets — since that
is what can be read without unlocking anything.

`?outage={id}` makes the city page open that outage's utility, expand the history if the
outage has already passed, scroll its row into view and blink it three times in that
utility's accent. An id matching nothing — a stale entry after the source edited its
announcement, since ids are content hashes — makes the page look again at the source
before saying anything, and only then report it archived.

Cards are tagged `nemaleba-{city}-{today}`, or `nemaleba-digest-{today}` when grouped, so
a later hour replaces that card rather than stacking a second one beside it. The service
worker therefore has to `navigate()` a tab it finds already open on the city instead of
only focusing it, or a second notification would land where the first one pointed.

## Comments

Anonymous, one municipality at a time, kept for twenty-four hours. `GET /comments?city=`
filters to that window and sorts newest first, so the list is right whether or not the
hourly prune has run; the Worker's `scheduled` handler only keeps the table small.

The author is a truncated hash of `COMMENT_SALT`, the connecting address and a token the
browser keeps in `localStorage`. Address alone would misfire, since Serbian mobile
carriers put whole neighbourhoods behind one address. The raw address is never stored, and
a missing salt makes the Worker refuse comments rather than hash with nothing.

A second hash covers the address on its own. The author hash carries a token the caller
supplies, so clearing site data mints a new one and the allowance starts over; that is
what makes it usable behind a shared address, and it is also why it cannot be the only
thing counted. The address hash carries nothing the caller chooses.

`COMMENT_SALT` is a Worker **secret**, not a `vars` entry:

```
cd worker
npx wrangler secret put COMMENT_SALT
npx wrangler d1 migrations apply nemaleba-subscriptions --remote
npx wrangler deploy
```

Two comments an hour per author and ten per address, both enforced inside the insert
itself — counting first and inserting after let a burst of concurrent posts all read zero
and all land. The wider figure is what a household or a small office would reach in an
hour rather than what one person would. Comments
containing a URL are refused outright, which is where nearly all spam carries its payload.

Locally the dev server mirrors both endpoints and stores them in `.cache/comments.json`,
so nothing reaches the deployed Worker. There is no administrative delete yet: removing a
comment early means `wrangler d1 execute`.

## Outage history

`registry.json` carries the national daily totals and each city file carries its own. The
hourly run rewrites the entry for today and leaves earlier days alone, so a day freezes
once the date rolls over. Thirty days are kept and seven are drawn. Sources publish only
what is current and announced, so nothing about a past day can be recovered later — the
record starts the first time the pipeline runs with this code.

## Sitemap and robots

Both are written by the pipeline, which already knows every city, and both are gitignored
as generated output. The sitemap lists the bare Latin URLs plus `/sr-cyr` and `/en`; the
Latin alias is left out because it points back at the bare URL, and the notification pages
are excluded as private to the reader.

## Confirmations (backend only, UI removed)

The report control was removed from the UI. The Worker routes and the `confirmations`
table remain, so re-enabling means re-adding the client component — nothing server-side
needs rebuilding.

Votes are keyed by outage id and an anonymous voter id generated in the browser
(`nemaleba:voter`), stored in the same D1 database.

Counts are shared: the number comes from `COUNT(*)` over all voters in D1, so every
visitor sees the same value. `localStorage` holds only the anonymous voter id, never the
count. **This requires the Worker to be deployed** — with no reachable API the buttons
disable themselves rather than silently failing.

Two further caveats:

- Outage ids are content hashes of the source text. If a utility edits an announcement,
  the id changes and its confirmations no longer match.
- An anonymous voter id only stops casual double-voting. It is not abuse-proof; add
  IP-based rate limiting in the Worker (`CF-Connecting-IP`) before promoting the counts
  to anything load-bearing.

| Route | Purpose |
| --- | --- |
| `POST /push/subscribe` | store or clear a push subscription |
| `GET /push/cities` | cities an endpoint is subscribed to |
| `GET /subscribers` | token-protected, used by Actions to fan out |
| `GET /confirmations` | counts for a batch of outage ids |
| `POST /confirm` | toggle one confirmation |

iOS delivers web push only to PWAs added to the Home Screen. Desktop needs the browser
process alive; Android does not.
