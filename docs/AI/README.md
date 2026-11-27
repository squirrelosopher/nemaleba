# AI session prompt catalog

Entry points for running a task with an AI agent in this repository. This is a navigation
guide, not a prompt to execute every linked document. The rules themselves live in
[PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md), [AGENTS.md](../../AGENTS.md) and
[CLAUDE.md](../../CLAUDE.md).

| File | Purpose |
|---|---|
| [AI_task_start.md](AI_task_start.md) | Start a task: inputs, branch, task directory, plan, approval gate |
| [AI_resume_session.md](AI_resume_session.md) | Continue a task from its handoff without redoing or discarding prior decisions |
| [AI_End-of-Session_Prompt.md](AI_End-of-Session_Prompt.md) | Checkpoint or final closeout: report, lessons, handoff, documentation proposals |
| [skills/](skills/) | Repeatable procedures, listed in `AGENTS.md` §11 |
| [handoff/](handoff/README.md) | Public shared handoffs, for continuing on another machine |

## Lifecycle

```
AI_task_start ──► plan (local/tasks/<branch>/implementation-plan.md) ──► approval
      ──► implement + verify ──► review-notes.md (per review batch)
      ──► AI_End-of-Session_Prompt (Checkpoint or Final) ──► handoff.md
      ──► next session: AI_resume_session
```

## Shared conventions

- **Task identity:** branch `<type>/<slug>` (or `<type>/<issue>-<slug>`), with the task
  directory `local/tasks/<branch>/` matching it exactly. Do not derive a second slug.
- **Template integrity:** templates hold placeholders, not one session's values. Paths are
  repository-relative, never absolute paths from one machine.
- **Unknowns:** mark a missing value as unknown. Never invent commands, results, approvals
  or commits.
- **Repository actions:** the user owns commits, pushes, PRs and merges unless they delegate
  them in the current session (`AGENTS.md` §8).
- **Public by default:** every tracked file is public. Task notes stay under the ignored
  `local/`. Only publication-safe continuation context goes to `docs/AI/handoff/`.
