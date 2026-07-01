# Threat Model — Instant P2P Transfer

> Owner: `security-reviewer` (with `architect`). Method: STRIDE. Skill: `security`.
> Traces to: `02-functional-spec.md`, `03-technical-spec.md`, `adr-0007-idempotent-transfers.md`.

## 1. Scope & assets
In scope: `POST /v1/transfers`, `GET /v1/transfers[/{id}]`, transfer-service, ledger-service,
idempotency + outbox, and their datastores. **Assets:** customer funds (highest value —
irreversible loss), account balances/ownership, the double-entry ledger (integrity), the audit
trail (non-repudiation), JWTs/session, and memo/account identifiers (restricted PII-adjacent).

## 2. Trust boundaries & data flow
```
[Untrusted client] ══TLS+JWT boundary══> [API Gateway] ──> [transfer-service]
        (attacker-controlled: body, headers, Idempotency-Key)      │
                                                                    ├─sync─> [fraud-service]
                                                                    ├─sync─> [account-service]
                                                                    └──> [ledger-service] ──> [Postgres: money, ledger, audit]
                                                          [outbox] ══async══> [queue] ──> consumers
```
Attacker-controlled inputs: full request body, `amount_minor`, `source_account_id`,
`dest_account_id`, `Idempotency-Key`, and the bearer token.

## 3. STRIDE analysis
| Threat | Category | Asset/Boundary | Likelihood | Impact | Mitigation | Status |
|--------|----------|----------------|-----------|--------|-----------|--------|
| Forged/altered JWT to impersonate sender | Spoofing | API auth | Med | High | Verify signature at gateway, short TTL, key rotation, audience/issuer checks | Mitigated |
| Tampered `amount_minor` / negative / float / overflow | Tampering | Transfer endpoint | High | High | Server-side integer validation, `CHECK 1..500000`, reject non-integer, BIGINT bounds | Mitigated |
| **Replay / double-spend** (resend same request) | Tampering | Money path | High | High | Idempotency-Key + UNIQUE(sender,key) in settle txn — adr-0007 | Mitigated |
| Missing/altered audit for a money move | Repudiation | Audit trail | Low | High | Immutable append-only ledger + audit event per state change, 7yr retention | Mitigated |
| PII/memo or account IDs leaked in logs | Info-disclosure | Logging | Med | High | Log scrubbing (memo redacted), secret-scan hook, no PII in outbox payload | Mitigated |
| **IDOR** — send from an account you don't own / read others' transfers | Elevation | Object access | High | High | Object-level authZ: caller must own `source_account_id`; GET restricted to parties; `403` w/o existence leak | Mitigated |
| Enumerate accounts via error differences | Info-disclosure | Recipient lookup | Med | Med | Uniform `422 recipient_not_found`; no distinction active/nonexistent to caller | Mitigated |
| DoS / transfer flood | DoS | API | Med | Med | Gateway rate limit + business velocity (10/h) → `429`; autoscale; DB conn pool caps | Mitigated |
| Privilege escalation via role/scope tampering | Elevation | AuthZ | Low | High | Scopes validated server-side (`transfers:write/read`); no client-trusted roles | Mitigated |
| Fraud bypass by racing/parallel requests | Tampering | Fraud path | Med | High | Fail-closed on timeout (`held`); per-account row lock serializes balance | Mitigated |

## 4. Abuse cases
- **Fraudster / account takeover:** stolen credentials drain an account fast. Countered by
  velocity (10/h) + daily cap ($10k) + sync fraud scoring + step-up on risk; anomalies feed
  deep-fraud consumer and can freeze the account.
- **Money laundering / structuring:** many sub-limit transfers to spread funds. Countered by
  AML monitoring over the audit trail, velocity/daily aggregates, and SAR escalation for
  patterns (outside this write path but fed by its events).
- **Retry abuse to double-credit a recipient:** blocked by exactly-once idempotency; replays
  return the original transfer with no new movement.
- **Balance-draining race:** two concurrent max transfers. Blocked by `SELECT ... FOR UPDATE`
  + conditional balance update; second sees updated balance → `422 insufficient_funds`.

## 5. Residual risk & sign-off
- **Accepted residual:** deep-fraud analysis is asynchronous, so a sophisticated attacker may
  complete 1–2 transfers before an async freeze. Bounded by per-transfer max ($5k) and daily
  cap ($10k); owner: fraud product lead. Revisit if fraud loss > $X/mo.
- **Accepted residual:** outbox relay lag can delay notifications (not money); mitigated by
  lag alert (see `11-postmortem.md`). Owner: devops-engineer.

**🔒 Security go/no-go:** **GO** — no unmitigated HIGH/CRITICAL. Conditions: idempotency +
authZ + integer-money validation confirmed by tests (`08-test-plan.md` T-IDOR, T-REPLAY,
T-MONEY) before deploy gate.
