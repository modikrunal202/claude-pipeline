# Part 2 — Repository Structure

The layout separates **standing behavior** (agents/skills/hooks — how the org works), **task assets** (prompts/templates — how a piece of work is shaped), **operational knowledge** (playbooks/knowledge/architecture), and **delivery** (automation). This separation is what makes the pipeline reusable: you vendor the shared parts and keep only `CLAUDE.md` project-specific.

```
claude-pipeline/
├── README.md                 # what this is; mandatory vs optional; quick start
├── ADOPTION.md               # phased rollout (single project → org-wide)
├── .gitignore                # ignores local state + secrets
│
├── .claude/                  # ── everything Claude Code loads ──
│   ├── CLAUDE.md             # THE CONSTITUTION: facts, conventions, roster, memory contract, guardrails
│   ├── settings.json         # hook wiring, permission allow/ask/deny, env, model routing (shared, committed)
│   ├── settings.local.json.example  # per-dev overrides (copy → settings.local.json, gitignored)
│   ├── agents/               # 19 subagent definitions (role, tools, model, prompt)
│   ├── skills/               # 23 skills; each <skill>/SKILL.md (+ references/)
│   ├── hooks/                # lifecycle enforcement scripts + hooks.md catalog + lib.sh
│   └── mcp/                  # mcp.json (tiered registry) + README.md (security model)
│
├── prompts/                  # 11 reusable, parameterized prompt templates + README (versioned)
├── templates/                # 10 document templates: prd, functional/technical spec, adr,
│                             #   api-contract, database-design, threat-model, test-plan,
│                             #   release-notes, postmortem
├── playbooks/                # human runbooks: feature, bug-fix, hotfix, release, incident, tech-debt, migration
├── workflows/                # machine orchestration: feature-flow (+ .workflow.js), bugfix-flow
├── automation/               # CI/CD that calls the SAME hooks: github/, gitlab/, pre-commit, scripts/
│
├── architecture/             # host-project architecture: system-overview + adr/ (living docs)
├── knowledge/                # long-term memory: decisions.md, glossary.md, patterns.md
│
├── docs/                     # THIS 15-part guide
└── examples/banking/         # end-to-end worked example (Part 13)
```

## What belongs where — and why

| Folder | Belongs here | Does NOT belong here | Lifecycle owner |
|--------|--------------|----------------------|-----------------|
| `.claude/CLAUDE.md` | Project facts, commands, conventions, guardrails | Long prose, task details, secrets | Humans + platform (via PR) |
| `.claude/settings.json` | **Shared** hooks/permissions/env | Personal grants, secrets | Platform team |
| `.claude/settings.local.json` | **Personal** overrides (gitignored) | Shared policy, secrets | Individual dev |
| `.claude/agents/` | Standing role definitions (who does what) | Task-specific instructions | Platform / DevEx |
| `.claude/skills/` | Reusable *how-to* expertise | Project-specific one-offs | Platform / DevEx |
| `.claude/hooks/` | Deterministic enforcement | Anything that needs judgment (that's an agent) | Platform / security |
| `.claude/mcp/` | Server registry + security notes | Credentials (env vars only) | Platform / security |
| `prompts/` | Parameterized task requests | Standing instructions (those are agents) | Platform / DevEx |
| `templates/` | Document skeletons | Filled-in instances (those go in the project/tracker) | Platform |
| `playbooks/` | Step-by-step human procedures | Automated logic (that's workflows) | Eng leads |
| `workflows/` | Machine orchestration specs | Human ceremony | Platform |
| `automation/` | CI/CD config calling hooks | Secrets (use CI secret store) | Platform / SRE |
| `architecture/` | Current design + ADRs of the **host project** | Pipeline internals | `architect` |
| `knowledge/` | Durable, non-obvious facts | What code/git already shows; secrets | `documentation-writer` |
| `docs/` | This reference guide | Project product docs | Platform |

## Committed vs local vs generated
- **Committed (shared):** `.claude/{CLAUDE.md,settings.json,agents,skills,hooks,mcp}`, `prompts/`, `templates/`, `playbooks/`, `workflows/`, `automation/`, `architecture/`, `knowledge/`, `docs/`.
- **Local (gitignored):** `.claude/settings.local.json`, `.claude/logs/`, `.claude/.cache/`.
- **Never committed:** secrets, `.env*`, keys — enforced by `.gitignore` + the `secret-scan` hook + `pre-edit-guard`.

## Reuse model
When adopting into a real project, most directories are **vendored verbatim** from the central template (see `automation/scripts/sync-pipeline.sh`). Only `CLAUDE.md` (and `settings.local.json`, `mcp.json` choices) are project-specific. This is what lets one pipeline serve web apps, APIs, mobile, infra, and AI projects alike — the *behavior* is shared, the *facts* are local.

→ Next: [Part 3 — Complete SDLC Flow](03-sdlc-flow.md)
