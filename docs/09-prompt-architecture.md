# Part 9 — Prompt Architecture

Prompts are where task-specific intent meets standing behavior. The pipeline separates three prompt surfaces so quality doesn't depend on who's typing:

| Surface | Holds | Lives in | Changes |
|---------|-------|----------|---------|
| **Constitution** | Always-true facts, conventions, guardrails | `.claude/CLAUDE.md` | Rarely, via PR |
| **Agent operating prompts** | A role's standing instructions | `.claude/agents/*.md` | Occasionally, versioned |
| **Task prompt templates** | The shape of a specific request | `prompts/*.md` | Reused, parameterized |

## The template system
Each template in [`prompts/`](../prompts/) is **parameterized and versioned**:
```
# <Name> Prompt — vMAJOR.MINOR.PATCH
**Agent · Skills · Output (→ templates/…)**
**Use when:** <trigger>
**Variables:** {{UPPER_SNAKE}} …
---
<the prompt body — imperative, references the output template, states the output contract, names the 🔒 gate>
```
11 templates cover the lifecycle: planning, architecture, implementation, bugfix, review, testing, refactoring, deployment, security, performance, documentation.

## Design principles (from the `prompt-engineering` skill)
1. **Role clarity** — say who the model is acting as and the single objective.
2. **Context minimalism** — instruct *what to load* and *what not to* (delegate searches); don't inline the world.
3. **Output contract** — state the exact output shape (a template, a JSON schema, a ranked list). Consistent output is checkable output.
4. **Verification built-in** — tell the prompt to run tests/gates and report real results, never claimed ones.
5. **Escalation** — name the 🔒 human gate and when to stop and ask.
6. **Negative guidance** — what *not* to do (don't fix bugs in a refactor; don't approve on red tests) prevents whole classes of error.

## Anatomy of a good task prompt (annotated)
```
Implement {{TASK}}, per the TSD ({{TSD_LINK}}) and contract ({{CONTRACT_LINK}}).   ← role + objective + inputs
1. Orient: read relevant code + conventions. Reuse existing utilities.            ← context discipline
2. Build the smallest change that meets the acceptance criteria.                  ← scope control
3. Write tests (happy/boundary/error). Run lint+typecheck+tests until green.      ← verification
4. Respect hooks (no secrets; satisfy api/schema guards).                         ← governance
5. Hand the diff to code-reviewer; flag anything needing a 🔒 decision.           ← hand-off + escalation
Match surrounding style. Don't touch out-of-scope or do_not_touch paths.          ← negative guidance
```

## Versioning & governance
- **Semver** each prompt; breaking wording bumps the version and is logged in `prompts/README.md`.
- Prompts (and agents/skills) are **owned by the platform/DevEx team**; changes go through the `prompt-engineering` review checklist and PR.
- **Test prompts like code:** keep a small eval set of representative tasks; when you change a prompt, re-run them and compare outputs before merging. Regressions in prompt quality are as real as code regressions.

## Composition
A run composes all three surfaces: the **constitution** (always), the **agent prompt** (on delegation), and a **task template** (on request), plus auto-invoked **skills**. The orchestrator supplies the task template's variables from the current artifacts (ticket, spec, contract). This layering means a one-line human request expands into a fully-specified, governed task.

## Anti-patterns
- Mega-prompts that restate everything every time (bloats context, defeats caching).
- Vague objectives ("make it better") with no output contract.
- Copy-pasted prompts with no version — impossible to improve systematically.
- Instructions that assume a stack the project doesn't use.

→ Next: [Part 10 — Feature Workflow](10-feature-workflow.md)
