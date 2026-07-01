# Adoption Guide

How an engineering organization rolls this pipeline out — from a single curious developer to org-wide standard — without a big-bang migration.

---

## Adoption ladder

Adopt in stages. Each rung delivers value on its own; you never have to swallow the whole thing at once.

| Rung | You enable | You get | Effort |
|------|-----------|---------|--------|
| **0. Constitution** | `.claude/CLAUDE.md` only | Consistent conventions, commands, guardrails in every session | 30 min |
| **1. Safety hooks** | `secret-scan`, `on-test-fail`, `pre-commit` hooks | No secrets committed; broken code can't be committed | 1 hour |
| **2. Core agents** | `code-reviewer`, `bug-investigator`, `qa-engineer`, `security-reviewer` | Automated review + test generation + triage | Half a day |
| **3. Full agent roster** | All 19 agents | Whole-SDLC coverage, plan → ship | 1–2 days |
| **4. Skills + prompts** | `skills/`, `prompts/`, `templates/` | Repeatable expertise; standardized documents | 2–3 days |
| **5. MCP integration** | `mcp/mcp.json` (issue tracker, monitoring, DB) | Agents read Jira, query DBs, inspect Sentry directly | 2–3 days |
| **6. Orchestration** | `workflows/`, `automation/` CI wiring | Multi-agent pipelines in CI; fan-out review/test | 1 week |

**Recommendation:** most teams should target **Rung 3** in the first sprint and layer 4–6 over the following month.

---

## Step-by-step (single project)

### 1. Copy the scaffold
```bash
cp -r claude-pipeline/.claude       <project>/.claude
cp -r claude-pipeline/prompts       <project>/prompts
cp -r claude-pipeline/templates     <project>/templates
cp -r claude-pipeline/playbooks     <project>/playbooks
```

### 2. Write your CLAUDE.md facts
Open `<project>/.claude/CLAUDE.md` and fill the `PROJECT FACTS` block:
- Languages, frameworks, package managers
- Build / test / lint / typecheck commands
- Branch and commit conventions
- Directories that are off-limits or generated
- Definition of Done

Everything downstream (agents, hooks) reads these — this is the single source of truth.

### 3. Choose your MCP servers
Edit `.claude/mcp/mcp.json`. Keep the **essential** tier; enable **recommended** servers you have (issue tracker, monitoring); leave **optional** cloud/infra servers off until needed. Provide credentials via environment variables **only** — never inline (see `.claude/mcp/README.md`).

### 4. Wire hooks
```bash
chmod +x .claude/hooks/*.sh
```
Confirm `.claude/settings.json` references match your toolchain. Hooks auto-detect common toolchains; override via env vars in `settings.json` if detection misses.

### 5. Verify
```bash
python3 -m json.tool .claude/settings.json   > /dev/null && echo "settings OK"
python3 -m json.tool .claude/mcp/mcp.json     > /dev/null && echo "mcp OK"
for h in .claude/hooks/*.sh; do bash -n "$h" && echo "ok: $h"; done
```

### 6. Smoke test in Claude Code
```
claude
> /agents            # confirm your 19 agents load
> Use the code-reviewer agent to review the current diff
```

---

## Org-wide rollout

- **Central template repo.** Host this pipeline as `org/claude-pipeline`. Projects vendor it in or pull via a sync script (`automation/scripts/sync-pipeline.sh`).
- **Versioning.** Tag the pipeline (`v1.3.0`). Projects pin a version in `.claude/CLAUDE.md` (`PIPELINE_VERSION`) so upgrades are deliberate.
- **Ownership.** A platform / DevEx team owns agents, skills, and hooks. Changes go through PR + the `prompt-engineering` skill's review checklist.
- **Managed settings.** Use Claude Code **enterprise managed settings** to enforce non-negotiable permissions and hooks (e.g. the secret-scan hook cannot be disabled by an individual). See `docs/12-best-practices.md`.
- **Telemetry.** Route hook logs (`.claude/hooks/*` write to `.claude/logs/`) and agent outcomes into your observability stack for cost and quality tracking.

---

## Rollback / opt-out

Everything is additive and local to `.claude/` + top-level directories. To disable: remove hook entries from `settings.json`, or delete the directory. No project source is modified by adopting the pipeline itself.

---

## Compliance note

Regulated orgs (finance, health, gov) should review `docs/07-mcp.md` (data egress via MCP), `docs/12-best-practices.md` (secrets, audit), and the security-reviewer agent before enabling any MCP server that sends code or data off-host.
