# Part 14 — Common Mistakes (and how this architecture prevents them)

Failure modes teams hit when adopting Claude Code at scale, why they happen, and the specific mechanism here that prevents each.

| # | Mistake | Why it happens | How this architecture prevents it |
|---|---------|----------------|-----------------------------------|
| 1 | **Secrets leak into commits/context** | Speed pressure; secrets in configs; model echoes them | 4-layer defense: `.gitignore` + `deny` perms + `pre-edit-guard` + `secret-scan` (session + pre-commit + CI); managed settings make it non-disableable |
| 2 | **Unreviewed AI code merged fast** | Agents produce plausible code quickly; no gate | Mandatory `code-reviewer` auto-review + **🔒 human review gate**; CI blocks merge until green |
| 3 | **"It's done" but it doesn't compile/pass** | Model claims success it didn't verify | `on-stop-verify` re-prompts on red; DoD requires observed test results; CI re-checks |
| 4 | **Context pollution → degraded output** | Dumping whole files/logs; never pruning | Artifact hand-offs, delegated search, progressive disclosure, summarization (Part 8) |
| 5 | **One mega-agent doing everything** | Simpler to set up | 19 role-scoped agents; least-privilege tools; specialization improves quality |
| 6 | **Over-privileged tools / MCP** | "Give it everything so it works" | Least-privilege per agent; tiered MCP; read-only creds; mutations gated |
| 7 | **Prompt injection via issues/PRs/web** | MCP/web content treated as instructions | External content = untrusted **data**; effects gated; untrusted-content servers separated from mutators (Part 7) |
| 8 | **Hardcoded to one stack** | Examples copied literally | `CLAUDE.md` facts + toolchain auto-detection; nothing assumes a language |
| 9 | **Runaway cost** | Opus for everything; serial re-loading; no measurement | Model-tier policy; parallel fan-out; delegated reads; caching; cost telemetry (Part 12) |
| 10 | **Skills/agents/prompts drift & rot** | No ownership or versioning | Platform ownership + `CODEOWNERS`; semver + changelogs; `prompt-engineering` review; docs cross-link live files |
| 11 | **Fixing symptoms, not root cause** | Pressure to close the ticket | `bugfix` flow demands repro + failing test + 5-whys root cause |
| 12 | **No memory — repeated mistakes** | Everything ephemeral | `knowledge/` long-term memory; `session-start` re-injects decisions; postmortems feed back |
| 13 | **Skipping security under deadline** | "We'll do it after ship" | Security gate mandatory & non-skippable for auth/money/PII; even hotfix keeps it |
| 14 | **Big-bang deploys** | "It passed tests" | Canary → phased → full; `pre-deploy` gate; rollback ready; `post-deploy` watch |
| 15 | **Docs drift from reality** | Docs written once, code moves | Doc-as-code (same change updates behavior + docs); guide cross-links live files |
| 16 | **Adopting everything at once, then abandoning** | Overwhelm | The `ADOPTION.md` ladder delivers value rung by rung |
| 17 | **Refactor + behavior change in one commit** | Convenient | `refactoring` skill forbids it; behavior-preserving-under-tests discipline |
| 18 | **Migrations that lock/can't roll back** | Not thought through | `schema-change-guard` checklist; expand/contract + reversibility required |
| 19 | **Findings with no evidence ("looks buggy")** | Model over-asserts | Review/security require a **concrete failure/exploit scenario**; else labeled unverified |
| 20 | **Treating Claude as autocomplete** | Not rethinking the SDLC | The whole pipeline reframes Claude as the governed orchestration layer of the lifecycle |

## The meta-pattern
Most mistakes share a root: **relying on the model to remember or choose to do the right thing.** The architecture's answer is consistent — make the right thing *structural*: enforced by a hook, required by a gate, shaped by an artifact hand-off, or scoped by least privilege. Judgment stays with humans at the 🔒 gates; everything else is made hard to get wrong.

→ Next: [Part 15 — Future Enhancements](15-future.md)
