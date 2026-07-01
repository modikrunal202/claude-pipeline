# Worked Example — Instant P2P Transfer (Banking / Fintech)

This directory is a **fully worked example** of the Claude Code SDLC pipeline. Every
file is the *output* a specific pipeline agent would produce at its stage of the
lifecycle for one realistic feature — **Instant P2P Transfer** (send money between
two accounts inside the bank, in real time).

Read this folder alongside [`docs/13-example-banking.md`](../../docs/13-example-banking.md),
which narrates *how* each artifact is produced (agent, skills, hooks, gates). This
folder is the *what* — the filled-in deliverables themselves.

## The feature

> A retail-banking customer can instantly move money from one of their accounts to
> another customer's account. The transfer must be **exactly-once** (no double
> charge on retry), recorded via **double-entry ledger**, screened for **fraud and
> velocity**, and fully **auditable** for SOC 2 / PCI-DSS and AML/BSA compliance.

Canonical facts shared across every file (keep them consistent when extending):

| Thing | Value |
|-------|-------|
| Endpoints | `POST /v1/transfers`, `GET /v1/transfers/{id}`, `GET /v1/transfers` |
| Money representation | **integer minor units** (USD cents) — never floats |
| Min / max per transfer | 1 minor unit ($0.01) / 500000 minor units ($5,000.00) |
| Daily send limit | 1000000 minor units ($10,000.00) per sender per rolling 24h |
| Velocity limit | 10 transfers per sender per rolling 1h |
| Idempotency | mandatory `Idempotency-Key` header on `POST /v1/transfers` |
| Ledger | double-entry, per-transfer debit + credit sum to zero |
| Datastores | PostgreSQL (system of record), Redis (velocity counters / cache) |
| Async | transactional outbox → queue → fraud + notification consumers |
| Release | **v2.4.0** |

## Files → SDLC stage → owning agent

| File | SDLC stage | Owning agent | Template |
|------|-----------|--------------|----------|
| [`01-prd.md`](01-prd.md) | 1 Requirements | `product-manager` | `templates/prd.md` |
| [`02-functional-spec.md`](02-functional-spec.md) | 2–3 Refinement + Functional spec | `business-analyst` | `templates/functional-spec.md` |
| [`03-technical-spec.md`](03-technical-spec.md) | 4–5 Technical spec + Architecture | `architect` | `templates/technical-spec.md` |
| [`adr-0007-idempotent-transfers.md`](adr-0007-idempotent-transfers.md) | 4 Key decision | `architect` | `templates/adr.md` |
| [`04-api-contract.md`](04-api-contract.md) | 6 API contracts | `api-reviewer` | `templates/api-contract.md` |
| [`05-database-design.md`](05-database-design.md) | 7 Database design | `database-engineer` | `templates/database-design.md` |
| [`06-task-breakdown.md`](06-task-breakdown.md) | 9 Task breakdown | `architect` + `product-manager` | — |
| [`07-threat-model.md`](07-threat-model.md) | 12 Security | `security-reviewer` | `templates/threat-model.md` |
| [`08-test-plan.md`](08-test-plan.md) | 11 Testing | `qa-engineer` | `templates/test-plan.md` |
| [`09-code-review-report.md`](09-code-review-report.md) | 15 Code review | `code-reviewer` | — |
| [`10-release-notes.md`](10-release-notes.md) | 17 Release prep | `release-manager` | `templates/release-notes.md` |
| [`11-postmortem.md`](11-postmortem.md) | 22 Retrospective | `bug-investigator` | `templates/postmortem.md` |

## How to read it

1. Start with the **PRD** (`01`) — the *why* and the *what*, MoSCoW-ranked.
2. Follow the numbered files in order; each consumes the previous stage's output.
3. Note the **🔒 human gates**: requirements (after `01`), architecture (after `03`),
   security (after `07`), review (after `09`), deploy (after `10`).
4. `adr-0007` explains the single hardest, least-reversible decision — exactly-once
   money movement — and is referenced by `03`, `04`, and `05`.
5. `11-postmortem` closes the loop: a post-launch incident feeds a new alert + hook
   back into the pipeline.
