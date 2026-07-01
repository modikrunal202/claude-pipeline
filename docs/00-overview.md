# The Enterprise AI-Powered SDLC Pipeline — Overview

> An official-style reference architecture for running the **entire** software development lifecycle with Claude Code, reusable across any tech stack. This is Part 0 of a 15-part guide.

## Why this exists

Most teams adopt Claude Code as a faster autocomplete. That leaves most of the value on the table and creates new risks (inconsistent output, secrets in context, unreviewed changes at machine speed). This architecture treats Claude Code as the **orchestration layer of the SDLC** — a set of specialized agents, governed tools, enforced gates, and durable memory — so an organization gets *speed with control*.

Designed from first principles, not from current defaults: we assume nothing about your stack and we do not assume Claude's out-of-the-box behavior is sufficient for enterprise use. Every component below is either **mandatory** (safety/quality-critical), **recommended** (high leverage), or **optional** (advanced).

## The five pillars

| Pillar | Claude Code primitive | What it gives you | Where |
|--------|----------------------|-------------------|-------|
| **Specialized roles** | Subagents | 19 role-scoped agents (PM → release manager), each least-privilege | `.claude/agents/`, Part 4 |
| **Repeatable expertise** | Skills | 23 skills auto-invoked by task, encoding how work is done well | `.claude/skills/`, Part 5 |
| **Enforced guardrails** | Hooks | Deterministic gates (secrets, tests, format, schema/API/vuln) that don't depend on the model remembering | `.claude/hooks/`, Part 6 |
| **Governed reach** | MCP servers | Typed, least-privilege access to git, trackers, DBs, monitoring, cloud | `.claude/mcp/`, Part 7 |
| **Durable memory** | CLAUDE.md + knowledge base | Context that persists and doesn't pollute | `.claude/CLAUDE.md`, `knowledge/`, Part 8 |

These are woven together by **prompt templates** (Part 9), **workflows/playbooks** (Parts 10–11), and **best-practice conventions** (Part 12).

## How to read this guide

| If you are… | Read, in order |
|-------------|----------------|
| An executive / architect evaluating it | Part 0 → Part 1 (architecture) → Part 13 (worked example) → the HTML Artifact overview |
| An engineer adopting it | `ADOPTION.md` → Part 2 (repo) → Part 10 (feature workflow) → Parts 4–7 (components) |
| A skeptic | Part 13 (see it run) → Part 14 (mistakes it prevents) |
| A platform/DevEx owner | Parts 6–7 (hooks/MCP) → Part 12 (best practices) → Part 15 (evolution) |

## Contents

0. **Overview** (this file)
1. [Overall Architecture](01-architecture.md)
2. [Repository Structure](02-repo-structure.md)
3. [Complete SDLC Flow (23 stages)](03-sdlc-flow.md)
4. [Subagent Design](04-subagents.md)
5. [Skills Library](05-skills.md)
6. [Hooks](06-hooks.md)
7. [MCP Servers](07-mcp.md)
8. [Context Engineering](08-context-engineering.md)
9. [Prompt Architecture](09-prompt-architecture.md)
10. [Feature Development Workflow](10-feature-workflow.md)
11. [Bug Fix / Incident Workflow](11-bugfix-workflow.md)
12. [Enterprise Best Practices](12-best-practices.md)
13. [Worked Example — Banking (P2P transfer)](13-example-banking.md)
14. [Common Mistakes](14-common-mistakes.md)
15. [Future Enhancements](15-future.md)

## Non-negotiables (the short version)

1. **Humans hold the gates.** Automation proposes; a human approves every 🔒 checkpoint (requirements, architecture, security, review, deploy).
2. **Security gates cannot be disabled.** Secret-scan, vuln-scan, and security review for auth/money/PII are mandatory and delivered via managed settings.
3. **Least privilege everywhere.** Each agent gets only the tools/MCP its role needs; secrets never enter context.
4. **Verify before "done."** Claimed success is backed by observed test/gate results.
5. **Docs mirror the scaffold.** This guide cross-links the live `.claude/` files so it can't silently drift.

## Design trade-offs, stated up front

- **Governance vs speed.** We add gates. They cost minutes and prevent incidents. Tune the *ceremony* (hotfix path) but never the *safety* gates.
- **Many small agents vs one big agent.** Role specialization improves quality and enables least-privilege and parallelism, at the cost of orchestration complexity — which the workflows absorb.
- **Configurable vs opinionated.** We ship strong defaults but make everything overridable in `CLAUDE.md`/`settings.json`, so the pipeline fits regulated and startup contexts alike.
