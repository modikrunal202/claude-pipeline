# ADR-0001: Adopt the Claude Code Enterprise SDLC pipeline

- **Status:** Accepted
- **Date:** 2026-07-01
- **Deciders:** Engineering leadership, Platform/DevEx team
- **Tags:** process, tooling, security

## Context
Engineers are adopting Claude Code ad hoc. This yields inconsistent output quality, no enforced review or security gates, risk of secrets entering context, and no shared memory of decisions. We need AI-assisted delivery that is *fast and governed*, works across our heterogeneous stacks, and satisfies our compliance obligations.

## Decision
We will adopt the Claude Code Enterprise SDLC pipeline as the standard: role-scoped subagents, a skills library, enforced hooks, a tiered MCP registry, prompt templates, and a durable knowledge base — with mandatory human 🔒 gates and non-skippable security hooks delivered via enterprise managed settings.

## Options considered
| Option | Pros | Cons |
|--------|------|------|
| A. Adopt this pipeline (chosen) | Consistent quality; enforced safety; stack-agnostic; incremental adoption | Upfront setup; team learning curve |
| B. Ad hoc Claude Code use | Zero setup | No gates; inconsistent; audit/security risk |
| C. Build a bespoke internal framework | Fully tailored | High cost; reinvents this; slower to value |
| D. Do nothing / avoid AI assistance | No change-management | Forgoes large productivity gains; shadow usage anyway |

## Consequences
- **Positive:** uniform SDLC across teams; security/quality gates enforced by construction; parallelizable multi-agent workflows; captured institutional knowledge.
- **Negative / trade-offs:** added gate latency (mitigated by the hotfix ceremony path); a template repo the platform team must own and version.
- **Follow-ups:** stand up managed settings; wire MCP servers with least-privilege creds; train teams via `ADOPTION.md`; establish the pipeline versioning cadence.

## Compliance / reversibility
Reversible: the pipeline is additive under `.claude/` and top-level dirs; removing it modifies no product source. Enabling MCP servers that egress data requires security-reviewer + compliance sign-off (see `docs/07-mcp.md`).
