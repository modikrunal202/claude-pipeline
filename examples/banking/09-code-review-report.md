# Code Review Report — Instant P2P Transfer implementation

> Owner: `code-reviewer`. Skills: `code-review`, `security`, `testing`. Reviewing PR #2487 (FIN-2411/2412/2414/2415).
> Every finding cites a location, a concrete failure scenario, and a fix. Verdict is advisory to the human 🔒 review gate.

## Verdict: **REQUEST CHANGES**
Two blockers put customer money at risk (double-charge on retry, overdraft under
concurrency). Do not merge to the release branch until F1 and F2 are fixed and covered by
`T-SPEND` / `T-CONC`.

## Findings (ranked)

### F1 — Idempotency check on retry path is non-atomic → double charge · **BLOCKER**
- **Location:** `services/transfer/handler.go:142-171`
- **What:** the handler does `SELECT` on `idempotency_keys`, and only if absent proceeds to
  settle and *then* `INSERT`s the key — outside the settlement transaction.
- **Failure scenario:** two retries of the same request arrive concurrently (mobile retry +
  gateway retry). Both `SELECT` miss, both settle, both debit. The unique constraint later
  rejects the *second* key insert, but the *second debit has already committed* → customer
  charged twice. Exactly the incident adr-0007 exists to prevent.
- **Fix:** move the idempotency `INSERT` **into** the settlement transaction and rely on the
  `UNIQUE (sender_id, idempotency_key)` constraint: attempt insert first; on unique violation,
  roll back and return the stored transfer (replay). Do not gate on a prior `SELECT`.

### F2 — Balance read then write is a race → overdraft · **BLOCKER**
- **Location:** `services/ledger/settle.go:88-104`
- **What:** `balance := getBalance(acct)` then later `updateBalance(acct, balance-amount)` with
  no row lock; check `balance >= amount` uses the stale read.
- **Failure scenario:** two concurrent transfers from a $50 account for $40 each both read $50,
  both pass the check, both write — final balance −$30, violating no-overdraft (BR5). The
  `CHECK (balance_minor >= 0)` may catch one only if the writes serialize, which they don't here.
- **Fix:** `SELECT ... FOR UPDATE` the account row, or do a single conditional
  `UPDATE accounts SET balance_minor = balance_minor - :amt WHERE id = :id AND balance_minor >= :amt`
  and treat 0 rows affected as `insufficient_funds`.

### F3 — Missing object-level authZ on source account · **BLOCKER**
- **Location:** `services/transfer/handler.go:96`
- **What:** handler trusts `source_account_id` from the body and never checks the JWT subject
  owns it.
- **Failure scenario:** attacker sends `{"source_account_id": <victim's acct>, "dest": <own>}` —
  an IDOR that drains a victim account (threat model, Elevation row).
- **Fix:** verify `account.owner_id == jwt.sub` before any settlement; return `403` without
  leaking whether the account exists.

### F4 — Money stored/computed as float · **MAJOR**
- **Location:** `services/transfer/dto.go:23`, `services/ledger/settle.go:71`
- **What:** `Amount float64` on the DTO and `float64` arithmetic before persisting to `BIGINT`.
- **Failure scenario:** `0.1 + 0.2`-style representation error; `2500.0000001` truncates
  wrong; large amounts lose precision — money is created or destroyed, breaking ledger sum = 0.
- **Fix:** type as `int64` minor units end-to-end; reject non-integer JSON at the edge
  (BR1). No float ever touches money.

### F5 — Outbox insert outside settlement transaction · **MAJOR**
- **Location:** `services/ledger/settle.go:131`
- **What:** ledger commits, then a separate call inserts the outbox row.
- **Failure scenario:** process crashes between commit and outbox insert → money moved but no
  event ever published → recipient never notified, deep-fraud never runs (dual-write problem
  adr-0007 forbids).
- **Fix:** insert the outbox row inside the same transaction as the ledger pair + balance +
  idempotency record.

### F6 — Limit check counts non-completed transfers · **MINOR**
- **Location:** `services/transfer/limits.go:40`
- **What:** daily-cap aggregation sums all statuses including `rejected`/`held`.
- **Failure scenario:** a user with several rejected attempts is wrongly blocked at `429`
  before reaching the real $10k cap — a correctness/UX bug, not a money-loss.
- **Fix:** filter `status = 'completed'` in the window aggregate (matches BR3).

### N1 — Log line includes memo · **NIT**
- **Location:** `services/transfer/handler.go:210` — `log.Info("transfer", "memo", req.Memo)`.
- **Fix:** drop/redact memo from logs (threat model info-disclosure; secret-scan may flag).

## Top 3 for the human reviewer
1. **F1** — non-atomic idempotency → double charge (defeats adr-0007).
2. **F2** — balance race → overdraft (violates BR5 no-overdraft).
3. **F3** — missing source-account authZ → IDOR account drain.
