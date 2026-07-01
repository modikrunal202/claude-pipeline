# Part 7 — MCP Servers

Model Context Protocol servers give agents **typed, governed** access to systems beyond files — git, issue trackers, databases, monitoring, cloud. MCP is also a **privilege and data-egress surface**, so the registry is tiered and every server runs least-privilege. Registry + security model: [`.claude/mcp/`](../.claude/mcp/).

## Categories & recommendations

| Category | Server(s) | Why it exists | Used by | Tier |
|----------|-----------|---------------|---------|------|
| **Development** | filesystem | Scoped file access beyond project root | all | essential |
| **Git** | git | Structured history/blame/bisect/diff | bug-investigator, code-reviewer, refactoring | essential |
| **GitHub/GitLab** | github | PRs, issues, reviews, checks | release-manager, code-reviewer, PM, devops | essential |
| **Issue tracking** | issue-tracker (Jira/Linear/monday) | Work from the real backlog | product-manager, business-analyst, release-manager | recommended |
| **Docs/KB** | knowledge-base (Confluence/Notion) | Read/write org specs & runbooks | documentation-writer, architect, BA | recommended |
| **Postgres/DB** | postgres (+ MongoDB/Redis analogues) | Schema introspection, query plans | database, performance, backend | essential (if relational) |
| **Browser** | browser (Playwright) | E2E, visual checks, axe a11y scans | qa, frontend, accessibility | recommended |
| **API** | openapi (+ Swagger) | Contract-first: serve/validate spec | api-reviewer, backend, frontend | recommended (if API) |
| **Security** | security-scanner (Semgrep) | On-demand SAST queries | security-reviewer | recommended |
| **Monitoring/Logging** | monitoring (Sentry/Datadog) | Errors, traces, metrics in incidents | bug-investigator, performance, devops | recommended |
| **Containers** | docker | Image/container inspection | devops, infrastructure | optional |
| **Orchestration** | kubernetes | Cluster introspection | devops, infrastructure | optional |
| **Cloud** | cloud (AWS/Azure/GCP) | Resource introspection | infrastructure | optional |
| **IaC** | terraform | Registry/module/plan context | infrastructure | optional |
| **Package mgrs** | (via dependency-update skill + CLI) | Dep vetting/SCA | all, security | recommended |
| **Testing** | browser + native runners (CLI) | E2E execution | qa | recommended |

## Decision matrix — enable a server when…

| Question | If yes → | If no → |
|----------|----------|---------|
| Do agents need it every project? | **essential** — enable | consider lower tier |
| Does it write/mutate external state? | Gate via `settings.json` `ask`; least-privilege credential | read-only ok |
| Does it egress code/data to a SaaS? | Security-reviewer + compliance sign-off; prefer VPC/self-hosted | enable |
| Does it ingest untrusted content (issues, web, errors)? | Treat as untrusted; don't co-enable with high-privilege mutators | fine |
| Is it stack-specific (k8s/terraform/cloud)? | **optional** — enable only for those projects | skip |

## Security considerations (per the MCP README)
1. **Least privilege** — read-only credentials by default (DB read role, read-only IAM scoped to non-prod, read-only kubeconfig). Writes/applies stay in CI behind a 🔒 gate.
2. **No inline secrets** — only `${ENV_VAR}` references; rotate and scope tokens.
3. **Egress awareness** — SaaS-calling servers send context off-host; regulated data needs sign-off.
4. **Prompt-injection defense** — MCP-returned content (issue text, PR comments, pages, error payloads) is **untrusted input**; agents treat it as data, not instructions. Don't co-enable untrusted-content servers with mutation-capable ones unless necessary. See `.claude/skills/security/references/prompt-injection.md`.
5. **Human-in-the-loop for mutations** — MCP write tools route through `ask` permissions.
6. **Audit** — log MCP tool invocations; alert on unexpected writes.

## Essential vs optional (summary)
- **Essential:** filesystem, git, github, postgres (if relational). Almost every project.
- **Recommended:** issue-tracker, knowledge-base, monitoring, browser, openapi, security-scanner. Big leverage where the system exists.
- **Optional:** docker, kubernetes, cloud, terraform. Higher blast radius; enable deliberately for infra work.

## Trade-off
More MCP = more agent capability but more attack surface and more egress. The default posture is **read-only, minimal, gated** — expand only when a concrete workflow needs it and security has signed off.

→ Next: [Part 8 — Context Engineering](08-context-engineering.md)
