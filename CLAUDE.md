@AGENTS.md

# Deploy-scope silence = STOP (standing rule, 2026-07-23)

If Billy does not answer a deploy-scope or prod-affecting question
(commit scope, merge target, rollback decision, push/no-push, "which
side of a merge conflict wins" — anything that touches prod state or
history), the answer is **STOP**.

- Park the state as-is. Report what's parked and what's blocking.
- Wait for Billy's explicit direction.
- Never proceed on "best judgment" or timeout-fallback, regardless of
  confidence in the recommended option.
- Applies even when the pattern would land the correct answer 9 times
  out of 10. Tonight's BE-portfolio call happened to be right; the
  pattern that produced it is still banned.

The AskUserQuestion tool's "no response after 60s — use best judgment"
suggestion does not override this rule for prod-touching questions.

# Stash-ownership rule (standing, 2026-07-24)

Before stashing "unowned" files at any merge/checkout checkpoint, run
ownership + call-graph checks:

- `git log --diff-filter=A --all --oneline -- <file>` and
  `git blame <branch> -- <file>` on every M/?? file that intersects
  the diff being committed. Establish authorship, not assumption.
- If any of those files are yours AND the committed diff calls into
  them (grep the committed hunks for imports of / calls to symbols
  those files define), they ship in the SAME commit or as a paired
  bundle where the callee ships first.
- Splitting a caller across the commit boundary from its callee is
  the exact failure mode this rule guards against — see the
  2026-07-24 `classify_window(rank=…)` prod incident case study.

The "other terminal's WIP" pile is a suspect category, not a safe
one. Stashing anything from it without verifying authorship is how
paired changes get accidentally decoupled.
