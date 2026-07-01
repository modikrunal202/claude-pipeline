# Glossary

Shared vocabulary for the pipeline and domain. Keep terms alphabetized. Add domain-specific terms per project.

## Pipeline terms
- **ADR** — Architecture Decision Record. A short doc capturing context, a decision, options, and consequences. See `.claude/skills/adr-authoring`.
- **Agent (subagent)** — a role-scoped Claude Code worker with its own tools, model, and instructions (`.claude/agents/`).
- **Constitution** — `.claude/CLAUDE.md`; the always-loaded operating manual and single source of truth.
- **DoD (Definition of Done)** — the checklist a change must satisfy before it ships (`CLAUDE.md`).
- **Gate (🔒)** — a mandatory human approval checkpoint (requirements, architecture, security, review, deploy).
- **Hook** — a deterministic script fired by the runtime or CI to enforce a rule (`.claude/hooks/`).
- **MCP** — Model Context Protocol; typed, governed access to external systems (`.claude/mcp/`).
- **Skill** — auto-invoked expertise module describing *how* to do a class of work well (`.claude/skills/`).

## Engineering terms
- **Error budget** — allowable unreliability derived from an SLO; spent by incidents, earned by stability.
- **Expand/contract migration** — a zero-downtime schema change: add new (expand), backfill, switch, then remove old (contract).
- **Idempotency key** — a client-supplied token making a mutating request safe to retry exactly once (critical for money movement).
- **IDOR** — Insecure Direct Object Reference; missing object-level authorization letting one user access another's data.
- **N+1 query** — a performance anti-pattern issuing one query per row instead of one batched query.
- **Outbox pattern** — writing events to a DB table in the same transaction as state, then relaying them, to avoid dual-write inconsistency.
- **SLI / SLO** — Service Level Indicator (a measured signal) / Objective (its target).
- **Strangler-fig** — incrementally replacing a system by routing pieces to the new implementation until the old is unused.
