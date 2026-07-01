# Part 3 — Complete SDLC Flow (23 stages)

Every stage maps to an **owning agent**, the **skills** it uses, the **hooks** that fire, the **MCP** it needs, the **context** it loads, its **inputs/outputs**, **success criteria**, **human 🔒 gate** (if any), and **automation** opportunity. Two tables per the width limit: (A) agent/skills/hooks/MCP/gate/automation, (B) context/inputs/outputs/success.

## Table A — ownership & governance

| # | Stage | Owning agent | Skills | Hooks fired | MCP | 🔒 Gate | Automation |
|---|-------|--------------|--------|-------------|-----|--------|------------|
| 1 | Requirement gathering | product-manager | — | session-start | issue-tracker, knowledge-base | 🔒 requirements | Auto-draft PRD from ticket |
| 2 | Requirement refinement | business-analyst | — | — | issue-tracker | — | Edge-case enumeration |
| 3 | Functional spec | business-analyst | documentation | — | knowledge-base | — | Spec from PRD |
| 4 | Technical spec | architect | architecture, adr-authoring | api/schema-change-guard | knowledge-base, git | 🔒 architecture | TSD scaffold + ADR drafts |
| 5 | Architecture design | architect | architecture | — | git, knowledge-base | 🔒 architecture | C4 diagram generation |
| 6 | API contracts | api-reviewer | api-design | api-change-guard | openapi, github | — | Contract lint + client gen |
| 7 | Database design | database-engineer | database, migration | schema-change-guard | postgres | — | Migration + index suggestions |
| 8 | Sprint planning | product-manager | — | — | issue-tracker | — | Estimate + capacity draft |
| 9 | Task breakdown | architect + product-manager | architecture | — | issue-tracker | — | Auto-split into tickets |
| 10 | Coding | backend/frontend/mobile/infra-engineer | backend, frontend, api-design, backend | pre-edit-guard, secret-scan, post-edit-format, on-stop-verify | git, openapi, postgres | — | Implement from TSD |
| 11 | Testing | qa-engineer | testing | on-test-fail | browser | — | Test generation + E2E |
| 12 | Security scanning | security-reviewer | security | secret-scan, vuln-scan | security-scanner | 🔒 security | SAST/SCA in CI |
| 13 | Performance optimization | performance-engineer | performance, observability | — | postgres, monitoring | — | Profile + load test |
| 14 | Documentation | documentation-writer | documentation, adr-authoring | — | knowledge-base | — | Docs from code + contract |
| 15 | Code review | code-reviewer | code-review, security, testing | — | git, github | 🔒 review | Auto-review before human |
| 16 | Bug fixing | bug-investigator | debugging, testing | on-test-fail | git, monitoring | — | Repro + failing test |
| 17 | Release preparation | release-manager | git | pre-commit | github, issue-tracker | — | Release notes from commits |
| 18 | Deployment | devops-engineer + release-manager | docker, kubernetes, git | pre-deploy, post-deploy | github, docker, kubernetes, cloud | 🔒 deploy | Canary → promote in CI |
| 19 | Monitoring | devops-engineer | observability | post-deploy | monitoring | — | Auto-watch + alert wiring |
| 20 | Incident handling | bug-investigator (IC) | debugging, observability | — | monitoring, git | 🔒 emergency | Triage + timeline capture |
| 21 | Hotfix workflow | bug-investigator + release-manager | debugging, git | secret-scan, vuln-scan, pre-deploy | github | 🔒 emergency deploy | Fast-track (safety kept) |
| 22 | Retrospective | documentation-writer | documentation | — | issue-tracker, knowledge-base | — | Postmortem draft |
| 23 | Technical debt mgmt | refactoring-specialist | refactoring | on-stop-verify | git | — | Debt detection + prioritization |

## Table B — context, I/O, success

| # | Stage | Context loaded | Inputs | Outputs | Success criteria |
|---|-------|----------------|--------|---------|------------------|
| 1 | Requirement gathering | CLAUDE.md, tracker | Idea/request, stakeholders | `templates/prd.md` | Problem + measurable goals agreed; PM sign-off |
| 2 | Requirement refinement | PRD | PRD | Clarified stories, edge cases | No ambiguity blocking design |
| 3 | Functional spec | PRD | Refined requirements | `templates/functional-spec.md` | Testable Given/When/Then per requirement |
| 4 | Technical spec | spec, arch docs, touched modules | Functional spec | `templates/technical-spec.md` + ADRs | Implementable w/o clarification; NFRs quantified |
| 5 | Architecture design | TSD, current C4 | TSD | Updated `architecture/` diagrams | Boundaries + failure modes explicit |
| 6 | API contracts | TSD, existing specs | TSD | `templates/api-contract.md` + OpenAPI | Consistent, versioned, backward-compat |
| 7 | Database design | TSD, current schema | TSD | `templates/database-design.md` + migration | Reversible; indexed; invariants enforced |
| 8 | Sprint planning | backlog | Prioritized reqs | Sprint plan | Scope fits capacity; deps ordered |
| 9 | Task breakdown | TSD | TSD | Task list / tickets | Each task independently buildable |
| 10 | Coding | touched code, conventions, contract | Task, TSD, contract | Code + tests (diff) | Lint/typecheck/tests green; matches contract |
| 11 | Testing | code, acceptance criteria | Change, criteria | Tests + `templates/test-plan.md` | Behavior coverage; deterministic |
| 12 | Security scanning | diff, data flow, compliance | Change, threat model | `templates/threat-model.md` + findings | No unmitigated HIGH/CRITICAL; gate go |
| 13 | Performance optimization | hot path, metrics | Change, budget, workload | Optimizations + before/after numbers | Meets perf budget; no regression |
| 14 | Documentation | change, contract | Change | Updated docs/ADR/KB | Accurate, current, audience-fit |
| 15 | Code review | diff + touched defs | Diff, intent | Ranked findings + verdict | Must-fixes have failure scenarios; tests green |
| 16 | Bug fixing | repro, logs, history | Symptom, repro, evidence | Failing test → fix → regression test | Root cause fixed; suite green |
| 17 | Release preparation | commits since tag | Merged changes | `templates/release-notes.md` | Notes complete; version chosen; gates listed |
| 18 | Deployment | release, health | Approved release | Deployed + tagged | Healthy post-deploy; rollback ready |
| 19 | Monitoring | SLOs, dashboards | Live signals | Alerts, watch report | SLIs within SLO; anomalies alerted |
| 20 | Incident handling | traces, recent changes | Alert/report | Mitigation + timeline | Impact stopped; MTTR minimized |
| 21 | Hotfix | failing prod path | Incident | Minimal fix deployed | Fixed; safety gates still passed; backported |
| 22 | Retrospective | incident data | Incident/sprint | `templates/postmortem.md` | Blameless; action items w/ owners |
| 23 | Technical debt mgmt | code smells, metrics | Debt signals | Prioritized + refactors | Debt paid under test cover; no behavior change |

## Human 🔒 gates (the five that matter)
1. **Requirements** — PM confirms we're building the right thing.
2. **Architecture** — lead accepts the design and its irreversible choices.
3. **Security** — security-reviewer + human clear auth/money/PII surfaces (mandatory, non-skippable).
4. **Review** — a human makes the final judgment call on the change.
5. **Deploy** — an approver authorizes production promotion.

Everything between gates is automatable; the gates are where human judgment is irreplaceable.

## Reading the flow
Stages 1–9 are **think** (cheap to change), 10–16 are **build/verify**, 17–19 **ship**, 20–23 **operate/learn**. Feedback from 19–22 flows back into 1 (new requirements) and 23 (debt) and into `knowledge/` — the loop is the point.

→ Next: [Part 4 — Subagent Design](04-subagents.md)
