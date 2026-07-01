# PRD — Instant P2P Transfer

> Owner: `product-manager` agent (+ human PM approval). Downstream: `business-analyst`, `architect`.
> Status: Approved · Ticket: FIN-2401 · Last updated: 2026-06-18

## 1. Problem & context
Customers currently move money to another person by initiating an ACH transfer that
settles in 1–3 business days. Support tickets tagged `slow-transfer` are up 34% QoQ,
and 12% of churn-survey respondents cite "can't send money instantly" as a reason for
opening a competitor account (Cash App, Zelle, Venmo). Instant intra-bank P2P is
table stakes. Real-time rails and our new double-entry ledger (shipped v2.2) now make
sub-second settlement feasible. **Why now:** competitive parity + ledger foundation is ready.

## 2. Goals / non-goals
- **Goals:** enable instant (<5s perceived) money movement between two accounts on our
  platform; be exactly-once and auditable; meet AML/velocity controls; reduce
  slow-transfer tickets by 30% within one quarter.
- **Non-goals:** external/interbank transfers (ACH/RTP/FedNow), international/FX,
  request-money or split-bill, scheduled/recurring transfers, business (non-retail)
  accounts. All deferred to later phases.

## 3. Target users & personas
- **Primary — Priya, retail checking customer** who splits rent/dinner and expects the
  money to land immediately.
- **Secondary — Recipient (also our customer)** who needs a real-time credit + notification.
- **Internal — Compliance analyst** who must review flagged transfers and pull audit trails.

## 4. User stories
- As a **sender**, I want to send money to another customer instantly so that they
  receive it in seconds, not days.
- As a **sender**, I want a retry of a failed request to never double-charge me so that
  I can safely tap "send" again on a flaky connection.
- As a **recipient**, I want an immediate notification and balance update so that I
  know the money arrived.
- As a **compliance analyst**, I want every transfer immutably logged with who/what/when
  so that I can satisfy AML/BSA and SOC 2 audits.

## 5. Requirements
| ID | Requirement | Priority (MoSCoW) | Notes |
|----|-------------|-------------------|-------|
| R1 | Send money between two in-platform accounts, settled synchronously | Must | Core |
| R2 | Exactly-once semantics — client-supplied `Idempotency-Key`, no double debit | Must | See adr-0007 |
| R3 | Double-entry ledger record for every transfer (debit + credit, sum = 0) | Must | Audit + integrity |
| R4 | Reject when sender balance < amount (no overdraft) | Must | balance ≥ 0 invariant |
| R5 | Enforce min $0.01, max $5,000/transfer, $10,000/rolling-24h, 10 transfers/h | Must | Regulatory + fraud |
| R6 | Fraud/velocity screening before settlement | Must | Sync risk score + async deeper check |
| R7 | Immutable audit trail for every state change | Must | SOC 2 / AML |
| R8 | Real-time push + in-app notification to recipient | Should | Async via queue |
| R9 | Transfer history list with status & receipt | Should | `GET /v1/transfers` |
| R10 | Add optional memo/note (≤140 chars, PII-scrubbed in logs) | Could | |
| R11 | Scheduled/recurring transfers | Won't (this release) | Phase 2 |

## 6. Acceptance criteria
- **AC1 (R1):** *Given* sender and recipient are valid active accounts and funds suffice,
  *when* the sender submits a transfer, *then* sender is debited, recipient credited, and
  a `completed` transfer is returned within the p95 latency target.
- **AC2 (R2):** *Given* a request with `Idempotency-Key` K already succeeded, *when* the
  same K + same body is replayed, *then* the original transfer is returned and **no**
  second debit occurs.
- **AC3 (R4):** *Given* balance < amount, *when* the transfer is submitted, *then* it is
  rejected `422 insufficient_funds` and no ledger entry is written.
- **AC4 (R5):** *Given* the daily cap or velocity limit is exceeded, *when* a transfer is
  submitted, *then* it is rejected `429 limit_exceeded` with the offending limit named.
- **AC5 (R3):** *Given* any completed transfer, *when* the ledger is summed for it,
  *then* debit + credit = 0.

## 7. Success metrics
| Metric | Baseline | Target | Measured by |
|--------|----------|--------|-------------|
| Slow-transfer support tickets | 100/wk | ≤70/wk (−30%) | Support tags, 1 quarter |
| P2P adoption (senders/mo) | 0 | ≥15% of MAU | Product analytics |
| Perceived settlement time (p95) | 1–3 days | <5s | Client telemetry |
| Double-charge incidents | n/a | 0 | Ledger reconciliation |

## 8. Constraints & dependencies
- **Regulatory:** sender & recipient must be KYC-verified (CIP on file); AML/BSA velocity
  and amount limits enforced; suspicious activity feeds SAR workflow; 7-year audit
  retention; PCI-DSS scope for account data; SOC 2 change-control on money paths.
- **Dependencies:** double-entry ledger service (v2.2), account-service, fraud-service,
  notification queue, KYC status source.

## 9. Risks & open questions
| Risk / question | Impact | Owner | Resolution |
|-----------------|--------|-------|------------|
| Retry storm double-charges customers | High | architect | Idempotency-Key + outbox — adr-0007 |
| Race on concurrent transfers overdrafts account | High | database-engineer | Row lock / conditional balance update |
| Regulator questions velocity thresholds | Med | Compliance | Thresholds configurable, documented |
| Notification lag looks like "money lost" | Med | product-manager | Sync settlement; async is only the notice |

---
🔒 **Approval gate:** human PM sign-off recorded (FIN-2401) before Architecture begins.
