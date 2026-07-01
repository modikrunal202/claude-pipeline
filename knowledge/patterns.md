# Solution Patterns

Reusable, proven patterns for this codebase. Reach for these before inventing new approaches. Each: problem · when to use · sketch · caveats.

---

## Idempotent money transfer
- **Problem:** a client retry (timeout, network blip) must not move money twice.
- **When:** any mutating endpoint, especially payments/ledger operations.
- **Sketch:** client sends an `Idempotency-Key`; server records `(key → result)` transactionally on first success and returns the stored result on replay. Combine with a DB unique constraint on the key.
- **Caveats:** key TTL and scope must be defined; the write of the key and the effect must be in the **same transaction**, or use the outbox pattern.

## Transactional outbox
- **Problem:** you must update state *and* publish an event, but a dual write (DB + broker) can partially fail.
- **When:** event-driven flows where losing/duplicating an event is costly.
- **Sketch:** in one DB transaction, write the state change **and** an `outbox` row. A relay polls the outbox and publishes to the broker, marking rows sent (at-least-once). Consumers dedupe.
- **Caveats:** consumers must be idempotent; monitor relay lag.

---

*Add patterns as the system proves them. Link the ADR or postmortem that established each.*
