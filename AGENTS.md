# AGENTS.md: working rules for AI agents

These rules apply to every AI agent working in this repository (Claude Code, Codex, others).
`PROJECT_CONTEXT.md` is the architectural law. Read it at session start, unless your
platform has already loaded it (Claude Code imports it through `CLAUDE.md`). Platform files
add tool-specific behaviour only:

| Platform | Rules | Loading |
|---|---|---|
| Claude Code | `CLAUDE.md` | Loaded automatically; it imports `PROJECT_CONTEXT.md` and this file. |
| Codex | this file | Loaded automatically. Read `PROJECT_CONTEXT.md` explicitly. |
| Others | this file + `PROJECT_CONTEXT.md` | Read both explicitly. Do not assume automatic loading. |

**Tradeoff:** these rules favour caution over speed. For a trivial, explicitly scoped patch,
use judgment and say which parts you are skipping.

---

## 1. Areas of the codebase

This is a one-person project, so there are no separate domain roles. The repository still
has four areas with different risks. Name the area or areas in every plan, and when a change
crosses areas, state the contract between them.

| Area | Paths | Main risk |
|---|---|---|
| Pipeline | `scripts/` except `ci/`, `data/` | A wrong or silent row shown as "nothing is wrong" |
| Site | `src/`, `static/` except `static/data/`, `svelte.config.js`, `vite.config.ts` | Prerender, locale and link-preview regressions; slow cold load |
| Worker | `worker/` | Live subscriber and comment data; migrations applied by hand |
| CI / delivery | `.github/workflows/`, `scripts/ci/`, `scripts/notify*` | Duplicate or lost notifications, broken hourly publish |

## 2. Think before coding

- State your assumptions. If several interpretations exist, present them; do not pick one
  silently. If a simpler approach exists, say so.
- Read the README section that explains a behaviour before you change it. Most "odd" code
  here is a deliberate answer to a past incident, and its comment says which one.
- Never trade correctness of what readers see for speed of delivery. Re-read
  `PROJECT_CONTEXT.md` §4.

## 3. Simplicity and surgical changes

- Write the minimum code that solves the problem: no speculative features, abstractions,
  configuration or error handling for impossible cases.
- Touch only what the task needs. Do not reformat, rename or "improve" adjacent code.
  Mention unrelated problems instead of fixing them.
- Match the existing style: naming, file layout, the comment voice and the commit message
  style (`PROJECT_CONTEXT.md` §5).
- Remove what your change orphaned; leave existing dead code alone.
- Never leave placeholders (`// TODO implement`, `// ... existing code ...`).

## 4. Navigation and context budget

- README's **Layout** section and `PROJECT_CONTEXT.md` §3 are the feature map. Start from
  the paths named there, then follow imports. Do not read whole directories.
- **Do not grep or read generated and bulk data broadly:** `static/data/` (about 200 files,
  rewritten hourly), `data/rgz/` (the register, megabytes), `data/fixtures/`, `build/`,
  `.svelte-kit/`, `node_modules/`. Open a specific file only when the task needs it.
- Recursive search skips Git-ignored files (`.env`, `.cache/`, `local/`,
  `worker/.admin-token`). Not finding a string is not proof that it is absent.

## 5. Task workflow

Anything beyond a one-line patch is a **task** with a plan.

- **Branch:** `<type>/<slug>`, or `<type>/<issue>-<slug>` when a GitHub issue exists. The
  type is `feature`, `fix`, `chore` or `docs`; the slug is short kebab-case English.
- **Task directory:** `local/tasks/<branch>/`, Git-ignored and never published. It holds:
  - `implementation-plan.md`: goal, acceptance criteria, out of scope, areas touched,
    applicable contracts (`PROJECT_CONTEXT.md` §4), atomic steps (each with files,
    verification and risk), verification commands, assumptions and open decisions.
  - `review-notes.md`: review feedback and its resolution (Implemented / Already satisfied
    / Declined with rationale / Deferred / Unresolved).
  - `implementation-report.md`, `lessons-learned.md` and `handoff.md`, written at closeout.
- **Kickoff:** `docs/AI/AI_task_start.md`. **Resume:** `docs/AI/AI_resume_session.md`.
  **Closeout:** `docs/AI/AI_End-of-Session_Prompt.md`.
- After the plan, stop and wait for approval when approval was requested. Plan approval then
  covers its scope; do not ask again for each step.

## 6. Stop and ask

Ask **one** concise decision question when a request conflicts with a §4 contract, would
change what readers see when data is missing, touches notification delivery or the
ledger, changes the Worker schema or a live secret, or has no acceptance criteria while
several incompatible designs are viable. For minor ambiguity, make a conservative assumption
and record it in the plan. Do not offer a menu of unrelated alternatives.

## 7. Verification

| Check | Command | Notes |
|---|---|---|
| Unit and parser tests | `npm test` | Fast (< 1 s); runs parsers against `data/fixtures/` |
| Types and Svelte | `npm run check` | Needs `.env` (copy `.env.example`; values may stay empty) |
| Build | `npm run build` | Prerenders about 790 pages into `build/` |
| UI | `npm run dev` → http://localhost:5173 | `?fail` on a city URL shows the error page |
| Live collection | `npm run data` | **Hits 18 live utility sites and rewrites `static/data/`**. Run it only when the task needs live behaviour, and keep its output out of the change. |

Evidence rules:

- Report actual outcomes. A green result needs a command that ran: it exited 0 and executed
  tests. A compile is not proof of behaviour.
- A missing network, credential or service makes a check **blocked**, not passed. Never skip,
  delete or weaken a test or assertion to get green.
- **Prove a new guard can fail:** a regression test for a specific defect must be shown
  failing against the old behaviour before it counts as coverage.
- Fixture-based parser tests are the only check that sees a wrong row. Any parser change
  needs a fixture case.
- After review fixes, rerun the affected checks, and keep earlier results apart from current
  ones. Report pre-existing failures separately.
- Never run `npm run notify`, `npm run push:test` against real subscribers, `wrangler deploy`
  or `wrangler d1 migrations apply --remote` unless explicitly asked in this session.

## 8. Git boundary

- **The user owns commits, pushes, PRs and merges** unless they delegate them explicitly in
  the current session. Delegation recorded in an old handoff must be re-confirmed. Read-only
  git (`status`, `diff`, `log`, `show`) is always fine.
- The repository's local identity is `squirrelosopher <squirrelosopher@gmail.com>` with the
  `id_ed25519_github_squirrelosopher` key (`.git/config`). Never change it, and never commit
  under another identity.
- `nemaleba-bot` pushes `Refresh outage data [skip ci]` to `main` up to 13 times a day. When a
  push is delegated, fetch and rebase onto `origin/main` first. Never force-push `main`. A push
  to `main` triggers build and deploy (not notify) unless the message says `[skip ci]`.
- When committing, list paths explicitly. Never commit `static/data/**` from a local run, and
  never commit `.env`, tokens or `local/`.

## 9. Public repository and secrets

Everything tracked is public on GitHub. Never write secrets, tokens, subscriber data or
private notes into tracked files. `local/` is ignored, so internal notes go there. A shared
handoff under `docs/AI/handoff/` must be fit for publication (see its README).

## 10. Session knowledge and closeout

At a checkpoint or at the end of a task, apply `docs/AI/AI_End-of-Session_Prompt.md`: refresh
`implementation-report.md` and `lessons-learned.md`, **always** refresh `handoff.md`, and
reconcile `review-notes.md`. Route durable knowledge to one primary source:

| Knowledge | Goes to |
|---|---|
| Architecture, contracts, known debt | `PROJECT_CONTEXT.md` |
| Agent working rules for all platforms | `AGENTS.md` |
| Claude Code-only behaviour | `CLAUDE.md` |
| Design decision and rationale for a feature | the matching `README.md` section |
| Contributor procedure | `CONTRIBUTING.md` |
| Repeatable agent procedure | `docs/AI/skills/<slug>.md`, listed in §11 |
| Continuation context another machine needs | `docs/AI/handoff/<slug>.md` (public) |
| Everything task-local | `local/tasks/<branch>/` |

General documents (`PROJECT_CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`,
`CONTRIBUTING.md`) receive exact proposals unless the user authorised applying them.

## 11. Procedures (SOPs)

Open an SOP only when its trigger matches the task.

| Trigger | SOP |
|---|---|
| Adding or repairing a water (or electricity) source, a parser or a fixture | `docs/AI/skills/add-water-source.md` |

If no trigger matches, say so and follow the nearest existing pattern.

## 12. Output format

- **Plans:** concise markdown with numbered atomic steps, each giving files, verification and
  risk, plus assumptions and out-of-scope items.
- **Implementation summaries:** changed files, the behaviour delivered, the verification
  commands with their actual results, and remaining risks.
- **Blockers:** one short paragraph stating the conflict, then one decision question.

Keep chat output tight. Long artifacts belong in the task directory.
