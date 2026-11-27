# Resume an existing task

Restore the saved task context and continue the next authorised action, without redoing
completed work or discarding earlier decisions.

**Task / branch:** [Exact branch, or "derive from the handoff"]
**Handoff:** [`local/tasks/<branch>/handoff.md` on this machine, or `docs/AI/handoff/<slug>.md` on another]
**Next action:** [A specific action, or "derive from the saved state"]
**Mode:** [Continue authorised work / Assess only; default: continue]

## Restore and reconcile

1. **Re-derive the repository state; do not trust notes.** Check the current branch, HEAD,
   working-tree changes and the distance from `origin/main`. If the handoff names a commit,
   check that it is still in history (`git merge-base --is-ancestor <sha> HEAD`). Do not
   switch, reset or overwrite files to make them match a handoff. Report any mismatch.
2. **Read the saved artifacts.** On the same machine, read the local `handoff.md`,
   `implementation-plan.md`, `review-notes.md` and any earlier closeout. On another machine,
   use the shared handoff in `docs/AI/handoff/` (missing local files are expected there).
   Do not infer a decision or an approval from silence.
3. **Summarise in a few lines:** the goal, approved decisions, superseded alternatives, what is
   done, and what is unresolved. Keep track of where each approval came from. A previous
   "Final" closeout is not proof of a merge, passing checks or approval of new work.
4. **Re-verify.** Verification results recorded against an older state are history, not
   evidence for the current code. Rerun what the next step depends on.
5. **Continue.** Take the next unresolved action if it is authorised. If an explicit gate
   remains, ask that one question and continue any independent work meanwhile. Delegation
   recorded in a handoff (commit, push) must be re-confirmed in this session.

When the plan changes, update `implementation-plan.md` in place and record why. At the next
checkpoint, apply `docs/AI/AI_End-of-Session_Prompt.md`.
