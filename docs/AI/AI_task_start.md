# Start a task

Paste this prompt with the fields filled in. Fields left empty are derived where the rules
allow it, and marked unknown otherwise.

**Goal:** [What should be true when this is done, in one or two sentences]
**Acceptance criteria:** [Observable outcomes; or "derive and propose"]
**Out of scope:** [Explicit exclusions; or "none stated"]
**GitHub issue:** [#number / none]
**Branch:** [`<type>/<slug>`; or "propose one"]
**Approval gate:** [Stop after the plan / Proceed after the plan; default: stop after the plan]
**Repository actions:** [None delegated / commit / commit + push / commit + push + PR; default: none delegated]

## Steps

1. **Load context.** Confirm that `PROJECT_CONTEXT.md` and `AGENTS.md` are loaded (Claude
   Code imports them; other platforms read them now). Check `local/tasks/` and
   `docs/AI/handoff/` for an existing task with this goal. If one exists, switch to
   `docs/AI/AI_resume_session.md` instead of starting over.
2. **Classify.** Name the areas touched (`AGENTS.md` §1), the applicable contracts
   (`PROJECT_CONTEXT.md` §4) and the matching SOP (`AGENTS.md` §11), or state that none
   matches.
3. **Repository state.** Report the current branch, HEAD, the distance from `origin/main` (the
   bot pushes hourly) and any working-tree changes. Unrelated changes stay untouched.
4. **Branch and directory.** This prompt authorises creating the task branch from an
   up-to-date `origin/main` and the directory `local/tasks/<branch>/`, nothing more. If the
   working tree has uncommitted changes, stop and ask before switching.
5. **Read the slice.** Read the smallest set of files that explains the behaviour, plus the
   matching README section.
6. **Plan.** Write `local/tasks/<branch>/implementation-plan.md` with:
   - a metadata header: goal, issue, branch, date, platform;
   - acceptance criteria and out-of-scope items;
   - areas and applicable contracts;
   - numbered atomic steps, each giving its files, verification and risk;
   - verification commands, and how each one proves a criterion;
   - assumptions, open decisions and environment prerequisites.
7. **Gate.** Present a short plan summary in chat. Stop if the approval gate says so.
8. **Implement and verify.** Follow the plan with surgical diffs, and verify under
   `AGENTS.md` §7 (and `CLAUDE.md` §4 for UI). Record deviations from the plan, and why, in
   the plan itself.
9. **Deliver.** Take only the delegated repository actions. Draft commit messages in the
   repository's style (`PROJECT_CONTEXT.md` §5).
10. **Close out** with `docs/AI/AI_End-of-Session_Prompt.md`.
