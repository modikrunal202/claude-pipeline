# Part 4 — Subagent Design

19 specialized subagents, each a role-scoped worker with its own **tools** (least-privilege), **model tier**, and **operating prompt**. Full definitions are the live files in [`.claude/agents/`](../.claude/agents/); this part is the catalog and the design rationale.

## Why many small agents (not one big one)
- **Quality:** a focused role prompt beats a do-everything prompt; each agent reasons within its expertise.
- **Least privilege:** a reviewer needs no write access; a doc writer needs no shell. Scoping tools per role shrinks blast radius.
- **Parallelism:** independent agents run concurrently (design contract ∥ data model; QA ∥ security ∥ perf).
- **Cost control:** cheap tiers for execution, expensive tiers for judgment.
- **Trade-off:** more orchestration. The `workflows/` absorb it.

## Roster

| Agent | Phase | Model | Tools (write?) | Primary skills | Key MCP |
|-------|-------|-------|----------------|----------------|---------|
| product-manager | Plan | opus | Read/Write, WebSearch (no code) | — | issue-tracker, knowledge-base |
| business-analyst | Plan | opus | Read/Write, WebSearch | documentation | issue-tracker |
| architect | Design | opus | Read/Write, Web | architecture, adr-authoring | git, knowledge-base, openapi |
| api-reviewer | Design | opus | Read/Grep/Bash (no write) | api-design | openapi, github |
| database-engineer | Design | opus | Read/Grep/Bash | database, migration | postgres |
| backend-engineer | Build | sonnet | Read/Edit/Write/Bash | backend, api-design, testing | git, openapi, postgres |
| frontend-engineer | Build | sonnet | Read/Edit/Write/Bash | frontend, testing | browser, openapi |
| mobile-engineer | Build | sonnet | Read/Edit/Write/Bash | frontend, testing | openapi |
| infrastructure-engineer | Build | sonnet | Read/Edit/Write/Bash | terraform, aws, kubernetes | cloud, terraform, kubernetes |
| qa-engineer | Verify | opus | Read/Edit/Write/Bash | testing | browser |
| code-reviewer | Verify | opus | Read/Grep/Bash (no write) | code-review, security, testing | git, github |
| security-reviewer | Verify | opus | Read/Grep/Bash (no write) | security | security-scanner |
| performance-engineer | Verify | opus | Read/Grep/Bash (no write) | performance, observability | postgres, monitoring |
| accessibility-auditor | Verify | sonnet | Read/Grep/Bash (no write) | frontend | browser |
| devops-engineer | Ship | sonnet | Read/Edit/Write/Bash | docker, kubernetes, observability | github, docker, kubernetes |
| release-manager | Ship | sonnet | Read/Edit/Write/Bash | git | github, issue-tracker |
| bug-investigator | Sustain | opus | Read/Edit/Write/Bash | debugging, testing | git, monitoring |
| refactoring-specialist | Sustain | sonnet | Read/Edit/Write/Bash | refactoring, testing | git |
| documentation-writer | Sustain | sonnet | Read/Write (no shell) | documentation, adr-authoring | knowledge-base |

## Model-tier policy
- **opus** — deep reasoning: design, security, performance, review, investigation, and the planning roles that shape scope. Getting these wrong is expensive.
- **sonnet** — execution: implementation, refactoring, docs, devops, release. High-volume, well-specified work.
- **haiku** — reserved for trivial mechanical tasks; no agent defaults to it here.

## Anatomy of an agent file
Every definition carries: frontmatter (`name`, `description`, `tools`, `model`) then **Mission · Responsibilities · Inputs · Outputs · Required context · Skills used · MCP usage · Hooks triggered · Collaboration (hand-offs) · Operating prompt · Success criteria**. See the exemplars: [`architect.md`](../.claude/agents/architect.md), [`code-reviewer.md`](../.claude/agents/code-reviewer.md).

## Collaboration graph (hand-offs)
```
product-manager → business-analyst → architect ─┬→ api-reviewer ─┐
                                                 └→ database-engineer ┘→ build agents
build agents → code-reviewer → {security-reviewer, performance-engineer, accessibility-auditor} → qa-engineer
            → documentation-writer → 🔒 human review → release-manager → devops-engineer → (monitoring)
bug-investigator ⇄ build agents (fix)   refactoring-specialist ⇄ code-reviewer   documentation-writer ⇄ all (KB)
```
Hand-offs are **artifacts, not chat**: each agent consumes a structured document (PRD, spec, TSD, contract, diff, findings) and emits the next one. This keeps context clean (Part 8) and makes each step auditable.

## Adding or modifying an agent
Use the `prompt-engineering` skill: keep the role sharp, tools minimal, output contract explicit; version the change and note it. Agents are owned by the platform/DevEx team and changed via PR.

→ Next: [Part 5 — Skills Library](05-skills.md)
