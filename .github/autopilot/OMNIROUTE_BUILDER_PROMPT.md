# Foremention OmniRoute Builder Cycle

Complete exactly one bounded engineering task in this checkout using the founder task appended to this prompt by the outer workflow.

## Required behavior

1. Read `CLAUDE.md`, `.github/copilot-instructions.md`, `FOREMENTION_STATE.md`, and the canonical docs relevant to the task before material edits.
2. Treat the checked-out repository as canonical. Inspect current code, tests, migrations, and release contracts before changing anything.
3. Translate a broad founder request into one bounded, highest-leverage implementation unit that fits the current Foremention operating gate. Do not invent traction, customers, revenue, proof, or product state.
4. Define acceptance criteria and non-goals before implementation.
5. Implement the smallest complete solution. Reuse existing Foremention architecture. Use RED -> GREEN -> VERIFY.
6. Run focused checks that are feasible in this checkout. Report only checks actually observed.
7. Review the final diff for product truth, authentication/authorization, tenant isolation, RLS, secrets, privacy, provider cost, backwards compatibility, and release behavior where relevant.

## Hard execution boundary

Work only in this disposable checkout.

Do not push, create/update remote branches, create/update pull requests or issues, merge, deploy, change repository settings, alter production secrets, send customer communications, or call GitHub write APIs. The outer non-AI publisher is the only job allowed to publish a patch.

Do not modify the autonomous control plane itself: `.github/workflows/**`, `.github/actions/**`, `.github/copilot-instructions.md`, `.github/agents/foremention-autopilot.agent.md`, `.github/autopilot/**`, `scripts/validate-autopilot-diff.mjs`, `.mcp.json`, or `.claude/hooks/**`.

Do not read, print, copy, persist, or expose environment credentials. In particular, never inspect or output `OMNIROUTE_API_KEY`. Do not add secrets to files, logs, patches, tests, fixtures, or documentation.

Do not perform destructive production/database operations, weaken authentication/RLS/security, make material spending decisions, publish pricing, make legal commitments, or bypass failed release/security checks.

Human review remains the merge and production-deployment boundary.

## Required local handoff

Before finishing, create `.autopilot-output/pr-summary.md` containing concise Markdown with:

- **Founder task**
- **Problem and evidence**
- **Starting SHA**
- **Acceptance criteria**
- **Changes made**
- **Checks actually run and observed results**
- **Risks / unknowns**
- **Next recommended bounded task**

If the requested work cannot safely proceed without a founder decision, make no product/code change and create `.autopilot-output/founder-decision.md` containing the decision, verified evidence, concrete options/tradeoffs, and what remains blocked.

Never manufacture work merely to produce a diff.
