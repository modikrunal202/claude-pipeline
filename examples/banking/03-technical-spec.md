# Technical Specification (TSD) — Instant P2P Transfer

> Owner: `architect` agent (+ human architecture 🔒 gate). Input: functional spec. Output consumed by: build agents.
> Status: Approved · ADRs: [`adr-0007-idempotent-transfers.md`](adr-0007-idempotent-transfers.md) · Traces to spec: `02-functional-spec.md`

## 1. Summary & approach
A new **transfer-service** orchestrates the money movement synchronously. It enforces
idempotency via a client `Idempotency-Key`, delegates balance/ledger mutation to
**ledger-service** inside a single Postgres transaction (debit + credit + balance update +
idempotency record + **outbox** row all commit atomically), and calls **fraud-service**
synchronously for a risk decision before settlement. Notification and deep fraud analysis
are decoupled through a **transactional outbox** relayed to a queue — giving exactly-once
money movement with at-least-once async side-effects. Rationale for the idempotency + outbox
choice is in **adr-0007**.

## 2. Architecture
```
                         ┌──────────────────────────────────────────────┐
[Mobile/Web client]      │                  our platform                 │
      │ HTTPS + JWT      │                                               │
      ▼                  │                                               │
[API Gateway] ──────────▶│  [transfer-service] ──sync──▶ [fraud-service] │
 authN, rate-limit       │        │   │                                  │
                         │        │   └──sync──▶ [account-service] (KYC)  │
                         │        ▼                                       │
                         │  [ledger-service] ──▶ [PostgreSQL]  (accounts, │
                         │   double-entry txn      ledger_entries,        │
                         │   + outbox row          transfers, idem, outbox)│
                         │        │                                       │
                         │  [Redis] velocity counters / hot balance cache │
                         │        │                                       │
                         │  [outbox-relay] ──poll──▶ [Queue] ──▶ consumers:│
                         │                              ├─ [notification]  │
                         │                              └─ [deep-fraud]    │
                         └──────────────────────────────────────────────┘
```

## 3. Components & responsibilities
| Component | Responsibility | New/changed | Owner agent |
|-----------|----------------|-------------|-------------|
| API Gateway | TLS, JWT authN, coarse rate limit, routing | changed | infrastructure-engineer |
| transfer-service | Orchestrate: idempotency, validation, limits, fraud call, invoke ledger, return result | **new** | backend-engineer |
| ledger-service | Atomic double-entry write + balance update + idempotency + outbox row | changed | backend-engineer |
| account-service | Account existence, ownership, KYC/active status | changed | backend-engineer |
| fraud-service | Synchronous risk decision (allow/review/deny) | changed | backend-engineer |
| outbox-relay | Poll outbox, publish to queue, mark delivered | **new** | backend-engineer |
| notification consumer | Push/in-app credit notice | changed | backend-engineer |
| PostgreSQL | System of record; enforces invariants | changed | database-engineer |
| Redis | Rolling velocity counters, optional balance cache | changed | database-engineer |

## 4. Data model
Entities: `accounts`, `ledger_entries` (double-entry), `transfers`, `idempotency_keys`,
`outbox`. Money is **BIGINT minor units**. Invariants enforced in-DB: per-transfer ledger
sum = 0, `balance_minor ≥ 0`, unique `(sender_id, idempotency_key)`. Migration is
expand→contract, all reversible. Full detail: [`05-database-design.md`](05-database-design.md).

## 5. API contracts
`POST /v1/transfers` (requires `Idempotency-Key`), `GET /v1/transfers/{id}`,
`GET /v1/transfers` (cursor pagination). Consistent error envelope; status codes
201/400/401/403/409/422/429. Idempotency + versioning rules per
[`04-api-contract.md`](04-api-contract.md).

## 6. Non-functional targets
| Attribute | Target |
|-----------|--------|
| Latency (p95) | < 500 ms end-to-end for `POST /v1/transfers` |
| Latency (p99) | < 900 ms |
| Throughput | 300 transfers/s sustained, 1000/s burst |
| Availability | 99.95% monthly for the transfer path |
| RTO / RPO | RTO ≤ 15 min · RPO = 0 (no committed money loss; synchronous replica) |
| Cost envelope | ≤ $0.0008 per transfer at target volume |

## 7. Failure modes & resilience
| Dependency down/slow | Behavior |
|----------------------|----------|
| fraud-service | **Fail-closed**: timeout (250 ms) → transfer `held`, released by deep-fraud later. Never settle unscored. |
| account-service | Cannot verify ownership/KYC → `503`, retryable; no settlement. |
| PostgreSQL primary | Money path unavailable → `503`; failover to sync replica (RPO 0), RTO ≤15 min. |
| Redis | Velocity counters fall back to DB aggregate query (slower but correct); cache miss is safe. |
| Queue / outbox-relay | Settlement **still commits** (outbox row persisted); async notice delayed only — see postmortem. |
| Client retries | Idempotency-Key makes retries safe (exactly-once) — adr-0007. |

Transfer-service uses per-call **timeouts**, bounded **retries with jittered backoff** on
idempotent sub-calls, and a **circuit breaker** around fraud-service.

## 8. Security & privacy
Threat surface in [`07-threat-model.md`](07-threat-model.md). AuthN = short-TTL JWT at gateway;
**object-level authZ** in transfer-service (caller must own `source_account_id`). Data
classification: account IDs + memo = restricted; no PAN/card data in this path (out of PCI
CDE, but SOC 2 change-control applies). Secrets via vault; no PII in logs (memo scrubbed).
Every state change writes an immutable audit event.

## 9. Observability
- **Metrics (RED):** transfer request rate, error rate by code, duration histogram;
  `transfers_completed_total`, `transfers_rejected_total{reason}`, `fraud_hold_total`,
  `outbox_lag_seconds`, `outbox_pending_rows`.
- **SLIs/SLOs:** success ratio ≥ 99.9%; p95 < 500 ms; **outbox_lag_seconds p99 < 30 s**.
- **Traces:** one span per stage (authZ, idempotency, limits, fraud, ledger commit, outbox).
- **Alerts:** SLO burn, `outbox_lag_seconds` > 60s (added post-incident — see `11-postmortem.md`),
  ledger reconciliation mismatch (any nonzero per-transfer sum → page).

## 10. Rollout & migration
Feature-flagged (`p2p_transfer_enabled`), off by default. Expand-only migrations ship first
(reversible). **Canary**: enable for internal + 1% of MAU, watch SLOs + ledger reconciliation
24h, then 5% → 25% → 100%. Rollback = flip flag off (no schema rollback needed; new tables
are additive). Kill-switch documented in runbook.

## 11. Alternatives considered
- **Async-settled transfers (fire-and-forget + eventual)** — rejected: users expect instant
  confirmation; complicates UX and reconciliation.
- **Natural dedup on (sender, amount, recipient, time-bucket)** — rejected: ambiguous for
  legitimate repeat sends (see adr-0007 options).
- **Distributed lock for exactly-once** — rejected: liveness risk, added infra; DB-level
  idempotency + outbox is simpler and durable (adr-0007).

## 12. Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| Double-charge on retry | Med | High | Idempotency-Key + unique constraint (adr-0007) | architect |
| Concurrent-transfer overdraft | Med | High | `SELECT … FOR UPDATE` + balance re-check under lock | database-engineer |
| Outbox relay lag delays notices | Med | Med | Backpressure + lag alert; settlement independent | devops-engineer |
| Fraud service instability | Med | High | Circuit breaker + fail-closed hold | backend-engineer |

---
🔒 **Approval gate:** human architecture sign-off before implementation.
