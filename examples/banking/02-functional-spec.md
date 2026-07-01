# Functional Specification — Instant P2P Transfer

> Owner: `business-analyst` agent. Input: PRD (FIN-2401). Output consumed by: `architect`, `qa-engineer`.
> Status: Approved · Traces to PRD: `01-prd.md`

## 1. Overview
A sender initiates a real-time transfer of an integer minor-unit amount from their own
account to another platform account. The system authenticates the caller, deduplicates
by `Idempotency-Key`, validates funds and limits, screens for fraud, records a
double-entry ledger movement atomically, and returns a terminal `completed` (or
`rejected`) transfer synchronously. Notification and deep fraud analysis run asynchronously.

## 2. Actors & roles
| Actor | Permissions |
|-------|-------------|
| Sender (authenticated customer) | Create transfers **from accounts they own**; read own transfers |
| Recipient (customer) | Receive credit + notification; read transfers they are party to |
| Fraud service (system) | Score transfers; may hold/deny |
| Compliance analyst | Read-only audit trail; SAR escalation (out of this feature's write path) |

## 3. Functional requirements (detailed)
| ID | Traces to | Behavior | Preconditions | Postconditions |
|----|-----------|----------|---------------|----------------|
| F1 | R1 | Debit sender, credit recipient, return `completed` transfer | Both accounts active + KYC-verified; funds suffice | Two ledger entries; balances updated |
| F2 | R2 | Return the original result for a replayed `Idempotency-Key` | Prior request with same key stored | No new ledger entries |
| F3 | R3 | Write balanced double-entry pair inside one DB transaction | F1 validations pass | Σ(entries for transfer)=0 |
| F4 | R4 | Reject when balance < amount | — | No ledger entry; transfer `rejected` |
| F5 | R5 | Enforce min/max/daily/velocity limits | — | Rejected if breached |
| F6 | R6 | Obtain sync risk decision before settlement; enqueue deep check | Fraud service reachable | Risk decision recorded |
| F7 | R7 | Emit immutable audit event per state change | — | Audit row + outbox event |
| F8 | R8 | Notify recipient asynchronously | Transfer `completed` | Outbox → notification queue |
| F9 | R9 | List caller's transfers, newest first, paginated | — | Cursor page returned |

## 4. User flows

**Primary — successful transfer**
```
1. Sender submits transfer: {source_account_id, dest_account_id, amount_minor, currency, memo?}
   with header Idempotency-Key.
2. System authenticates JWT and verifies sender OWNS source_account_id.       (2a → exception E4)
3. System looks up Idempotency-Key.
   3a. Key exists + same request hash → return stored transfer (STOP, replay). (→ alt A1)
   3b. Key exists + DIFFERENT request hash → 409 idempotency_key_reuse.        (→ exception E5)
4. System validates recipient exists + active.                                (4a → exception E3)
5. System validates amount ≥ 1 and ≤ 500000 and currency = USD.               (5a → exception E1)
6. System checks daily-sent + hourly-velocity limits.                         (6a → exception E2)
7. System requests synchronous fraud decision.                                (7a → hold/deny)
8. In ONE DB transaction: lock source row, re-check balance ≥ amount,
   write debit(-amount) + credit(+amount) ledger entries, update balances,
   persist transfer=completed, persist idempotency record, write outbox event.(8a → exception E6)
9. System returns 201 with the completed transfer.
10. Outbox relay publishes event → notification + deep-fraud consumers (async).
```

**Alternate A1 — idempotent replay:** step 3a returns the original transfer with HTTP 201
(or 200 on GET) and identical body; no side effects.

**Exception flows**
- **E1 invalid amount/currency** → `400 validation_error` (or `422` for out-of-range), nothing persisted.
- **E2 limit exceeded** → `429 limit_exceeded`, `details.limit` = `daily`|`velocity`|`per_transfer`.
- **E3 recipient not found/inactive** → `422 recipient_not_found`.
- **E4 sender does not own source account** → `403 forbidden` (no existence leak — see threat model).
- **E5 duplicate key, different body** → `409 idempotency_key_reuse`.
- **E6 insufficient funds** (found at step 5 re-check under lock) → `422 insufficient_funds`,
  transaction rolled back, transfer `rejected`.

## 5. Business rules
- **BR1** Money is integer **minor units** (USD cents); no floating point anywhere.
- **BR2** Per-transfer amount: **min 1**, **max 500000** minor units.
- **BR3** Daily send cap: **1000000** minor units per sender per rolling 24h (sum of `completed`).
- **BR4** Velocity: **≤10** transfers per sender per rolling 1h.
- **BR5** No overdraft: post-debit source balance must be **≥ 0**.
- **BR6** Sender ≠ recipient account (self-transfer rejected as `422 validation_error`).
- **BR7** Both parties must be KYC-verified & active; else `422 recipient_not_found` / `403`.
- **BR8** Fraud decision `deny` → transfer `rejected` with reason; `review` → `held` (async release).

## 6. Edge cases & error handling
| Case | Expected behavior |
|------|-------------------|
| Empty/invalid input (missing field, non-integer amount) | `400 validation_error`, nothing persisted |
| Missing `Idempotency-Key` header | `400 validation_error` (key required for POST) |
| Duplicate key, identical body | Replay original result, no new movement (F2) |
| Duplicate key, different body | `409 idempotency_key_reuse` |
| Two concurrent transfers draining one account | Row lock serializes; second sees updated balance → may `422 insufficient_funds` |
| Amount exactly at max / daily edge | Allowed at exactly the limit; one unit over → rejected |
| Recipient account frozen mid-flight | Re-checked under lock; `422 recipient_not_found` |
| Fraud service timeout | Fail-closed: hold transfer (`held`), do not settle blindly |
| Outbox relay lag | Settlement still completes synchronously; notification delayed only |

## 7. Data dictionary
| Field | Type | Constraints | PII? | Notes |
|-------|------|-------------|------|-------|
| transfer_id | UUID | PK | No | Server-generated |
| source_account_id | UUID | FK accounts, owned by caller | No | Account identifier only |
| dest_account_id | UUID | FK accounts, ≠ source | No | |
| amount_minor | BIGINT | 1..500000 | No | Integer minor units |
| currency | CHAR(3) | = 'USD' | No | ISO 4217 |
| memo | VARCHAR(140) | optional | **Maybe** | Scrubbed from logs |
| status | ENUM | pending/completed/rejected/held | No | Terminal or held |
| idempotency_key | VARCHAR(255) | client-supplied, unique per sender | No | Header |
| request_hash | CHAR(64) | SHA-256 of canonical body | No | Detects key reuse |
| created_at | TIMESTAMPTZ | not null | No | UTC |

## 8. Acceptance criteria (Given/When/Then)
- **AC1** *Given* valid parties + funds, *when* sender transfers, *then* `201 completed`,
  sender debited, recipient credited, balanced ledger pair written.
- **AC2** *Given* a succeeded `Idempotency-Key`, *when* replayed with same body, *then* the
  original transfer is returned and no second debit occurs.
- **AC3** *Given* balance < amount, *when* submitted, *then* `422 insufficient_funds`, no ledger row.
- **AC4** *Given* daily or velocity limit breached, *when* submitted, *then* `429 limit_exceeded`
  naming the limit.
- **AC5** *Given* caller does not own source account, *when* submitted, *then* `403 forbidden`.
- **AC6** *Given* same key + different body, *when* submitted, *then* `409 idempotency_key_reuse`.

## 9. Assumptions & dependencies
KYC status is authoritative in account-service; fraud-service exposes a synchronous scoring
API with a strict timeout; ledger writes and balance updates share one DB transaction;
outbox relay guarantees at-least-once async delivery.
