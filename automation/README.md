# Automation — CI/CD and the Pipeline

This directory wires the Claude SDLC pipeline into your CI/CD system. The guiding principle is
**one source of truth for the gates**: CI does not re-implement checks — it *calls the same
hooks* that run locally in `.claude/hooks/`. A gate behaves identically whether Claude, a
developer, or a CI runner triggers it.

## How CI maps to pipeline stages

| Pipeline stage (see `docs/03-sdlc-flow.md`) | CI job | Hook(s) invoked | Blocking? |
|---------------------------------------------|--------|-----------------|:---------:|
| Commit hygiene (local + CI) | `validate` / pre-commit | `.claude/hooks/pre-commit.sh`, `secret-scan.sh` | ✅ |
| Static quality | `lint`, `typecheck` | (project commands via `resolve_cmd`) | ✅ |
| Test | `test` | (project `test` command); `on-test-fail.sh` on failure | ✅ |
| Security | `security` | `.claude/hooks/vuln-scan.sh` (SCA + SAST) | ✅ HIGH/CRITICAL block |
| Build | `build` | (project `build` command) | ✅ |
| Deploy — pre | `deploy` (gated) | `.claude/hooks/pre-deploy.sh` | ✅ 🔒 human gate |
| Deploy — post | `deploy` | `.claude/hooks/post-deploy.sh` | signals rollback |

## Where the human 🔒 gates live in CI
- **Pre-deploy approval.** The deploy workflow uses a **manual approval environment** (GitHub
  *Environments* / GitLab `when: manual`). The reviewer who approves sets `DEPLOY_APPROVED_BY`,
  which `pre-deploy.sh` requires — without it the deploy aborts. This is the same gate described
  in `playbooks/release.md`.
- **PR approval.** Branch protection requires human review before merge; `on-stop-verify` (run in
  the agent loop) additionally confirms tests were actually run before "done" is claimed.

## Stack-agnostic by design
The pipeline never hardcodes `npm`/`go`/`pytest`. Concrete commands come from **`PROJECT FACTS`**
in `.claude/CLAUDE.md` and are surfaced to hooks via `resolve_cmd` (see `.claude/hooks/lib.sh`).
In CI we mirror this: a single **setup step exports the commands as environment variables**
(`INSTALL_CMD`, `LINT_CMD`, `TYPECHECK_CMD`, `TEST_CMD`, `BUILD_CMD`) so the same workflow runs on
any stack. Set them once in repo/CI variables to match your project.

## Files here
| File | Purpose |
|------|---------|
| `github/ci.yml` | GitHub Actions: install → lint → typecheck → test → vuln-scan → build |
| `github/deploy.yml` | GitHub Actions: gated deploy with canary → promote, calling pre/post-deploy hooks |
| `gitlab/.gitlab-ci.yml` | Equivalent GitLab CI pipeline |
| `pre-commit-config.yaml` | pre-commit framework config wiring the local hooks |
| `scripts/sync-pipeline.sh` | Vendors/updates the pipeline from a central template repo |

## Adopting
1. Copy the workflow for your CI system into place (`.github/workflows/` or repo root).
2. Set the command env vars (`*_CMD`) in CI variables to match `PROJECT FACTS`.
3. Configure the deploy environment/approval and the `DEPLOY_APPROVED_BY`, `HEALTHCHECK_URL`
   variables.
4. Install the pre-commit config: `pre-commit install`.
5. Keep the pipeline current with `scripts/sync-pipeline.sh`.
