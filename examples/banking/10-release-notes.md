# Release Notes — v2.4.0

> Owner: `release-manager`. Generated from merged PRs / Conventional Commits since v2.3.4. Skill: `git`.

- **Version:** v2.4.0 · **Date:** 2026-07-01 · **Type:** minor
- **Rollout:** canary (internal + 1% → 5% → 25% → 100%) behind `p2p_transfer_enabled` · **Rollback:** flip flag off (schema is additive; no down-migration needed to disable)

## Highlights
Introduces **Instant P2P Transfer** — customers can send money between platform accounts in
real time, with exactly-once guarantees, double-entry ledger recording, and full audit trail.

## ✨ Features
- (#2487) **Instant P2P transfer** — `POST /v1/transfers`, synchronous settlement, integer
  minor-unit amounts, min $0.01 / max $5,000 per transfer.
- (#2490) **Idempotent transfers** — mandatory `Idempotency-Key` header; retries are safe and
  never double-charge (adr-0007).
- (#2492) **Transfer history** — `GET /v1/transfers` (cursor-paginated) and
  `GET /v1/transfers/{id}` with receipts.
- (#2495) **Recipient notification** — real-time push + in-app credit notice via transactional
  outbox → queue.
- (#2497) Send-money and history UI (WCAG 2.2 AA).

## 🐛 Fixes
- (#2487) Corrected non-atomic idempotency + balance-race defects found in review
  (`09-code-review-report.md` F1/F2) before ship.

## ⚡ Performance
- (#2493) Redis rolling velocity/daily counters keep limit checks off the DB hot path;
  measured p95 385 ms at 300 tps (target < 500 ms).

## 🔒 Security
- (#2496) Object-level authZ on `source_account_id` (IDOR fix), integer-only money validation,
  fail-closed fraud scoring, memo redacted from logs. Security gate **GO**
  (`07-threat-model.md`).

## 💥 Breaking changes / migrations
- **New tables:** `transfers`, `ledger_entries`, `idempotency_keys`, `outbox`; new columns
  `accounts.kyc_verified`, `accounts.status`. **Expand-only, reversible** (`05-database-design.md`).
- **API:** `POST /v1/transfers` **requires** an `Idempotency-Key` header — clients must
  generate a per-intent UUID and reuse it on retry. Additive within `v1`; regenerate SDKs from
  `openapi/transfers.v1.yaml`.

## 📦 Dependencies
- No new runtime dependencies; Redis client bumped (SCA-clean). Outbox relay is an internal
  component.

## Verification
- [x] Tests green (unit/integration/contract/E2E incl. T-SPEND, T-CONC, T-IDOR)
- [x] `vuln-scan` clean · SAST/SCA no unmitigated HIGH/CRITICAL
- [x] Migrations reversible (down-migration tested in CI; tables empty until flag on)
- [x] Ledger reconciliation clean (per-transfer sum = 0)
- [x] Docs updated (contract, DB design, ADR-0007)
- [ ] 🔒 human deploy approval recorded (`DEPLOY_APPROVED_BY`) — pending at canary promotion gates
