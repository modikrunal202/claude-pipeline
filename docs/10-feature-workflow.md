# Part 10 — Feature Development Workflow

The end-to-end path for a new feature, step by step. This is the narrative; the machine-readable spec is [`workflows/feature-flow.md`](../workflows/feature-flow.md) (+ `feature-flow.workflow.js`), and the human runbook is [`playbooks/feature-development.md`](../playbooks/feature-development.md).

```
Idea → Requirements → Architecture → Task breakdown → Implementation → Auto-review
     → Unit/Integration tests → Security review → Performance review → Documentation
     → 🔒 Human review → Merge → Deployment → Monitoring → Production feedback
```

## What happens at each step

**1. Idea → Requirements.** A human states intent (a ticket, a request). The `product-manager` runs the `planning` prompt: restates the problem, defines goals/non-goals, writes user stories with Given/When/Then acceptance criteria, prioritizes (MoSCoW), and flags compliance impact → `templates/prd.md`. The `business-analyst` refines into `templates/functional-spec.md` with edge cases and a data dictionary. **🔒 Requirements gate:** the human PM confirms scope. *Reads from `issue-tracker`/`knowledge-base` MCP.*

**2. Architecture.** The `architect` runs the `architecture` prompt against the spec: designs the smallest system meeting the NFRs, defines boundaries and failure modes, and records each significant choice as an ADR → `templates/technical-spec.md` + `architecture/adr/`. In parallel, `api-reviewer` designs the contract (`templates/api-contract.md`, `api-change-guard` fires) and `database-engineer` designs the data model + reversible migration (`templates/database-design.md`, `schema-change-guard` fires). **🔒 Architecture gate.**

**3. Task breakdown.** `architect` + `product-manager` split the TSD into independently-buildable tasks (tickets), ordered by dependency.

**4. Implementation.** One build agent per task — `backend-engineer` / `frontend-engineer` / `mobile-engineer` / `infrastructure-engineer` — runs the `implementation` prompt: reuse existing utilities, build the smallest change matching the contract, write tests alongside. In a parallel run these use **worktree isolation** so tasks don't collide. Hooks fire on every edit: `pre-edit-guard`, `secret-scan`, `post-edit-format`; on turn end `on-stop-verify` runs a fast typecheck+lint.

**5. Auto-review.** As each task finishes, `code-reviewer` runs the `review` prompt: ranked findings (each with a concrete failure scenario), verdict, top-3 for humans. Authoring agent fixes must-fixes. This happens *before* any human looks — so human attention is spent on judgment, not mechanics.

**6. Unit & integration tests.** `qa-engineer` (or the build agent) ensures behavior coverage per the acceptance criteria via the `testing` skill: happy/boundary/error paths, deterministic, lowest-effective pyramid level; contract tests for the API boundary; E2E for the critical journey via the `browser` MCP. `on-test-fail` captures failures for triage.

**7. Security review.** `security-reviewer` runs the `security` prompt: STRIDE threat model, OWASP checklist, findings with exploit scenarios. `vuln-scan` (SCA+SAST) runs in CI. **🔒 Security gate — mandatory and non-skippable** for auth/money/PII surfaces.

**8. Performance review.** `performance-engineer` checks the change against its budget: measure first, profile, kill N+1s/hot-path costs, load-test critical paths (`monitoring`/`postgres` MCP). Only where perf matters.

**9. Documentation.** `documentation-writer` updates READMEs/API docs/ADRs and `knowledge/` — in the same change as the behavior, so docs don't drift.

**10. 🔒 Human review.** A human reviewer makes the final call, aided by the auto-review verdict and all gate results. This is judgment (does this solve the right problem, is the design sound?), not mechanics.

**11. Merge.** On a protected branch, only when all gates are green (`pre-commit`/CI re-enforce). Squash to a clean, Conventional-Commits history.

**12. Deployment.** `release-manager` assembles `templates/release-notes.md`; `devops-engineer` runs the `deployment` prompt. `pre-deploy` enforces approval + green tests + clean scan. **🔒 Deploy gate.** Roll out **canary → phased → full**; never all-at-once for risky changes.

**13. Monitoring.** `post-deploy` seeds a bake-window watch; `devops`/`performance` track error rate, latency p95, saturation via `monitoring` MCP. Regression → immediate rollback (command ready in advance).

**14. Production feedback.** Real usage and metrics flow back to `knowledge/` and the backlog — informing new requirements (step 1) and tech-debt (Part 3, stage 23). The loop closes.

## Where humans spend attention
Only the five 🔒 gates. Everything else is machine-executed and machine-verified, then presented for a gate decision. This is the core value: **speed between gates, judgment at gates.**

## Parallelism map
- Design: contract ∥ data model (barrier — build needs both).
- Build: task-per-agent, worktree-isolated (pipeline; each flows into its own auto-review as it finishes).
- Verify: QA ∥ perf ∥ a11y; **security must clear before the human-review gate.**

→ Next: [Part 11 — Bug Fix Workflow](11-bugfix-workflow.md)
