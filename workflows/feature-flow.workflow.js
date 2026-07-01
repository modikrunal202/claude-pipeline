export const meta = {
  name: 'feature-flow',
  description: 'Orchestrate a feature from spec to verified, review-ready change with adversarial verification',
  phases: [
    { title: 'Design' },
    { title: 'Implement' },
    { title: 'Review' },
    { title: 'Verify' },
  ],
}

// `args` = { specLink, tasks: [{id, kind: 'backend'|'frontend'|'mobile'|'infra', desc}] }
// This script prepares a change for the 🔒 human review + deploy gates. It NEVER merges or deploys.

const specLink = args?.specLink ?? '(spec not provided)'
const tasks = args?.tasks ?? []

// ── Design: contract + data model in parallel (barrier — build needs both) ──
phase('Design')
const [contract, dataModel] = await Promise.all([
  agent(`As api-reviewer: define the API contract for the feature in ${specLink}. Output the contract per templates/api-contract.md.`,
        { label: 'design:api', phase: 'Design', agentType: 'general-purpose' }),
  agent(`As database-engineer: define the data model + reversible migration for ${specLink}. Output per templates/database-design.md.`,
        { label: 'design:db', phase: 'Design', agentType: 'general-purpose' }),
])

// ── Implement → Review → fix, pipelined per task (no batch barrier) ──
const results = await pipeline(
  tasks,
  // Stage 1: implement (isolated worktree so parallel tasks don't collide)
  (t) => agent(
    `As ${t.kind}-engineer: implement task "${t.desc}" per spec ${specLink}, contract:\n${contract}\nand data model:\n${dataModel}\nWrite code + tests; run lint/typecheck/tests until green.`,
    { label: `impl:${t.id}`, phase: 'Implement', isolation: 'worktree', agentType: 'general-purpose' }
  ),
  // Stage 2: review the produced change
  (impl, t) => agent(
    `As code-reviewer: review the change for task "${t.desc}". Return findings as file:line · severity · concrete failure scenario · fix. Verdict: approve/request-changes.`,
    { label: `review:${t.id}`, phase: 'Review', agentType: 'general-purpose' }
  ).then((review) => ({ task: t, impl, review })),
)

// ── Verify: security + a concrete-failure check, per task, in parallel ──
phase('Verify')
const verified = await parallel(results.filter(Boolean).map((r) => () =>
  agent(
    `As security-reviewer: adversarially verify the change for "${r.task.desc}". Apply the security skill checklist (auth/input/secrets/IDOR). Report any HIGH/CRITICAL with an exploit path, else 'clean'.`,
    { label: `verify:${r.task.id}`, phase: 'Verify', agentType: 'general-purpose' }
  ).then((security) => ({ ...r, security }))
))

return {
  contract, dataModel,
  tasks: verified.filter(Boolean),
  note: 'Prepared for 🔒 human review + deploy gates. No merge/deploy performed.',
}
