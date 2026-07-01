# Architecture

Living documentation of the **host project's** architecture. Maintained by the `architect` agent (authors) and `documentation-writer` (upkeep). Kept current in the same change that alters structure — stale architecture docs are worse than none.

## Contents
- `system-overview.md` — C4 context (L1) and container (L2) views + narrative.
- `adr/` — Architecture Decision Records (see `adr/README.md` for the index). Written via the `adr-authoring` skill from `templates/adr.md`.

## When to update
- **New component or boundary** → update `system-overview.md` diagrams.
- **Significant/irreversible/cross-cutting decision** → write an ADR.
- Diagrams are ASCII or Mermaid (renders in most viewers, diffs cleanly, no binary assets).

## Relationship to other memory
This is **project state** (current truth). Durable lessons/decisions also get a one-line entry in `knowledge/decisions.md`; conventions live in `.claude/CLAUDE.md`. See `knowledge/README.md` for the full memory model.
