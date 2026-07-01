# Task Breakdown — Instant P2P Transfer

> Owners: `architect` + `product-manager`. Input: `03-technical-spec.md`, `04-api-contract.md`, `05-database-design.md`.
> Each task is independently buildable, has an owning agent, an estimate, and traces to an acceptance criterion (AC) in `02-functional-spec.md`.

## Legend
Estimates in ideal-days. AC refs are from `02-functional-spec.md`. Dependencies use ticket IDs.

## Tickets
| # | Ticket | Description | Agent | Est | Depends on | AC |
|---|--------|-------------|-------|-----|------------|----|
| FIN-2410 | Schema + migrations | Create `transfers`, `ledger_entries`, `idempotency_keys`, `outbox`; add account columns; expand-only, reversible down-migration | database-engineer | 2 | — | AC1,AC3,AC5 |
| FIN-2411 | Ledger atomic write | `ledger-service`: debit+credit pair, conditional balance update under `FOR UPDATE`, ledger-sum=0 invariant | backend-engineer | 3 | FIN-2410 | AC1,AC5(F3) |
| FIN-2412 | Idempotency store | Persist/lookup `(sender_id, key, request_hash)`; replay path; 409 on body mismatch | backend-engineer | 2 | FIN-2410 | AC2,AC6 |
| FIN-2413 | Transactional outbox + relay | Outbox row in settle txn; `outbox-relay` polling publisher (at-least-once), partial-index scan | backend-engineer | 3 | FIN-2411 | F7,F8 |
| FIN-2414 | Transfer orchestration | `transfer-service`: authZ (owns source), validation, limit checks, fraud call, invoke ledger, build response | backend-engineer | 4 | FIN-2411,FIN-2412 | AC1,AC3,AC4,AC5 |
| FIN-2415 | Limits + velocity | Min/max, daily cap, hourly velocity via Redis counters w/ DB fallback | backend-engineer | 2 | FIN-2414 | AC4(F5) |
| FIN-2416 | Fraud sync integration | Timeout+circuit-breaker call; fail-closed `held`; enqueue deep check | backend-engineer | 2 | FIN-2414 | F6,BR8 |
| FIN-2417 | API contract + OpenAPI | `POST/GET /v1/transfers`, error envelope, status codes; `openapi/transfers.v1.yaml` | api-reviewer + backend-engineer | 2 | FIN-2414 | all |
| FIN-2418 | Notification consumer | Consume `transfer.completed`, push+in-app to recipient; idempotent on transfer_id | backend-engineer | 1 | FIN-2413 | F8 |
| FIN-2419 | Send-money UI | Form (amount in minor units, recipient, memo), generate+reuse `Idempotency-Key`, states, receipt | frontend-engineer | 3 | FIN-2417 | AC1,AC2 |
| FIN-2420 | Transfer history UI | Paginated list + detail, a11y (WCAG 2.2 AA) | frontend-engineer | 2 | FIN-2417 | F9 |
| FIN-2421 | Observability | RED metrics, `outbox_lag_seconds`, ledger-reconciliation job + alerts, traces | devops-engineer | 2 | FIN-2413,FIN-2414 | NFR §9 |
| FIN-2422 | Threat model + security gate | STRIDE, abuse cases, authZ/replay/IDOR checks | security-reviewer | 1 | FIN-2414,FIN-2417 | 🔒 security |
| FIN-2423 | Test suite | Unit/integration/contract/E2E per `08-test-plan.md` incl. idempotency, double-spend, concurrency, limits | qa-engineer | 4 | FIN-2414–2420 | all |
| FIN-2424 | Feature flag + canary | `p2p_transfer_enabled`, canary config, rollback runbook | devops-engineer | 1 | FIN-2421 | rollout §10 |

## Critical path
`FIN-2410 → FIN-2411 → FIN-2414 → FIN-2417 → FIN-2419/2423 → FIN-2422 (security gate) → FIN-2424`.
Idempotency (FIN-2412) and outbox (FIN-2413) branch off after schema/ledger and rejoin at
orchestration and observability.

## Sequencing notes
- FIN-2410 first — everything else needs the schema.
- Do NOT start UI (2419/2420) until the contract (2417) is frozen — avoids client rework.
- Security gate (FIN-2422) is a **mandatory 🔒 gate**; no merge to release branch until it passes.
- FIN-2423 runs continuously alongside build; exit criteria in `08-test-plan.md`.

Total: ~36 ideal-days; ~2 backend + 1 frontend + 1 data/devops over ~2 sprints.
