# Part 12 — Enterprise Best Practices

Conventions that make the pipeline safe and durable at organizational scale. Each is a recommendation with a rationale; adapt thresholds to your risk posture.

## Conventions matrix

| Area | Convention | Why |
|------|-----------|-----|
| **Naming** | Agents/skills/hooks/prompts: `kebab-case`, role- or capability-named, stable. Canonical names live in `CLAUDE.md`. | Cross-references (docs, hooks, prompts) depend on stable names |
| **Folder structure** | Vendor the whole pipeline; keep only `CLAUDE.md` (+ local settings/mcp) project-specific | Reuse across projects without divergence |
| **Agent communication** | Hand off **artifacts** (PRD/spec/TSD/contract/diff/findings), not transcripts | Clean context, auditable trail |
| **Prompt versioning** | Semver in the header; changelog in `prompts/README.md`; eval before merge | Improve prompts systematically; catch regressions |
| **Skill versioning** | Version significant changes; keep `references/` in sync; note in the skill | Skills are shared expertise — changes ripple |
| **MCP management** | Tiered registry; least-privilege creds; `${ENV_VAR}` only; security sign-off for egress | MCP is a privilege + data-egress surface |
| **Hooks management** | Security hooks via **managed settings** (non-disableable); fast + fail-safe/closed; all log | Safety can't depend on individuals or the model |
| **Secrets** | Env/secret-manager only; never in code/logs/context; enforced by `secret-scan` + `pre-edit-guard` + `.gitignore` + `deny` perms | Multiple independent layers |
| **Code ownership** | Pipeline owned by platform/DevEx; changes via PR + `prompt-engineering` review; `CODEOWNERS` on `.claude/` | Prevent drift, keep quality |
| **Context limits** | Load task + touched files + relevant memory; delegate searches; summarize before growing | Avoid pollution + cost |
| **Caching** | Stable preamble (`CLAUDE.md`, skills) constant → prompt-cached; variable task last | Cheaper, faster turns |
| **Memory** | Long-term = `knowledge/`/`architecture/`; write only the non-obvious; never secrets/PII | Durable, clean, safe memory |
| **Cost optimization** | Model tier by task (opus judgment / sonnet execution); parallel over serial; delegate heavy reads | Right cost for the value |
| **Token optimization** | Structured artifacts over raw dumps; progressive disclosure; prune dead ends | Fewer tokens, better focus |
| **Security** | Least privilege per agent; mandatory gates; untrusted MCP/web content = data not instructions | Defense in depth |
| **Scalability** | Stateless agents; parallel fan-out via workflows; worktree isolation for concurrent edits | Scale to large codebases/teams |
| **Maintainability** | Docs cross-link live files; ADRs for decisions; pipeline versioned & tagged | Evolve without rot |

## Secrets — the layered defense (worth spelling out)
1. `.gitignore` keeps `.env*`/keys out of the repo.
2. `settings.json` `deny` blocks reading secret files.
3. `pre-edit-guard` blocks *writing* to secret files.
4. `secret-scan` (post-edit + pre-commit + CI gitleaks) blocks committing a leaked secret.
5. Agents are instructed never to echo secrets; output is scrubbed.
No single layer is trusted alone.

## Enterprise managed settings
Deliver the non-negotiables — the security hooks, the `deny` permission list, required MCP credential scoping — via Claude Code **enterprise managed settings**, which individual `settings.local.json` cannot override. This is what turns "we have a policy" into "the policy is enforced."

## Versioning the pipeline itself
- Tag releases (`v1.3.0`); projects pin `pipeline_version` in `CLAUDE.md`.
- Upgrade deliberately via `automation/scripts/sync-pipeline.sh` (preserves local `CLAUDE.md`).
- Breaking changes to agents/hooks get a migration note.

## Observability of the pipeline
Route `hooks.log`, `notify` events, MCP invocations, and per-agent token usage into your observability/SIEM stack. Track: cost per merged PR, gate pass/fail rates, MTTR, secret-scan blocks, vuln-scan blocks. You can't improve what you don't measure.

## Rollout discipline
Adopt via the ladder in `ADOPTION.md` (constitution → safety hooks → core agents → full roster → skills → MCP → orchestration). Don't big-bang.

→ Next: [Part 13 — Worked Example: Banking](13-example-banking.md)
