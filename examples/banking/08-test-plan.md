# Test Plan — Instant P2P Transfer

> Owner: `qa-engineer`. Skill: `testing`. Traces to acceptance criteria in `02-functional-spec.md`.

## 1. Scope & strategy
Verify exactly-once money movement, double-entry integrity, limits, authZ, and resilience across
unit / integration / contract / E2E / non-functional levels. Money correctness (integer minor
units, ledger sum = 0, no overdraft) and idempotency/double-spend are the highest-priority beds.

## 2. Test matrix
| ID | Traces to | Level | Scenario | Expected result | Automated? |
|----|-----------|-------|----------|-----------------|-----------|
| T1 | AC1 | Unit | Valid transfer, funds suffice | Debit+credit, `completed` returned | Yes |
| T2 | AC5(F3) | Unit | Ledger pair for a transfer | Σ(signed amount) = 0 | Yes |
| T3 | AC1 | Unit | amount_minor as float/decimal string | `400 validation_error` (integer only) | Yes |
| T4 | BR2 | Unit | amount = 0, 1, 500000, 500001 | reject / accept / accept / `422` | Yes |
| T5 | BR6 | Unit | source == dest | `422 validation_error` | Yes |
| T-REPLAY | AC2 | Integration | Same Idempotency-Key + same body, twice | 2nd returns original; exactly one debit | Yes |
| T-KEYREUSE | AC6 | Integration | Same key, different body | `409 idempotency_key_reuse` | Yes |
| T6 | AC2 | Integration | Missing Idempotency-Key on POST | `400 validation_error` | Yes |
| T7 | AC3 | Integration | Balance < amount | `422 insufficient_funds`, no ledger row | Yes |
| T8 | AC4 | Integration | 11th transfer within 1h | `429 limit_exceeded` details.limit=velocity | Yes |
| T9 | AC4 | Integration | Cumulative sends exceed daily cap | `429 limit_exceeded` details.limit=daily | Yes |
| T-IDOR | AC5 | Integration | Send from account caller doesn't own | `403 forbidden`, no state change | Yes |
| T10 | F9 | Integration | GET /v1/transfers for non-party transfer | `403` / not listed | Yes |
| T-CONC | AC3,§6 | Integration | 2 concurrent max transfers, one balance | Exactly one succeeds; other `422`; no overdraft; ledger sum=0 | Yes |
| T-SPEND | AC2 | Integration | 50 parallel replays of one key | Exactly one debit total | Yes |
| T11 | F6 | Integration | fraud-service timeout | Transfer `held`, not settled (fail-closed) | Yes |
| T12 | §7 | Integration | outbox relay down after commit | Transfer `completed`; event delivered on relay recovery | Yes |
| T13 | contract | Contract | Response vs `openapi/transfers.v1.yaml` | Schema + status codes match | Yes |
| T14 | journey | E2E | Send → recipient credited → notification → history shows receipt | Full happy path green | Yes |
| T15 | journey | E2E | Flaky-network double-tap send | One transfer, one notification | Yes |

## 3. Non-functional tests
- **Performance:** load test at 300 tps sustained / 1000 tps burst; assert p95 < 500 ms,
  p99 < 900 ms, `outbox_lag_seconds` p99 < 30 s; tool: k6.
- **Security:** IDOR matrix (T-IDOR), replay/double-spend (T-SPEND), SQL/JSON injection payloads
  on all fields, JWT tampering, negative/overflow amounts; `security` skill checks; gate ties to
  `07-threat-model.md` T-IDOR/T-REPLAY/T-MONEY.
- **Accessibility (UI):** WCAG 2.2 AA / axe on send-money form + history; keyboard-only send;
  screen-reader labels on amount and confirmation; error announcements.

## 4. Test data & environments
Ephemeral Postgres via testcontainers; seeded accounts (funded, zero-balance, frozen,
non-KYC); fake fraud-service with configurable latency/verdict; in-memory queue for outbox
consumers. Each test isolates its own accounts; no shared mutable balance. Reconciliation
assertion (ledger sum = 0 per transfer) runs after every integration test.

## 5. Entry / exit criteria
- **Entry:** code complete for FIN-2410–2420, builds green, unit tests pass, contract published.
- **Exit (Definition of Done):** all matrix tests pass; zero double-debit under T-SPEND/T-CONC;
  ledger reconciliation clean; perf targets met; a11y axe clean; security gate GO
  (`07-threat-model.md`); no open blocker/major findings.

## 6. Risks & gaps
Not tested here: interbank/ACH paths (out of scope), FX (out of scope), long-horizon soak >24h
(covered separately in staging), and real fraud-model accuracy (owned by fraud team — we only
verify the integration contract and fail-closed behavior).
