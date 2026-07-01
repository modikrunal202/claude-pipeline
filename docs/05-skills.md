# Part 5 — Skills Library

23 skills encode *how* to do a class of work well. Unlike agents (which are *who*), skills are **auto-invoked** by Claude when a task matches the skill's `description` — so the right expertise loads without anyone asking. Full definitions live in [`.claude/skills/`](../.claude/skills/); each is a `<name>/SKILL.md` with the structure **Purpose · When invoked · Inputs · Outputs · Procedure · Best practices · Anti-patterns**, plus optional `references/` files for deep checklists.

## Invocation strategy
- **Auto:** Claude reads skill descriptions and invokes on match — write descriptions as precise triggers ("Use when …"), not vague topics.
- **Progressive disclosure:** the `SKILL.md` is loaded first; heavy `references/` files load only when the procedure calls for them — this keeps context lean (Part 8).
- **Composability:** an agent may pull several skills (a `backend-engineer` uses `backend` + `api-design` + `testing` + `database`).

## Catalog

| Skill | Purpose | Refs | Primary users |
|-------|---------|------|---------------|
| architecture | Patterns, boundaries, C4, NFRs, trade-offs | patterns-cheatsheet | architect |
| backend | Service structure, idempotency, transactions, resilience | — | backend-engineer |
| frontend | Components, state, data fetching, client perf | — | frontend/mobile-engineer |
| api-design | REST/GraphQL/gRPC contracts, versioning, compat | rest-checklist | api-reviewer, backend-engineer |
| testing | Test pyramid, deterministic tests, behavior coverage | — | qa-engineer, all |
| database | Modeling, indexing, query tuning, safe migrations | — | database-engineer |
| docker | Minimal/secure images, multi-stage, scanning | — | devops, infrastructure |
| aws | Well-architected, IAM least-privilege, cost | — | infrastructure, devops |
| terraform | Modules, state, plan-before-apply, no secrets in state | — | infrastructure |
| kubernetes | Workloads, probes, HPA, rollout, security contexts | — | devops, infrastructure |
| git | Branching, Conventional Commits, small PRs, bisect | — | all engineers, release-manager |
| code-review | Severity ranking, failure-scenario discipline, reuse | review-checklist | code-reviewer |
| debugging | Reproduce → isolate → root-cause → regression test | — | bug-investigator |
| logging | Structured logs, correlation ids, never log secrets/PII | — | backend, devops |
| observability | Logs/metrics/traces, SLI/SLO, RED/USE, symptom alerts | slo-guide | devops, performance, bug-investigator |
| security | STRIDE, OWASP checklist, exploit-scenario findings | secure-coding-checklist, prompt-injection | security-reviewer, all |
| performance | Measure-first, profiling, bottlenecks, caching | — | performance-engineer |
| documentation | Audience-driven, doc-as-code, anti-drift | — | documentation-writer |
| refactoring | Behavior-preserving steps under test cover, strangler-fig | — | refactoring-specialist |
| migration | Expand/contract, backfill, zero-downtime, rollback | — | database, backend |
| dependency-update | License/maintenance/transitive vetting, SCA | dependency-vetting-checklist | all, security-reviewer |
| prompt-engineering | Authoring/versioning this pipeline's agents/skills/prompts | — | anyone editing the pipeline |
| adr-authoring | Context/decision/consequences, ADR index & lifecycle | — | architect, documentation-writer |

## Skills vs agents vs prompts vs hooks
| Primitive | Answers | Loaded | Example |
|-----------|---------|--------|---------|
| **Skill** | *How* to do X well | Auto, on task match | "how to design a safe migration" |
| **Agent** | *Who* does the work | On delegation | database-engineer |
| **Prompt** | *This specific request* | On use | "migrate table Y with zero downtime" |
| **Hook** | *Rule that must always hold* | Deterministic, every time | "no secrets in a commit" |

## Best practices for skills
- **Trigger-precise descriptions** — the description is the only thing Claude sees when deciding to invoke; make it about *when*, with concrete cues.
- **Procedure over prose** — a numbered method the agent can follow, not an essay.
- **Push depth to `references/`** — keep `SKILL.md` scannable; load the 200-line checklist only when needed.
- **Stack-agnostic by default** — detect the toolchain; name specifics only in tool-specific skills (docker/terraform/etc.).
- **Version changes** (via `prompt-engineering`), and include Anti-patterns — telling the model what *not* to do is as valuable as what to do.

→ Next: [Part 6 — Hooks](06-hooks.md)
