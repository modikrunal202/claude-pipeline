# Knowledge Base — Long-Term Memory

This directory is the pipeline's **durable, cross-session memory**. It complements the memory tiers defined in `.claude/CLAUDE.md`:

| Tier | Lives in | Lifespan | Who writes |
|------|----------|----------|-----------|
| **Constitution** (facts, conventions) | `.claude/CLAUDE.md` | project life; changed via PR | humans + platform team |
| **Long-term knowledge** (this dir) | `knowledge/` | durable across sessions | `documentation-writer`, any agent making a non-obvious decision |
| **Project state** | `architecture/` + issue tracker (MCP) | current | `architect`, `documentation-writer` |
| **Session / short-term** | the conversation | one session | ephemeral — never persist secrets/PII |

## Files
- `decisions.md` — chronological decision log. **The `session-start` hook tails this** so recent decisions load into every new session. Append-only; newest at the bottom.
- `glossary.md` — domain + pipeline terminology, so agents share vocabulary.
- `patterns.md` — reusable, proven solution patterns for this codebase.

## When to write a durable note
Write to `knowledge/` when a **non-obvious** fact is established: a trade-off, a workaround, a constraint, a "we tried X and it didn't work." 

**Do not** record what the code, tests, or git history already make obvious. If asked to "remember" something derivable from the repo, capture instead *what was non-obvious about it*.

## How agents use it
- On session start, recent `decisions.md` entries are injected as context.
- `architect`/`documentation-writer` update `patterns.md` and `glossary.md` as the system evolves.
- Postmortems (`templates/postmortem.md`) feed lessons here.
- Never store secrets, credentials, or PII in this directory.
