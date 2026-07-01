# System Overview

> Example content — replace with your project's real architecture. Uses the C4 model (Context → Container → Component → Code); we keep L1 + L2 here and let code be the L4.

## L1 — System Context
Who/what uses the system and its external dependencies.

```
                    ┌───────────────────────────────────────────┐
     ┌────────┐     │              <Your System>                 │     ┌──────────────┐
     │  User  │────▶│  (delivers the product's core capability)  │────▶│ Payment /     │
     └────────┘     │                                            │     │ 3rd-party API │
     ┌────────┐     │                                            │     └──────────────┘
     │ Admin  │────▶│                                            │────▶┌──────────────┐
     └────────┘     └───────────────────────────────────────────┘     │ Email / SMS  │
                                    │                                   └──────────────┘
                                    ▼
                             ┌──────────────┐
                             │ Identity /   │
                             │ SSO provider │
                             └──────────────┘
```

## L2 — Containers
The deployable/runtime units and how they talk.

```
   [Web / Mobile Client]
           │ HTTPS (REST/GraphQL — see api-contract)
           ▼
   ┌──────────────────┐        ┌──────────────────┐
   │   API Gateway    │───────▶│   Auth Service    │──▶ [Identity Provider]
   └────────┬─────────┘        └──────────────────┘
            │
            ▼
   ┌──────────────────┐  async  ┌──────────────────┐     ┌──────────────┐
   │  Core Service    │────────▶│   Message Queue   │────▶│   Worker(s)  │
   │  (domain logic)  │         └──────────────────┘     └──────┬───────┘
   └────────┬─────────┘                                          │
            │ SQL (read/write)                                   │
            ▼                                                    ▼
   ┌──────────────────┐                               ┌──────────────────┐
   │  Primary DB      │◀──────────────────────────────│  (side effects)  │
   │  (+ read replica)│                                └──────────────────┘
   └──────────────────┘
            │
            ▼
   ┌──────────────────┐
   │  Cache (Redis)   │
   └──────────────────┘
```

## Narrative
- **API Gateway** terminates TLS, authenticates, rate-limits, routes.
- **Core Service** owns domain logic and the transactional datastore; publishes events via the **outbox pattern** (see `knowledge/patterns.md`).
- **Workers** handle async/side-effecting work idempotently.
- **Read replica + cache** absorb read load; writes go to primary.

## Non-functional posture
| Attribute | Target (example) |
|-----------|------------------|
| Availability | 99.9% |
| API latency p95 | < 300 ms |
| RPO / RTO | 5 min / 30 min |

## Key decisions
See `adr/README.md`. Notably [ADR-0001](adr/0001-adopt-claude-sdlc-pipeline.md).
