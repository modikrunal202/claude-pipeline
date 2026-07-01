# Part 11 — Bug Fix & Incident Workflow

A dedicated pipeline for defects and production incidents. It optimizes for two things the feature flow doesn't stress: **speed under pressure** and **learning so it can't recur**. Spec: [`workflows/bugfix-flow.md`](../workflows/bugfix-flow.md). Runbooks: [`playbooks/bug-fix.md`](../playbooks/bug-fix.md), [`playbooks/hotfix.md`](../playbooks/hotfix.md), [`playbooks/incident-response.md`](../playbooks/incident-response.md).

```
Report → Reproduce → Root-cause → Failing test → Fix → Regression tests
       → Security validation → 🔒 Review → Deploy → Monitor → Postmortem
```

## Steps

**1. Bug reproduction.** `bug-investigator` runs the `bugfix` prompt. It reproduces the defect *deterministically* first — using `monitoring` MCP (errors/traces) and `git` MCP (history/blame) to gather evidence. **No fix begins without a repro.** If flaky, stabilize the repro before changing anything.

**2. Root-cause analysis.** Isolate via binary search — `git bisect` for "worked last week" regressions, or bisecting the code path. Hypothesize, test one variable at a time, keep a ruled-out list. Apply **5 whys** to separate the trigger from the underlying cause. *Log inspection* is central here (the `logging`/`observability` skills define what good logs make possible).

**3. Failing test first.** Capture the bug as a **red test**. This proves the bug, guards against regression, and defines "done."

**4. Fix.** Routed to the owning build agent (`backend`/`frontend`/`mobile-engineer`). Fix minimally **at the root cause** — no opportunistic refactors mixed in. Turn the test green; run the full suite.

**5. Regression tests.** The failing test stays permanently. Add sibling cases for the class of bug if warranted.

**6. Security validation.** If the bug (or its fix) touches auth/money/PII, `security-reviewer` re-checks — the security gate applies to fixes too. `secret-scan`/`vuln-scan` always run.

**7. 🔒 Human review.** `code-reviewer` first (ranked findings), then a human approves.

**8. Deployment.** Normal severity → the standard release flow. Urgent → the **hotfix path** (below).

**9. Monitoring.** Watch the fix in production (`post-deploy` watch); confirm the symptom is gone and no new regression appeared.

**10. Postmortem.** `documentation-writer` facilitates a **blameless** `templates/postmortem.md`: timeline, root cause, MTTD/MTTR, action items with owners, and — critically — **which gate/hook/test would have caught it**. That improvement is filed and the lesson recorded in `knowledge/decisions.md`.

## The hotfix path (`playbooks/hotfix.md`)
When production is on fire, fast-track the **ceremony**, never the **safety**:
- Minimal-change branch off the release tag; smallest possible diff.
- **Still mandatory:** `secret-scan`, `vuln-scan`, and `security-reviewer` for auth/money — these never get skipped, even in an emergency.
- **🔒 Emergency approval** (a designated approver, not the author).
- Deploy (often straight canary → promote), monitor tightly, then **backport** the fix to `main` so it isn't lost in the next release.

## Incident handling (`playbooks/incident-response.md`)
For a live incident (not just a bug): declare severity, assign roles (Incident Commander = `bug-investigator`, plus comms and ops), **mitigate before you fix** (roll back / flag off / shed load to stop impact), keep a timeline, communicate on a cadence, *then* pursue root cause and the postmortem.

## Why "learning" is a first-class step
A fix that doesn't improve a gate leaves the door open for the same class of bug. Every incident produces a concrete pipeline change — a new test, a new hook, a tightened threshold, an ADR. Over time the pipeline gets *harder to break* in the ways it has already been broken. This is how the system compounds.

## Guarantees
- **No fix without a reproducing test.** · **Root cause, not symptom** (mitigate fast if the true fix is large, then do it right). · **Safety gates hold even under emergency.** · **Every incident yields a prevention.**

→ Next: [Part 12 — Enterprise Best Practices](12-best-practices.md)
