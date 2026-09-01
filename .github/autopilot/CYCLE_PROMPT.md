# Foremention Autonomous Cycle

Use the `foremention-autopilot` agent and complete exactly one bounded execution cycle in this checkout.

## Required behavior

1. Read `CLAUDE.md`, `.github/copilot-instructions.md`, `FOREMENTION_STATE.md`, and the relevant canonical docs before material edits.
2. Recover current repository reality. Inspect the exact checked-out `main` SHA, recent commits, open pull requests/issues when useful, the existing implementation, tests, migrations, and CI/release contracts. Treat stale prose as a lead, not proof.
3. If an open issue contains `autopilot:ready`, prefer the highest-value safe queued task unless current evidence shows it is stale, duplicated, blocked, or lower priority than a production/security/release defect.
4. Identify exactly one highest-value unresolved problem that is justified by current evidence and not already being solved by another active PR.
5. Define acceptance criteria and non-goals before implementation.
6. Implement the smallest complete solution. Use RED -> GREEN -> VERIFY. Reuse existing Foremention architecture; do not build parallel systems.
7. Run the focused checks needed for the change and report only results actually observed. The pull-request CI will independently run repository gates after publication.
8. Review your own diff for product truth, authentication/authorization, Supabase RLS, tenant isolation, migrations, privacy/analytics, provider cost, backwards compatibility, UI truth, and release behavior where relevant.

## Hard execution boundary

Work only in this checkout. **Do not** push, create or update remote branches, open/modify pull requests, create/modify GitHub issues, merge, deploy, change GitHub settings, or call GitHub write APIs. The outer workflow has a separate publishing job for remote writes.

Do not modify the autonomous-control plane itself: `.github/workflows/**`, `.github/actions/**`, `.github/copilot-instructions.md`, `.github/agents/foremention-autopilot.agent.md`, `.github/autopilot/**`, `scripts/validate-autopilot-diff.mjs`, `.mcp.json`, or `.claude/hooks/**`.

Do not edit secrets or local secret files. Do not perform destructive production/database operations, delete customer data, weaken authentication/RLS/security, alter production secrets, make material spending decisions, publish pricing, send customer communications, make unverified public claims, materially change ICP/category/business model, make legal commitments, or bypass failed release/security checks.

Do not auto-merge. A human remains the merge/deployment approval boundary.

## Required local handoff

Before finishing, create `.autopilot-output/pr-summary.md` containing concise Markdown with:

- **Problem and evidence**
- **Starting SHA**
- **Acceptance criteria**
- **Changes made**
- **Checks actually run and observed results**
- **Risks / unknowns**
- **Next recommended bounded task**

The outer workflow removes this file from the code patch and uses it as the pull-request handoff.

If no justified safe repository change can be made because a founder decision is genuinely required, make no product/code change and instead create `.autopilot-output/founder-decision.md` with:

- the decision required;
- verified evidence;
- 2–4 concrete options and tradeoffs;
- your recommended option if the evidence supports one;
- what remains blocked until the founder decides.

Never manufacture work merely to produce a diff.
