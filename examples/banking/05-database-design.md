# Database Design — Instant P2P Transfer

> Owner: `database-engineer`. Guarded by `schema-change-guard` hook. Reviewed with `architect`, `performance-engineer`.
> Engine: PostgreSQL. Traces to: `03-technical-spec.md`, `adr-0007-idempotent-transfers.md`.

## Data model
```
accounts 1───* ledger_entries *───1 transfers 1───1 idempotency_keys
transfers 1───1 outbox   (each committed transfer emits exactly one outbox row)
```
A `transfer` produces **two** `ledger_entries`: a debit (source) and a credit (dest), written
in the same transaction as the balance update, idempotency record, and outbox row.

## Tables / collections
| Name | Purpose | Key fields | PII? | Retention |
|------|---------|-----------|------|-----------|
| accounts | Balance + status per account | id, balance_minor, status, owner_id, kyc_verified | Indirect | Account lifetime |
| ledger_entries | Immutable double-entry lines | id, transfer_id, account_id, direction, amount_minor | No | 7 years (AML) |
| transfers | One row per transfer intent/result | id, source/dest, amount_minor, status | Maybe (memo) | 7 years |
| idempotency_keys | Dedup POST retries | sender_id, idempotency_key, request_hash, transfer_id | No | 24h active → archive |
| outbox | Pending async events | id, transfer_id, event_type, payload, delivered_at | No | 30 days post-delivery |

## Field definitions
| Table.field | Type | Null? | Default | Constraints | Index? |
|-------------|------|-------|---------|-------------|--------|
| accounts.id | UUID | no | gen_random_uuid() | PK | PK |
| accounts.owner_id | UUID | no | — | FK customers | yes |
| accounts.balance_minor | BIGINT | no | 0 | **CHECK (balance_minor >= 0)** | — |
| accounts.status | TEXT | no | 'active' | CHECK in ('active','frozen','closed') | — |
| accounts.kyc_verified | BOOLEAN | no | false | — | — |
| ledger_entries.id | UUID | no | gen_random_uuid() | PK | PK |
| ledger_entries.transfer_id | UUID | no | — | FK transfers | yes |
| ledger_entries.account_id | UUID | no | — | FK accounts | yes |
| ledger_entries.direction | TEXT | no | — | CHECK in ('debit','credit') | — |
| ledger_entries.amount_minor | BIGINT | no | — | **CHECK (amount_minor > 0)** signed by direction | — |
| ledger_entries.created_at | TIMESTAMPTZ | no | now() | — | — |
| transfers.id | UUID | no | gen_random_uuid() | PK | PK |
| transfers.source_account_id | UUID | no | — | FK accounts | yes |
| transfers.dest_account_id | UUID | no | — | FK accounts, CHECK (dest <> source) | yes |
| transfers.amount_minor | BIGINT | no | — | **CHECK (amount_minor BETWEEN 1 AND 500000)** | — |
| transfers.currency | CHAR(3) | no | 'USD' | CHECK (currency = 'USD') | — |
| transfers.memo | VARCHAR(140) | yes | — | — | — |
| transfers.status | TEXT | no | 'pending' | CHECK in ('pending','completed','rejected','held') | yes |
| transfers.created_at | TIMESTAMPTZ | no | now() | — | yes |
| idempotency_keys.sender_id | UUID | no | — | part of PK | — |
| idempotency_keys.idempotency_key | VARCHAR(255) | no | — | part of PK | — |
| idempotency_keys.request_hash | CHAR(64) | no | — | SHA-256 canonical body | — |
| idempotency_keys.transfer_id | UUID | yes | — | FK transfers (set on success) | — |
| idempotency_keys.created_at | TIMESTAMPTZ | no | now() | — | yes |
| outbox.id | BIGSERIAL | no | — | PK | PK |
| outbox.transfer_id | UUID | no | — | FK transfers | — |
| outbox.event_type | TEXT | no | — | e.g. 'transfer.completed' | — |
| outbox.payload | JSONB | no | — | no PII (no memo) | — |
| outbox.delivered_at | TIMESTAMPTZ | yes | null | null = pending | partial idx |

## Indexing strategy
| Index | Columns | Type | Rationale (query it serves) |
|-------|---------|------|-----------------------------|
| pk_idempotency | (sender_id, idempotency_key) | UNIQUE PK | Exactly-once dedup lookup (adr-0007) |
| ix_transfers_source_created | (source_account_id, created_at DESC) | B-tree | List history; daily-cap window aggregation |
| ix_transfers_dest_created | (dest_account_id, created_at DESC) | B-tree | Recipient history |
| ix_ledger_transfer | (transfer_id) | B-tree | Reconciliation: sum entries per transfer |
| ix_ledger_account_created | (account_id, created_at DESC) | B-tree | Per-account statement |
| ix_outbox_pending | (id) WHERE delivered_at IS NULL | Partial | Relay polls only undelivered rows (keeps scan tiny) |

## Integrity & invariants
- **Double-entry:** for each `transfer_id`, `SUM(signed amount) = 0` (debit −, credit +).
  Enforced by application within the txn; verified continuously by a reconciliation job
  (mismatch → page).
- **No overdraft:** `CHECK (balance_minor >= 0)` on `accounts`; balance decrement done as a
  conditional `UPDATE ... WHERE balance_minor >= :amount` under `SELECT ... FOR UPDATE`.
- **Exactly-once:** UNIQUE `(sender_id, idempotency_key)`; conflicting insert → replay path.
- **Integer money:** all amounts `BIGINT` minor units; no `FLOAT`/`NUMERIC` decimals for money.
- **Ledger immutability:** `ledger_entries` are append-only (no UPDATE/DELETE grant to app role).
- **Atomic:** ledger pair + balance update + idempotency row + outbox row commit in ONE txn.

## Migration plan (expand → migrate → contract)
1. **Expand:** create `transfers`, `ledger_entries`, `idempotency_keys`, `outbox`; add
   `kyc_verified`, `status` to `accounts` if absent (nullable/defaulted). Purely additive.
2. **Backfill:** set `accounts.kyc_verified` from KYC source, batched & resumable; no backfill
   for the new tables (empty at launch).
3. **Switch:** enable `p2p_transfer_enabled` flag; app reads/writes new tables.
4. **Contract:** none required this release (all additive). Idempotency rows archived after 24h.

- **Reversibility:** down-migration drops the new tables and added columns; tested in CI. Safe
  because tables are empty until the flag is on; flip flag off before any rollback.
- **Locking/downtime:** `CREATE TABLE` + defaulted-nullable columns take no long locks; index
  builds use `CREATE INDEX CONCURRENTLY`. Zero downtime.
- **Rollback:** flag off → optional down-migration; committed money is never lost (RPO 0).

## Performance considerations
Expected ~300 transfers/s → ~600 ledger rows/s; `transfers` and `ledger_entries` grow ~50M
rows/year — partition by month (range on `created_at`) before year one. Hot query is the
daily-cap window sum over `ix_transfers_source_created`; Redis holds rolling velocity/daily
counters to avoid hitting the DB per request (DB is the correctness fallback). The
`ix_outbox_pending` partial index keeps the relay poll O(pending), not O(table).

---
🔒 Migrations against shared/prod environments require human approval.
