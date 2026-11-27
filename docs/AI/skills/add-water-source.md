# Skill: Add or repair a utility source

- **Trigger:** adding a water or electricity utility; repairing a source that went
  `unreadable` or regressed to 0; changing a parser in `scripts/parsing/`; capturing or
  refreshing a fixture.
- **Required context:** `PROJECT_CONTEXT.md` §4 (silence, host versus parser failure,
  fixtures, attribution), `CONTRIBUTING.md` "Adding a water utility", README "Data sources"
  and "Source health".
- **Reference implementations:** `scripts/sources/vodovodRuma.ts` (WordPress posts plus one
  parser); `scripts/sources/bvkBeograd.ts` (HTML pages, two `OutageKind`s).
- **User agent:** every source fetches through `scripts/sources/httpClient.ts`, which sends a
  browser user agent (see the comment there). The README and `CONTRIBUTING.md` still describe
  a per-source `BROWSER_USER_AGENT` exception, which no longer exists.

## Steps

1. **Find the source.** Candidates come from the member directory at
   udruzenjevodovoda.org/clanovi; domains follow no pattern. Prefer `/wp-json/wp/v2/posts`
   with the category that actually holds outages. Reject a feed that publishes images only,
   has stopped, or mixes outages into a general news category without a reliable title
   filter. Record which feed you chose and why.
2. **Check what the host answers** to the browser agent in `httpClient.ts`, from a normal
   connection. If it serves an HTML challenge instead of JSON, that is a firewall: it will
   show up as `unreadable` from CI. Record it, and do not try to work around bot protection.
3. **Write `scripts/sources/<name>.ts`** implementing `OutageSource`: `id`, `utility`,
   `label` and a `Provider` with phone, url and `coverage` (city ids, or `national`). Fetch
   through `httpClient` / `wordPressPosts`, so that a host failure raises
   `SourceUnreachable`. Set `silenceIsExpected` only for a source that genuinely and
   regularly publishes nothing.
4. **Parse.** Reuse `waterProse.ts`, `vikAnnouncement.ts` or `waterInterruption.ts` before
   writing a new parser. A parser must never guess. When it cannot read a place, a time or a
   street with certainty, it leaves the field empty and keeps the announcement text in
   `note`, rather than inventing a value.
5. **Register it** in `SOURCES` in `scripts/pipeline.ts`. If the city appears in
   `src/lib/domain/waterUtilities.ts`, remove it there: the provider now carries the contact.
6. **Capture a fixture.** Add the URL to `CAPTURES` in `scripts/dev/captureFixtures.ts` and
   run `npm run fixtures`, which captures through the same `httpClient`. It rewrites every
   fixture, so keep only the new or changed one in the diff.
7. **Test.** Add a case to `CASES` in `scripts/parsing/parsers.test.ts` and run `npm test`.
   Review the new snapshot digest (count, first and last row) by eye before accepting it.
   For a repair, show that the case fails against the old parser first.
8. **Check place matching.** Unknown place names fail the `ledger` CI job
   (`static/data/unknown-places.json`). If the source uses spellings the register does not
   know, handle them in `scripts/registry/unknownPlaces.ts` / `rgzPlaces.ts` or
   `scripts/parsing/serbianPlaces.ts`.
   Never silence the check.
9. **Optionally, check live:** `npm run data`, then inspect only your source's lines and
   `static/data/sources.json`. Leave the regenerated `static/data/` out of the change.
10. **Document.** Add a row to the README "Data sources" table and a sentence for anything
   unusual about the source (agent, categories, title filter).

## Verification

- `npm test`: the new case passes, with a reviewed snapshot.
- `npm run check`: no errors.
- For a repair: the regression is shown failing before the fix.
- Live behaviour (step 9) is recorded as live evidence, with the date. It is not repeatable
  proof.
