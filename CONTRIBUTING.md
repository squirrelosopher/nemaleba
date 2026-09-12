# Contributing

The useful contributions here are rarely about the website. They are about reading what a
utility publishes, and there are around a hundred and fifty utilities in Serbia that this
site does not read yet.

```
git clone git@github.com:squirrelosopher/nemaleba.git
cd nemaleba
npm install
npm run dev
```

Copy `.env.example` to `.env` before running `npm run check`: the public variables have to
exist for `$env/static/public` to declare them, though they can be left empty. Nothing
else needs them — the push keys only matter if you are working on notifications.

The dataset is committed, so the site has real data without touching any source. Node 20
builds the site; Wrangler refuses to run on anything below 22, so keep both available and
switch only for `worker/` commands.

## Adding a water utility

Nearly all of it is one file. `OutageSource` is the whole contract — an id, a utility, a
label, a `Provider` carrying the phone number and coverage, and a `collect()` that returns
rows. Nothing else changes.

1. Find the source. Candidates come from the industry body's member directory at
   [udruzenjevodovoda.org/clanovi](https://udruzenjevodovoda.org/clanovi), which is the
   only reliable list; the domains follow no pattern. Eleven of the members answer on
   `/wp-json/wp/v2/posts`, which is the easiest shape to read.
2. Write `scripts/sources/<name>.ts` implementing `OutageSource`, and a parser under
   `scripts/parsing/` if the announcements need one. Several existing parsers
   (`waterProse.ts`, `vikAnnouncement.ts`) already handle common shapes.
3. Add it to `SOURCES` in `scripts/pipeline.ts`.
4. Capture a fixture: add the URL to `scripts/dev/captureFixtures.ts` and run
   `npm run fixtures`. Capture under the same user agent the source really sends —
   four of them answer the collector's own agent with an error and a browser one with the
   page.
5. Add a case to `scripts/parsing/parsers.test.ts` and run `npm test`.

A source without a fixture is a source nobody can change safely. The parser tests are the
only check that catches a parser quietly changing its mind, because the source-health
check counts rows rather than reading them — and a wrong row counts the same as a right
one.

## What makes a change hard to accept

**Saying more than the data supports.** The site's failure mode is not showing a wrong
row, it is showing silence that a reader takes for "nothing is wrong". A parser that
guesses, a match that is probably right, a subscription that fires most of the time —
each of those tells somebody their water is on when it is off. Where precision cannot be
had, the page says so in words.

**Claims that were not measured.** Most of the numbers in the README came from measuring
the committed dataset, and several of them overturned what seemed obvious: settlement
matching looked like 56% and was 26% once matches against the town's own name were
refused. If you are asserting a rate, measure it.

**Parsing without a fixture**, for the reason above.

## Reporting a wrong phone number

`src/lib/domain/waterUtilities.ts` was assembled by hand from utilities' own pages.
Numbers change and some were never published as a fault line at all. An issue naming the
municipality and where you found the correct number is enough.

## Style

`.claude/CLAUDE.md` is not here, but the code follows a few rules worth knowing: no magic
values, early returns over nesting, `{}` on every `if`, comments that say what a block does
and why rather than how, and no documentation comments on methods — the signature carries
the contract.

Commit subjects are imperative and under fifty characters; the body explains what and why,
never how.
