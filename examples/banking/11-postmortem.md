# Postmortem — Delayed P2P transfer notifications after launch (outbox relay lag)

> Owner: `bug-investigator` (facilitates) + on-call. **Blameless.** Output feeds `knowledge/decisions.md` and tech-debt backlog.

- **Incident ID / date:** INC-3312 / 2026-07-03 · **Severity:** SEV3 · **Duration:** detect→resolve 41 min
- **Author:** bug-investigator · **Status:** Reviewed

## Summary
During the 25% canary of Instant P2P Transfer, a burst of client retries produced a surge of
outbox events. The single-worker outbox relay could not keep up, so recipient notifications and
deep-fraud checks were **delayed** by up to ~6 minutes. **No money was mis-moved and no transfer
was duplicated** — idempotency + synchronous settlement held. User impact was limited to late
"you received money" notices.

## Impact
- ~4,200 transfers settled correctly and on time (p95 stayed < 500 ms).
- Notifications for ~4,200 transfers delayed 30 s – 6 min (SLO: outbox_lag p99 < 30 s breached).
- 37 support contacts ("did my money arrive?"). Zero financial loss, zero double-charge, zero
  ledger discrepancy (reconciliation clean throughout).

## Timeline (UTC)
| Time | Event |
|------|-------|
| T0 (14:02) | Canary raised to 25%; a downstream A/B config caused clients to retry aggressively |
| T+3 (14:05) | Outbox pending rows climb; relay saturates at ~120 events/s single worker |
| T+9 (14:11) | First user reports "haven't got notification" |
| T+14 (14:16) | On-call paged — but only by support escalation (no lag alert existed) |
| T+18 (14:20) | bug-investigator confirms settlement healthy; lag isolated to relay |
| T+27 (14:29) | Mitigation: scaled relay workers 1→4, reduced poll interval 5s→500ms |
| T+35 (14:37) | outbox_pending drains; lag back under 30 s |
| T+41 (14:43) | Resolved; notifications caught up; canary held at 25% pending fix |

## Root cause
**Trigger:** a retry storm from the canary config multiplied event volume. **Underlying cause:**
the outbox-relay polled every 5 s and processed rows single-threaded with **no backpressure or
autoscaling** — throughput was capped well below burst event rate, so pending rows accumulated
and lag grew. 5-whys: notices late → relay behind → relay throughput < event rate → poll interval
too slow + single worker + no backpressure → relay was built for average, not burst, load and had
no lag signal to reveal it. Exactly-once money movement was never at risk because settlement is
synchronous and independent of the relay (as designed in adr-0007 / `03-technical-spec.md §7`).

## Detection
Detected by **support escalation, not monitoring** — MTTD ~14 min. The `outbox_lag_seconds`
metric was emitted (per `03-technical-spec.md §9`) but **no alert was wired on it**, so lag grew
silently. This is the gate gap: the SLI existed without an SLO alert.

## Resolution & recovery
Scaled relay workers 1→4 and dropped poll interval to 500 ms; pending backlog drained in ~8 min.
MTTR ~41 min. No rollback needed — flag stayed on; money path was healthy the entire time.

## What went well / what went poorly
- **Well:** idempotency + synchronous settlement contained blast radius to notifications only;
  ledger reconciliation stayed clean; no double-charge; canary limited exposure to 25%.
- **Poorly:** no alert on a known SLI; relay had no burst headroom or backpressure; MTTD driven
  by users, not signals.

## Action items (each with owner + due + ticket)
| Action | Type | Owner | Due | Ticket |
|--------|------|-------|-----|--------|
| Alert on `outbox_lag_seconds` p99 > 60 s (page) | detect | devops-engineer | 2026-07-05 | FIN-2431 |
| Autoscale relay workers on pending-row depth + add bounded backpressure | prevent | backend-engineer | 2026-07-09 | FIN-2432 |
| Add burst load profile (1000 tps, retry storm) to perf suite | detect | qa-engineer | 2026-07-08 | FIN-2433 |
| Runbook: "notification lag" triage + relay scaling | mitigate | devops-engineer | 2026-07-06 | FIN-2434 |
| Gate canary promotion on outbox_lag SLO, not just latency/errors | prevent | release-manager | 2026-07-07 | FIN-2435 |

## Lessons → pipeline
- **New alert (added):** `outbox_lag_seconds` p99 > 60 s → page; wired into the monitoring stage
  (stage 19) and the canary promotion gate (stage 18).
- **New hook proposed:** extend `post-deploy` to assert outbox lag SLO during canary before
  auto-promoting — an SLI without an alert is a blind spot; every declared SLO must have a test
  and an alert before a money feature promotes.
- Reinforces adr-0007: decoupling async side-effects from settlement kept a SEV3 from becoming a
  money incident. Keep exactly-once on the sync path; make the async path observable + elastic.
