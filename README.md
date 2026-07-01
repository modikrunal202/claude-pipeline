# Claude Code Enterprise SDLC Pipeline

> **An official-style Anthropic reference architecture for running the entire software development lifecycle with Claude Code — reusable across any tech stack.**

This repository is a **drop-in pipeline template**. Clone it into a new or existing project, run the adoption steps, and you get a fully wired Claude Code environment: specialized subagents, a production-grade skills library, lifecycle hooks, an MCP server registry, reusable prompts, document templates, and operational playbooks — plus a 15-part guide (`docs/`) explaining the whole design.

It is **stack-agnostic**. Nothing here assumes a language, framework, cloud, or database. Toolchain-specific behavior is detected at runtime or read from `.claude/CLAUDE.md`, never hardcoded.

---

## What's in the box

| Directory | What it holds | Mandatory? |
|-----------|---------------|------------|
| `.claude/CLAUDE.md` | The "constitution" — operating manual + memory contract loaded into every session | ✅ Mandatory |
| `.claude/settings.json` | Hook wiring, permission allowlist, env, model routing | ✅ Mandatory |
| `.claude/agents/` | 19 specialized subagents (PM → Release Manager) | ✅ Mandatory (subset ok) |
| `.claude/skills/` | 23 production skills (architecture → prompt-engineering) | ⚙️ Recommended |
| `.claude/hooks/` | Lifecycle enforcement scripts (secret scan, tests, format, etc.) | ✅ Mandatory (security hooks) |
| `.claude/mcp/` | Tiered MCP server registry + security guidance | ⚙️ Recommended |
| `prompts/` | 11 reusable, parameterized prompt templates | ⚙️ Recommended |
| `templates/` | Document templates (PRD, TSD, ADR, threat model, postmortem…) | ⚙️ Recommended |
| `playbooks/` | Step-by-step operational runbooks (feature, hotfix, incident…) | ⚙️ Recommended |
| `workflows/` | Declarative multi-agent orchestration specs | 🔵 Optional |
| `automation/` | CI/CD templates (GitHub Actions, GitLab CI), pre-commit config | ⚙️ Recommended |
| `architecture/` | ADR index + C4 diagrams for the *host* project | ⚙️ Recommended |
| `knowledge/` | Long-term knowledge base + memory strategy | ⚙️ Recommended |
| `docs/` | **The 15-part architecture guide** | 📖 Reference |
| `examples/banking/` | End-to-end worked example (instant P2P transfer) | 📖 Reference |

**Legend:** ✅ Mandatory · ⚙️ Recommended (strongly advised, degrade gracefully without) · 🔵 Optional (advanced) · 📖 Reference (read, don't run).

---

## The 90-second mental model

```
                         ┌─────────────────────────────────────────┐
   Human Developer  ───► │        CLAUDE CODE (orchestrator)        │
   (intent + gates)      │  loads .claude/CLAUDE.md as constitution │
                         └───────────────┬─────────────────────────┘
                                         │ delegates by phase
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                ▼                ▼               ▼                 ▼
   Plan agents     Design agents    Build agents    Verify agents    Ship agents
   (PM, BA)        (Architect,      (Backend,       (QA, Security,   (DevOps,
                    API-reviewer,    Frontend,       Performance,     Release-mgr)
                    Database)        Mobile, Infra)  Code-reviewer,
                                                     A11y)
        │                │                │               │                 │
        └──── each agent draws on ► Skills · Hooks · MCP servers · Memory ◄──┘
```

Read `docs/01-architecture.md` for the full picture.

---

## Quick start

```bash
# 1. Copy the pipeline into your project (or start fresh here)
cp -r claude-pipeline/.claude   your-project/.claude
cp -r claude-pipeline/prompts   your-project/
# ...and any other directories you want.

# 2. Fill in your project's facts
$EDITOR your-project/.claude/CLAUDE.md      # stack, commands, conventions

# 3. Enable the MCP servers you need
$EDITOR your-project/.claude/mcp/mcp.json   # comment out what you don't use

# 4. Make hooks executable
chmod +x your-project/.claude/hooks/*.sh

# 5. Open Claude Code in the project and go
claude
```

Full rollout guidance — including phased team adoption — is in **[`ADOPTION.md`](./ADOPTION.md)**.

---

## Design principles

1. **Stack-agnostic by construction.** Behavior is discovered (`CLAUDE.md`, project files) or configured, never assumed.
2. **Least privilege everywhere.** Each agent gets only the tools and MCP servers its role requires. Secrets never enter context.
3. **Docs mirror the scaffold.** The `docs/` guide cross-links live `.claude/` files so documentation cannot silently drift from behavior.
4. **Mandatory vs optional is explicit.** You can adopt the security hooks alone, or the whole thing.
5. **Humans hold the gates.** Automation proposes; humans approve at defined checkpoints (see `docs/03-sdlc-flow.md`).
6. **Everything is versioned.** Agents, skills, prompts, and MCP config carry versions and changelogs.

---

## Where to start reading

- **Executives / architects:** `docs/00-overview.md` → the HTML Artifact overview.
- **Engineers adopting it:** `ADOPTION.md` → `docs/02-repo-structure.md` → `docs/10-feature-workflow.md`.
- **Skeptics / evaluators:** `docs/13-example-banking.md` (see it run end-to-end) → `docs/14-common-mistakes.md`.

---

*This is a reference architecture, not an Anthropic product. Adapt it to your org's risk posture and compliance regime.*
