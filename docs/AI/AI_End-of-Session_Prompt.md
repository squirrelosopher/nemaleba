# Session closeout: Checkpoint or Final

Preserve the session's decisions, rationale, changes, mistakes, corrections and reusable
procedures, so that the next session (on this machine or another) continues accurately and
does not repeat mistakes.

**Mode:** [Checkpoint / Final; default: Checkpoint]
**Branch:** [Exact task branch]
**Task directory:** [`local/tasks/<branch>/`]
**Shared handoff:** [None / `docs/AI/handoff/<slug>.md`; default: none, unless continuation on another machine is needed]
**General documentation:** [Propose / Apply authorised changes; default: Propose]

Checkpoint means a stage ended and work may continue. Final means the user intends to close
the task. Neither establishes that the work is complete, tested, reviewed or merged.

## Evidence and scope

- Re-derive the branch, HEAD, base (`origin/main`) and working-tree state. Separate task
  changes from unrelated ones and from bot data commits.
- Use the chat, the task artifacts, the approved plan with later approved decisions, the
  diff and the recorded check results. Distinguish executed checks from user-reported results
  and from code inspection. Never invent commands, results, commits or approvals.
- This prompt authorises writing the task artifacts below. It does not authorise changing
  application code, committing, pushing or posting.

On a repeated closeout, refresh existing files in place. Keep the current status
authoritative and add a short dated **Changes since previous closeout** section; mark
superseded conclusions rather than deleting them.

## Part 1: `implementation-report.md`

1. **Summary:** two or three sentences on reader-facing value and mechanism; areas touched;
   SOP used. Status: implementation `Complete / Partial / Blocked`, verification
   `Passed / Failed / Partial / Not run`, review `Addressed / Outstanding / Not performed`,
   repository `Committed / Uncommitted / Mixed`, each with evidence.
2. **Acceptance criteria:** each one marked `Completed / Incomplete / Blocked / Unverified`,
   with its evidence. Separate delivered scope, approved deviations, deferred work and
   unexplained differences. Record decisions with their rationale and source (user or
   assumption), and rejected approaches worth remembering.
3. **Contract check:** for each relevant `PROJECT_CONTEXT.md` §4 contract, `Yes / No / N/A /
   Not verified` with a one-line justification. Always assess **silence**: can a reader see
   "nothing is wrong" where the data is actually missing?
4. **Files changed:** grouped by area, each tied to a plan step.
5. **Review resolution:** per comment, its identifier, the issue, the resolution, files and
   verification. Keep local fixes apart from pushed fixes and from reviewer approval.
6. **Verification:** the exact commands run and their results, and the state they cover.
   Results that predate later edits are marked historical. If nothing ran, say "Not verified
   by automated checks in this session."
7. **Remaining work and risks:** follow-ups, assumptions, environment names that need
   injecting (never their values), and a link to the handoff.

## Part 2: `lessons-learned.md`

1. **Retrospective:** valid review findings, errors, course corrections, user corrections and
   preferences, and procedures that worked. Keep code lessons apart from workflow lessons.
   State facts only. Write "No new lessons" when that is true.
2. **Routing:** for each durable lesson, pick one primary target from the `AGENTS.md` §10
   table and check that target's current text. Mark it `Update proposed / Already covered /
   No relevant change`. Distinguish a missing rule from an existing rule that was not
   followed.
3. **Proposals:** give each a stable id (`GP-<slug>-N`), the target file and heading, the
   evidence, the exact text to add or replace, and a status
   (`Proposed / Applied / Superseded`). Apply them only when authorised, and record that
   authorisation.

## Part 3: `handoff.md` (always)

Write or refresh it in both modes. Its first line states one of `Continuation required` or
`Complete — reference for future sessions`. Include:

- the goal and the current status in two or three sentences;
- the repository state: branch, HEAD, pushed or not, and uncommitted paths;
- decisions and their rationale (link the plan rather than copying it);
- verification: what ran, against which state, and the result; what was not run, and why;
- exact next actions in order, with the authorisation each still needs;
- pending general-document proposals by id.

### Shared handoff (public)

When the task continues on another machine, or when pending proposals would otherwise live
only in `local/`, also write `docs/AI/handoff/<slug>.md`, following
[handoff/README.md](handoff/README.md). That file is **public**: no secrets, subscriber data,
private URLs or personal notes. Writing it does not commit it.

## Finish

Reply in chat with: the mode, the artifact paths written, any documentation applied, the
proposals awaiting a decision, and the next actions. Keep the full content in the files.
