# Part 13 — Worked Example: Banking (Instant P2P Transfer)

This is the pipeline running end to end on a realistic, high-stakes feature: **instant peer-to-peer money transfer** in a banking/fintech platform. Money movement stresses every governance mechanism — idempotency, double-entry integrity, audit, fraud limits, PCI/SOC2. The actual artifacts each agent produces are in [`examples/banking/`](../examples/banking/); this part narrates the flow and points to them.

## The feature
> A user sends money to another user instantly. It must be **exactly-once** (a retry must never double-charge), **integrity-preserving** (the ledger always balances), **within limits** (daily/velocity/fraud), **auditable**, and **fast** (p95 < 500 ms).

## Artifact map — who produced what, at which stage

| Stage | Agent | Artifact | 🔒 |
|-------|-------|----------|----|
| Requirements | product-manager | [`01-prd.md`](../examples/banking/01-prd.md) | 🔒 |
| Functional spec | business-analyst | [`02-functional-spec.md`](../examples/banking/02-functional-spec.md) | |
| Technical spec | architect | [`03-technical-spec.md`](../examples/banking/03-technical-spec.md) | 🔒 |
| Key decision | architect | [`adr-0007-idempotent-transfers.md`](../examples/banking/adr-0007-idempotent-transfers.md) | |
| API contract | api-reviewer | [`04-api-contract.md`](../examples/banking/04-api-contract.md) | |
| Data model | database-engineer | [`05-database-design.md`](../examples/banking/05-database-design.md) | |
| Task breakdown | architect + PM | [`06-task-breakdown.md`](../examples/banking/06-task-breakdown.md) | |
| Threat model | security-reviewer | [`07-threat-model.md`](../examples/banking/07-threat-model.md) | 🔒 |
| Test plan | qa-engineer | [`08-test-plan.md`](../examples/banking/08-test-plan.md) | |
| Code review | code-reviewer | [`09-code-review-report.md`](../examples/banking/09-code-review-report.md) | 🔒 |
| Release notes | release-manager | [`10-release-notes.md`](../examples/banking/10-release-notes.md) | 🔒 |
| Postmortem | bug-investigator | [`11-postmortem.md`](../examples/banking/11-postmortem.md) | |

## The narrative

**Requirements (🔒).** `product-manager` turns "let users send money instantly" into a PRD: goals, non-goals (not international/FX in v1), user stories, and Given/When/Then acceptance criteria — including the regulatory constraints (KYC, AML screening, transfer limits). Human PM signs off. → `business-analyst` details every flow and edge case (insufficient funds, limit exceeded, unknown recipient, **duplicate submission**) in the functional spec.

**Design (🔒).** `architect` designs the smallest safe system: an API gateway fronting `transfer-service`, `ledger-service`, `account-service`, and `fraud-service`, with async notifications via a queue, Postgres for the ledger, Redis for velocity counters. The pivotal decision — how to guarantee **exactly-once** money movement — is recorded in **ADR-0007**: require an `Idempotency-Key` and use a **transactional outbox** (see `knowledge/patterns.md`). NFR targets (p95 < 500 ms, 99.95% availability) and failure modes (what if fraud-service is down? — *fail closed on transfers*) are explicit. `schema-change-guard` and `api-change-guard` fire as contracts take shape.

In parallel: `api-reviewer` specifies `POST /v1/transfers` with the `Idempotency-Key` header and a complete status table (including **409 duplicate** and **422 insufficient funds**); `database-engineer` designs `accounts`, `transfers`, `ledger_entries` (double-entry), `idempotency_keys`, and `outbox`, with the invariants enforced *in the database* (double-entry sums to zero, balance ≥ 0, unique idempotency key) and an expand/contract migration.

**Build.** `06-task-breakdown.md` splits the work into ordered, agent-assigned tickets. Build agents implement against the contract, writing tests alongside. Money is handled as **integer minor units** (never floats), the retry path checks the idempotency key *inside the transaction*, and every state change writes an outbox event atomically.

**Verify (🔒 ×2).** `security-reviewer` produces the STRIDE **threat model**: forged tokens, **tampered amounts**, **replay/double-spend**, IDOR on accounts, PII leakage, DoS, plus abuse cases (fraud, account takeover, laundering) — each with a mitigation. Security gate: go/no-go. `qa-engineer`'s **test plan** traces tests to acceptance criteria, explicitly covering idempotency/double-spend, concurrency on balance, limits, and insufficient funds, plus a perf load test and IDOR/injection checks. `code-reviewer`'s **review report** catches real defects — e.g. a missing idempotency check on the retry path (→ double charge), a race on the balance read, a missing object-level authZ check — and returns *request-changes* with the top 3 for the human reviewer. `vuln-scan` runs in CI.

**Ship (🔒).** `release-manager` compiles **v2.4.0 release notes** (feature, the new tables/migration, verification checklist). `pre-deploy` enforces approval + green tests + clean scan. Rollout is **feature-flagged canary → phased → full**; `post-deploy` watches error rate and latency.

**Operate & learn.** After launch, a retry storm causes *delayed* (not duplicated — idempotency held) transfers due to outbox relay lag. The **postmortem** (blameless, SEV3) finds the root cause (relay poll interval + no backpressure), and the action items add a relay-lag alert and tune the poller — a concrete pipeline improvement, logged to `knowledge/decisions.md`.

## What this example proves
- **Every stage has an owner and an artifact** — nothing is hand-wavy.
- **The hard part (exactly-once money) is decided explicitly** (ADR) and enforced structurally (idempotency key + DB invariants + outbox), not left to hope.
- **Security is central, not a checkbox** — threat model + gate + review all target the money path.
- **The incident makes the pipeline stronger** — a new alert and tuned relay, so the class of problem is caught next time.
- **It's stack-agnostic** — nothing above names a language or cloud; swap the toolchain and the flow is identical.

→ Next: [Part 14 — Common Mistakes](14-common-mistakes.md)
