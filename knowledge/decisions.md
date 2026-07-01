# Decision Log

> Append-only. Newest at the bottom. The `session-start` hook tails this file into new sessions. One line per decision: `YYYY-MM-DD · decision · why · link`. For architectural decisions, also write a full ADR in `architecture/adr/` and link it here.

---

- 2026-07-01 · Adopted the Claude Code Enterprise SDLC pipeline · standardize AI-assisted delivery with enforced security/quality gates · see [ADR-0001](../architecture/adr/0001-adopt-claude-sdlc-pipeline.md)
- 2026-07-01 · Security gates (secret-scan, vuln-scan, security-review for auth/money/PII) made non-skippable via managed settings · prevent individuals from disabling safety controls under deadline pressure · see `docs/12-best-practices.md`
