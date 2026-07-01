# Part 1 — Overall Architecture

The pipeline is organized as **planes** (like a distributed system): a control plane that orchestrates and governs, an execution plane of specialized agents, a capability plane they draw on, and a governance plane that enforces rules and holds human gates. Data (context) flows between them deliberately.

## Enterprise architecture (full view)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                     HUMAN LAYER                                          │
│   Developer · Tech Lead · PM · Security · SRE   ── set intent, approve 🔒 gates ──       │
└───────────────────────────────┬─────────────────────────────────────────────────────────┘
                                │ intent, approvals
                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                          CONTROL PLANE — Claude Code orchestrator                        │
│   • loads .claude/CLAUDE.md (constitution)   • routes work to agents by SDLC phase       │
│   • manages context (load/compress/summarize)  • enforces least-privilege delegation     │
└───────┬───────────────────────────────────────────────────────────────────────┬─────────┘
        │ delegates                                                               │ reads/writes
        ▼                                                                         ▼
┌──────────────────────────────────────────────────────────────────┐   ┌─────────────────────┐
│                 EXECUTION PLANE — specialized subagents            │   │   MEMORY / CONTEXT   │
│                                                                    │   │  • CLAUDE.md (const) │
│  PLAN      product-manager ─▶ business-analyst                     │   │  • knowledge/ (LT)   │
│              │                                                     │◀─▶│  • architecture/     │
│  DESIGN    architect ─┬─▶ api-reviewer                             │   │  • issue tracker     │
│              │        └─▶ database-engineer                        │   │  • session (ST)      │
│  BUILD     backend/frontend/mobile/infrastructure-engineer         │   └─────────────────────┘
│              │                                                     │
│  VERIFY    code-reviewer · qa-engineer · security-reviewer         │
│            performance-engineer · accessibility-auditor            │
│              │                                                     │
│  SHIP      release-manager ─▶ devops-engineer                      │
│  SUSTAIN   bug-investigator · refactoring-specialist · docs-writer │
└───────┬──────────────────────────────────┬────────────────────────┘
        │ each agent draws on ↓             │ each agent action passes through ↓
        ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────────────────────────────┐
│      CAPABILITY PLANE          │   │             GOVERNANCE PLANE (enforced)                 │
│  ┌─────────┐  ┌─────────────┐  │   │  HOOKS (deterministic):                                 │
│  │ Skills  │  │ MCP servers │  │   │   pre-edit-guard · pre-bash-guard · secret-scan(🔒)     │
│  │ (23)    │  │ git·github  │  │   │   post-edit-format · schema/api-change-guard            │
│  │ how-to  │  │ postgres·   │  │   │   on-stop-verify · pre-commit · vuln-scan(🔒) · deploy  │
│  │ expertise│  │ monitoring… │  │   │                                                         │
│  └─────────┘  └─────────────┘  │   │  HUMAN 🔒 GATES: requirements · architecture ·          │
│  Prompt templates (11)         │   │   security · review · deploy                            │
└───────────────────────────────┘   └───────────────────────────────────────────────────────┘
        │                                              │
        └──────────────► DELIVERY (CI/CD) ◄────────────┘
              automation/ (GitHub Actions / GitLab CI) calls the same hooks
              → build → canary → 🔒 approve → promote → monitor → feedback
```

## The four planes

| Plane | Responsibility | Realized by |
|-------|----------------|-------------|
| **Control** | Orchestrate, route by phase, manage context, enforce delegation | Claude Code + `CLAUDE.md` |
| **Execution** | Do the SDLC work, role by role | 19 subagents (`.claude/agents/`) |
| **Capability** | Supply expertise and governed reach | Skills, MCP, prompts |
| **Governance** | Enforce rules deterministically; hold human gates | Hooks + 🔒 gates + CI |

**Why planes?** It separates *who decides* (humans, control plane) from *who does* (agents) from *what's allowed* (governance). Each can evolve independently — you can add an agent without touching hooks, tighten a hook without touching agents, or swap an MCP server without changing workflows.

## Control flow (a change, end to end)

```
intent ─▶ orchestrator picks phase ─▶ delegates to agent ─▶ agent uses skills+MCP
      ─▶ every edit/command passes hooks ─▶ output ─▶ next phase or 🔒 human gate
      ─▶ CI re-runs the same governance in the pipeline ─▶ deploy ─▶ monitor ─▶ feedback ─▶ memory
```

Two properties make this enterprise-grade:
1. **Defense in depth.** The same rules (secrets, tests, vuln-scan) are enforced *both* inside the session (Claude Code hooks) *and* in CI (lifecycle hooks) — a mistake has to bypass two independent layers.
2. **Governance is deterministic, not model-dependent.** Safety doesn't rely on the model "remembering" — hooks are code that runs regardless.

## Data flow (context) — summary
Context is loaded narrowly and flows *forward* between agents as structured artifacts (PRD → spec → TSD → contracts → code → review → release notes), not as raw conversation. Long-term facts live in memory (Part 8), so agents start oriented without re-reading everything.

## Mandatory vs optional (at a glance)
- **Mandatory:** control plane (`CLAUDE.md` + orchestrator), the security hooks, and the human 🔒 gates.
- **Recommended:** the full agent roster, skills, MCP, prompts, CI wiring.
- **Optional:** advanced orchestration (`workflows/`), optional MCP servers (cloud/k8s/terraform).

→ Next: [Part 2 — Repository Structure](02-repo-structure.md)
