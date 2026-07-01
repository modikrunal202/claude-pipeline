# Part 8 — Context Engineering

Context is the scarcest resource in an agentic system. Too little and agents hallucinate or repeat work; too much and they slow down, cost more, and *degrade* (relevant facts get lost in noise — "context pollution"). This part defines how context is sourced, scoped, moved, and pruned.

## Context taxonomy

| Context | What | Source | Scope | Lifespan |
|---------|------|--------|-------|----------|
| **Project** | Stack, commands, conventions, guardrails | `.claude/CLAUDE.md` | Global | Project life |
| **Architecture** | Current design, ADRs, boundaries | `architecture/` | System | Long-term |
| **Business** | Goals, domain rules, priorities | PRD, `knowledge/`, tracker | Initiative | Medium |
| **Sprint** | Current goals, capacity | Tracker (MCP) | Sprint | Weeks |
| **Task** | The specific ticket + acceptance criteria | Prompt + ticket | One task | Task |
| **File** | The code under edit + its direct deps | Read on demand | Narrow | Task |
| **Repository** | Where things live, patterns | Delegated search (subagent) | As needed | Task |
| **Conversation** | The working thread | Session | Session | Session |

## Memory tiers

```
   ┌───────────────────────────────────────────────────────────┐
   │ LONG-TERM (durable, cross-session)                         │
   │   .claude/CLAUDE.md  ·  knowledge/  ·  architecture/  ·     │
   │   issue tracker (MCP)                                      │
   ├───────────────────────────────────────────────────────────┤
   │ SHORT-TERM (this session)                                  │
   │   the conversation + artifacts produced this run          │
   └───────────────────────────────────────────────────────────┘
```
- **Write long-term** only for the **non-obvious** (a decision, trade-off, workaround, constraint). The `documentation-writer` owns this; `session-start` re-injects recent `knowledge/decisions.md`.
- **Never persist** secrets/PII/credentials in any tier (enforced by `secret-scan` + `pre-edit-guard`).

## Cross-agent context: pass artifacts, not transcripts
Agents hand off **structured documents**, not raw conversation:
```
PRD → functional spec → TSD + contracts → diff → review findings → release notes
```
Each artifact is a *compression* of everything before it — the `architect` reads the spec, not the PM's brainstorming. This is the single most important discipline: it keeps every downstream context clean and makes each step auditable.

## The core techniques

| Technique | What | When |
|-----------|------|------|
| **Right-sizing** | Load only the task + touched files + relevant memory | Always |
| **Delegated search** | Send an `Explore`/subagent to find things; get back the conclusion, not the file dumps | Scope unknown / broad |
| **Summarization** | Replace a long thread with its decisions + open items | Thread grows long |
| **Compression** | Convert raw output (logs, search hits) to structured findings before passing on | Between agents |
| **Progressive disclosure** | Load a skill's `SKILL.md` first; its `references/` only when needed | Skill invocation |
| **Sub-agent isolation** | A subagent's tool output stays out of the parent context; only its result returns | Big fan-outs |

## Avoiding context pollution
- **Don't paste whole files** you don't need — Read the range, or let a subagent return the conclusion.
- **Don't keep dead ends** in context — summarize what was ruled out, drop the raw exploration.
- **Don't co-mingle tasks** — one task per thread; new task, fresh context seeded from artifacts + memory.
- **Don't let untrusted content masquerade as instructions** — MCP/web content is data (Part 7 security).
- **Prune before you grow** — when the thread is long, summarize before adding more.

## Token & cost optimization
- Match the **model tier** to the job (opus for judgment, sonnet for execution) — Part 4.
- Use **prompt caching**: keep the stable preamble (`CLAUDE.md`, skill text) constant so it's cached across turns; put the variable task at the end.
- **Delegate heavy reads** to subagents so their token cost doesn't accrue to the main thread.
- **Batch independent work** in parallel rather than re-loading context serially.
- Measure: route agent token usage to observability; watch cost per merged PR.

## How this pipeline embodies it
- `CLAUDE.md` is small and always-loaded (cached); heavy knowledge is in `knowledge/`/`architecture/`, pulled on demand.
- Agents are told (in their operating prompts) to load minimally and delegate searches.
- Workflows pass artifacts between stages; subagent isolation keeps fan-out output out of the orchestrator.
- `session-start` seeds just-enough durable context; nothing more.

→ Next: [Part 9 — Prompt Architecture](09-prompt-architecture.md)
