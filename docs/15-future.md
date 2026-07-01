# Part 15 — Future Enhancements

The architecture is designed to **absorb new Claude capabilities without redesign**, because it separates concerns into planes (Part 1). New capability slots into a plane; the contracts between planes stay stable. This part sketches the evolution path and the invariants that keep it maintainable.

## Design invariants (do not break these as you evolve)
1. **Humans hold the 🔒 gates.** More automation, same gates.
2. **Governance is deterministic.** New power comes with new guardrails, enforced by hooks/policy, not trust.
3. **Least privilege by default.** Every new agent/MCP starts read-only and minimal.
4. **Artifacts, not transcripts, between agents.** Keeps context clean as complexity grows.
5. **Docs mirror the scaffold; everything versioned.** No silent drift.

## Evolution roadmap

| Capability area | How the pipeline absorbs it | What to add |
|-----------------|-----------------------------|-------------|
| **New agent types** | Drop a file in `.claude/agents/`, register in `CLAUDE.md`, wire hand-offs | e.g. `data-scientist`, `sre`, `ml-engineer`, `compliance-officer`, `cost-optimizer` agents |
| **New MCP integrations** | Add a tiered entry in `mcp.json` with least-privilege creds + security sign-off | Feature-flag platform, data warehouse, incident tooling, design tools |
| **Longer / better memory** | Migrate `knowledge/` into a richer store; keep the write-only-the-non-obvious rule | Semantic memory index, per-domain knowledge graphs |
| **Larger context windows** | Loosen right-sizing where it pays, but keep artifact hand-offs — bigger ≠ dump everything | Whole-subsystem reasoning for architecture/refactor agents |
| **Stronger orchestration** | Encode new patterns in `workflows/` (tournaments, self-repair loops, staged escalation) | CI-run workflows for large migrations/audits |
| **Autonomous operation** | Extend gates + monitoring; expand the hotfix/incident automation *behind* human gates | Scheduled agents for dependency updates, flaky-test hunts, debt paydown |
| **Better evals** | Grow the prompt/agent eval set; gate pipeline changes on eval results | Regression suite for agents & prompts (Part 9) |
| **Multi-repo / platform scale** | Central template repo + `sync-pipeline.sh` + managed settings | Org-wide dashboards, fleet cost/quality telemetry |

## Where new capabilities plug in (by plane)
- **Control plane:** smarter routing, better context management → improves everything transparently.
- **Execution plane:** new agents = new roles; existing hand-offs and gates unchanged.
- **Capability plane:** new skills/MCP = more reach; governance still gates effects.
- **Governance plane:** new hooks/gates as new risks appear (e.g., a hook for AI-generated data, a gate for model-in-the-loop features).

## Maintainability practices as it grows
- **Deprecate cleanly:** supersede ADRs, don't rewrite history; retire agents/skills with a note, don't silently delete.
- **Keep the constitution small:** as facts accumulate, push detail to `knowledge/`; `CLAUDE.md` stays scannable.
- **Eval before ship:** treat agent/prompt changes like code — test, review, version.
- **Review the pipeline quarterly:** prune unused agents/skills/MCP; a smaller pipeline is a faster, cheaper, more secure one.
- **Watch the telemetry:** let cost/quality/gate metrics drive what to invest in next.

## The north star
As Claude gets more capable, the *ratio* shifts — more work between the gates is automated and verified — but the *shape* holds: humans set intent and hold judgment gates; the system does the rest, safely, with memory that compounds. This architecture is a bet that **the durable value is the governance and the structure, not any single model capability** — so it stays valid as the models underneath it improve.

← Back to [Overview](00-overview.md) · [Part 13 — Banking Example](13-example-banking.md)
