# Shared handoffs

A handoff in this directory lets a task continue on another machine or in a fresh checkout,
where the ignored `local/tasks/` notes do not exist. **This repository is public**, so
everything here is published.

## When to write one

- When the work will continue somewhere `local/` is not available.
- When approved or pending documentation proposals would otherwise exist only in `local/`.

Otherwise, the local `local/tasks/<branch>/handoff.md` is enough.

## Rules

- Name the file `<slug>.md`, matching the branch slug. Update it in place; do not create
  dated copies.
- Make it publication-safe: no secrets, tokens, VAPID or admin values, subscriber endpoints,
  comment content, private hostnames or personal notes.
- Make it self-contained: it must not depend on files under `local/`.
- Mark the status on the first line: `Continuation required` or `Complete — reference for
  future sessions`.
- Verify the state again before you rely on a handoff. A recorded result is history, not
  evidence for the current code.

## Template

```markdown
# <Task title>

**Status:** Continuation required | Complete — reference for future sessions
**Branch:** `<type>/<slug>` · **HEAD:** <sha> (pushed / not pushed) · **Issue:** #<n> / none
**Updated:** YYYY-MM-DD

## Goal and current state
<2–3 sentences>

## Decisions
- <decision> — <why> (approved by the user / assumption)

## Verification
- `<command>` — <result>, against <sha or working tree>
- Not run: <check> — <why>

## Next actions
1. <action> — <authorisation needed>

## Pending documentation proposals
- GP-<slug>-1 — <file, heading>: <exact text> — Proposed
```
