# ADR-0007: Exactly-once money movement via Idempotency-Key + transactional outbox

> Owner: `architect` / `documentation-writer`. Indexed in `architecture/adr/README.md`.

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** architect, backend-engineer, security-reviewer, human tech lead
- **Tags:** data, money, reliability, api

## Context
Instant P2P transfers move real money. Clients run on mobile networks that drop and retry;
load balancers and API gateways may retry; users double-tap "send". Any of these can deliver
the *same intent* more than once. A duplicate that results in a second debit is a
customer-money-loss incident and a compliance failure. We need **exactly-once** effect on the
ledger even though the transport is at-least-once.

Simultaneously, we must trigger async side-effects (recipient notification, deep fraud
analysis) reliably. If we settle in the DB but then fail to publish the event, notices are
lost; if we publish before commit, we may notify about a transfer that rolled back. This is
the classic dual-write problem between the database and the message queue.

Constraints: RPO = 0 for committed money; p95 < 500 ms; SOC 2 change-control on money paths;
no new heavyweight infrastructure if avoidable.

## Decision
We will require a client-supplied **`Idempotency-Key`** header on `POST /v1/transfers` and
persist an `idempotency_keys` record (unique per `(sender_id, idempotency_key)`, storing a
`request_hash` and the resulting `transfer_id`) **in the same Postgres transaction** that
writes the double-entry ledger pair and updates balances. Retries with the same key + same
body return the original transfer with no new movement; same key + different body returns
`409`. In that **same transaction** we also insert an **outbox** row; a separate
**outbox-relay** polls committed outbox rows and publishes them to the queue at-least-once,
marking them delivered. Consumers are idempotent on `transfer_id`.

## Options considered
| Option | Pros | Cons |
|--------|------|------|
| A (chosen) Idempotency-Key + unique constraint + transactional outbox | Exactly-once ledger effect; durable; no lost events; no dual-write; standard REST idiom; DB is single source of truth | Requires clients to generate + reuse a key on retry; relay adds slight async lag |
| B Natural dedup on (sender, dest, amount, time-window) | No client change | Ambiguous — a legitimate second identical send in the window is wrongly rejected or wrongly merged; window tuning is guesswork |
| C Distributed lock (Redis/Zookeeper) around the operation | Conceptually blocks concurrent dupes | Liveness/deadlock risk on lock-holder crash; extra infra to run + secure; still needs durable record; doesn't solve dual-write |

## Consequences
- **Positive:** guaranteed no double debit on retry; atomic settlement + event enqueue
  (no lost/premature notifications); clean audit trail keyed by transfer + idempotency key;
  DB remains single source of truth; testable invariant (unique key, ledger sum = 0).
- **Negative / trade-offs:** clients (mobile, web) **must** generate a UUID key per intent and
  reuse it across retries — an API contract obligation we must document and enforce (`400` if
  missing). Outbox relay introduces async lag between commit and notification; if the relay
  falls behind, notices are delayed (see `11-postmortem.md`) — mitigated with a lag SLO/alert
  and backpressure, not by weakening exactly-once.
- **Follow-ups:** unique constraint + indexes (`05-database-design.md`); relay poll interval +
  backpressure tuning; `outbox_lag_seconds` metric/alert; idempotency key TTL/retention (24h
  active, then archived).

## Compliance / reversibility
**Reversible with moderate cost.** The idempotency table and outbox are additive; if we later
adopt a different dedup mechanism we can dual-run and drop them. The client-key contract is the
stickier part — changing it is a breaking API change requiring a version bump and client
migration. No regulatory blocker; the approach *strengthens* AML/audit posture by giving every
money movement a durable, unique, replay-safe record. No customer money is at risk during a
rollback because settlement never depends on the async relay.
