# CLAUDE.md: Claude Code operating guidelines

Claude Code loads this file at session start, together with these imports:

@PROJECT_CONTEXT.md
@AGENTS.md

`PROJECT_CONTEXT.md` is the architectural law and `AGENTS.md` holds the working rules shared
with Codex. This file adds only Claude Code-specific behaviour. If an import did not load
(check with `/memory`), say so rather than proceeding on memory of what it usually says.

**Import caution:** `@path` inside this file is an import directive. Elsewhere, refer to
documents by plain path (`docs/AI/...`), never with `@`.

---

## 1. Before writing code

Confirm these four things:

1. The area or areas touched (`AGENTS.md` §1) and whether the change crosses areas.
2. The `PROJECT_CONTEXT.md` §4 contracts that apply.
3. The matching SOP (`AGENTS.md` §11), or say explicitly that none matches.
4. The task directory and branch, for anything beyond a one-line patch (`AGENTS.md` §5).

Do not write implementation code before the plan step unless the user asks for an immediate
patch.

## 2. Planning and progress

- Use plan mode, or an explicit plan turn, for any non-trivial change. Save the approved
  plan to `local/tasks/<branch>/implementation-plan.md`.
- Track multi-step execution with the session's task list tool, so progress is visible.

## 3. Navigation and subagents

- For a known file or symbol, use `Read` or `Grep` with a targeted pattern. Do not delegate.
- For "where does X live" across unfamiliar code, delegate to the `Explore` subagent. Ask it
  for paths and excerpts, not for a design opinion.
- Exclude `static/data/`, `data/rgz/`, `data/fixtures/`, `build/` and `.svelte-kit/` from
  broad searches (`AGENTS.md` §4).
- **Token budget:** every turn re-reads the whole context. Delegate mechanical, well-specified
  work (bulk edits, reading many fixtures) to a subagent with a tight brief, and keep design
  decisions and review of risky diffs in the main session. Run at most two agents at once,
  never two on the same files. After a long pause, brief a fresh agent from the handoff file
  rather than resuming a large one.

## 4. Verifying UI changes

A change that the dev server renders is verified in the browser, not only by `npm run check`:

- Start the dev server through the preview tool (`.claude/launch.json`, name `site`). Never
  start it from Bash.
- Check the affected page in all three locale forms (bare Latin, `/sr-cyr`, `/en`), plus
  light and dark mode and phone width when layout changed.
- Read console errors. For a data-loading change, also load a city page whose source is
  currently unreadable or empty, because that empty state is where this site fails readers.
- Share a screenshot as proof.

For pipeline changes, the evidence is `npm test` with a fixture case. Run `npm run data` only
under `AGENTS.md` §7.

## 5. Memory

Project knowledge belongs in this repository's documents (`AGENTS.md` §10), not in Claude's
auto-memory. Auto-memory may keep only a pointer to the project and user preferences that are
not repository facts.

## 6. Default new-session behaviour

1. Confirm the loaded context. If a handoff exists, follow `docs/AI/AI_resume_session.md`.
2. Classify the task: area, contracts, SOP.
3. Read the smallest relevant slice.
4. Write the plan, and stop for approval when requested.
5. Implement the approved scope with surgical diffs.
6. Verify, and report actual outcomes.
7. Close out with `docs/AI/AI_End-of-Session_Prompt.md`, always refreshing `handoff.md`.

---

**These guidelines are working if** diffs contain no unnecessary changes, blocked checks are
reported rather than hidden, empty or unreadable data is never shown as "nothing is wrong",
and clarifying questions arrive before implementation, not after the mistake.
