# Part 6 — Hooks

Hooks are the pipeline's **deterministic conscience**. Agents reason and can be wrong; hooks are code that runs every time regardless of what the model "decides." Anything that must *always* hold — no secrets committed, tests pass before done, formatting applied, vulnerabilities blocked — belongs in a hook, not a prompt.

Full scripts + catalog: [`.claude/hooks/`](../.claude/hooks/) and [`hooks.md`](../.claude/hooks/hooks.md).

## Two layers (defense in depth)
1. **Claude Code hooks** (`settings.json`) — fire during a session (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`). They guard what Claude does *as it works*.
2. **Lifecycle hooks** (git + CI, in `automation/`) — guard the *delivery pipeline*. They re-enforce the same rules so a mistake must bypass two independent layers.

## The contract
Read a JSON event on **stdin** →
- `exit 0` = allow/success · `exit 2` = **block** (stderr returned to Claude) · or print `{"decision":"block","reason":"…"}` for rich control.
- **Fast** (<2s), **fail-safe** for non-security hooks, **fail-closed** for security hooks. All log to `.claude/logs/hooks.log`.

## Catalog — trigger · action · failure · notify · logging

| Hook | Trigger | Action | Failure handling | Notify | Logging |
|------|---------|--------|------------------|--------|---------|
| `session-start` | Session begins | Inject recent decisions + git state | Non-fatal (never blocks) | — | hooks.log |
| `pre-edit-guard` | Before Edit/Write | Block edits to secret/generated/vendored paths | exit 2 blocks edit | — | path + verdict |
| `pre-bash-guard` | Before Bash | Block destructive cmds (rm -rf /, force-push, mkfs) | exit 2 blocks cmd | — | blocked cmd |
| `secret-scan` 🔒 | After Edit/Write | gitleaks/regex scan for secrets | exit 2 blocks; **mandatory** | — | file + result |
| `post-edit-format` | After Edit/Write | Format the one edited file | Non-fatal | — | file |
| `schema-change-guard` | Schema/migration edited | Require reversibility + DB review checklist | Soft-block w/ reason | — | file |
| `api-change-guard` | API contract edited | Require compat/version + api-reviewer checklist | Soft-block w/ reason | — | file |
| `on-stop-verify` | Turn ends w/ uncommitted code | Fast typecheck+lint; re-prompt if red | Re-prompts once (loop-safe) | — | pass/fail |
| `pre-commit` 🔒 | Before commit | Staged secret scan + lint + typecheck | exit 1 aborts commit | — | rc |
| `on-test-fail` | Test suite red | Capture output; pointer for bug-investigator | Reporter (never fails build) | #ci | report path |
| `vuln-scan` 🔒 | Pre-merge/deploy/dep change | SCA + SAST | exit 1 on HIGH/CRITICAL; **mandatory** | #security | findings |
| `pre-deploy` 🔒 | Deploy initiated | Require approval + green tests + clean scan | exit 1 aborts deploy | #releases | env, approver, rc |
| `post-deploy` | Deploy finished | Healthcheck; seed 30m watch; tag | exit 1 = rollback signal | #releases/#oncall | health, rc |

`notify.sh` is the shared notifier — posts to a webhook (`CLAUDE_NOTIFY_WEBHOOK`) or logs.

## Design rationale
- **Guards before, checks after.** `Pre*` hooks *prevent* (block a bad edit/command); `Post*` hooks *detect* (scan the result). Both are cheap insurance.
- **Advisory vs blocking.** Schema/API guards are *advisory* (they inject a checklist reason, not a hard stop) because judgment is needed; secret/vuln hooks are *blocking* because the rule is absolute.
- **Stack-agnostic.** `lib.sh` detects the toolchain (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`) or reads `CLAUDE_*_CMD` env — no hook hardcodes a language.
- **Loop-safe.** `on-stop-verify` checks `stop_hook_active` so a re-prompt can't loop forever.

## Failure-handling philosophy
| Hook class | On failure | Why |
|-----------|-----------|-----|
| Security (secret/vuln) | **Fail closed** — block | A bypassed security check is worse than a halted task |
| Quality (lint/typecheck/test) | Block commit/finish | Broken code shouldn't advance |
| Convenience (format) | **Fail open** — skip, log | A formatter crash must not wedge work |
| Reporters (on-test-fail) | Never fail the pipeline | They inform, they don't gate |

## Enterprise enforcement
Security hooks (`secret-scan`, `vuln-scan`, `pre-commit`, `pre-bash-guard`) ship via Claude Code **enterprise managed settings**, so an individual can't disable them under deadline pressure. See [Part 12](12-best-practices.md). Route `hooks.log` and `notify` events into your SIEM/observability stack for audit.

→ Next: [Part 7 — MCP Servers](07-mcp.md)
