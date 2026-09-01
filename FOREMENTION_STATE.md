# Foremention Autonomous Execution State

This file is a compact handoff ledger for autonomous workers. It is not a substitute for live verification. Every worker must re-check material facts against GitHub, code, CI, migrations, and production evidence before acting.

## Last bootstrap verification

- Verified on: 2026-09-01
- Repository: `injamhaqq/foremention`
- Default branch: `main`
- Current canonical main SHA at bootstrap: `2c306677e7e7b318c955d4ec81e99679129bf6c7`
- Repository visibility at bootstrap: public
- Canonical autonomous engine: GitHub Copilot CLI running inside GitHub Actions.
- Authentication: workflow-provided short-lived `GITHUB_TOKEN`; no OpenAI/model API key and no stored GitHub PAT in the canonical path.
- Copilot usage boundary: billed against the repository owner's Copilot seat/AI-credit allowance; Copilot Student is not unlimited.
- Production deployment SHA/health for this bootstrap: UNKNOWN; not independently inspected as part of this control-plane change.

## Recommendation Engineering build authority — 2026-09-01

- Long-term destination: **Category Leadership OS** — not claimed as achieved.
- Core product category being built: **Recommendation Engineering**.
- Measurement + diagnosis subsystem: **Recommendation Intelligence**.
- Canonical company-decision object: **Change Specification**.
- Execution artifacts are subordinate to Change Specifications.
- Public positioning remains **Recommendation Intelligence** until the Recommendation Engineering core path is shipped and separately approved for public migration.
- PR #200 merged the approved architecture/specification, but the four authority files are updated by the first Slice A implementation rather than treated as already complete.
- PR #197 is directionally useful but **do not merge #197 as-is**. Reconcile it only after the first-class Change Specification domain exists; `controlSurface` belongs to Change Specification, not `ResolutionProposal`.
- Historical `resolution_assets` remain valid and must not be backfilled with fabricated Change Specifications.
- Production reliability issue #202 was completed only after exact production SHA `3256b9fd6e2c99e40f1667b81778915fff620ba6` passed Cloudflare release verification, live Inngest sync/probe, and the authenticated first-evidence canary.
- No customer, PMF, revenue, retention, willingness-to-pay, category-leadership, benchmark, ROI, or causal claim is implied by the Recommendation Engineering architecture or its implementation.

## Operating objective

Advance Foremention through small, evidence-based, reviewable engineering cycles without requiring the founder to repeatedly type “continue.” Each cycle must recover reality, choose one justified task, implement the smallest complete solution, verify it, open a review-only PR, and leave an evidence-backed handoff.

## Open autonomous work

- Autopilot bootstrap PR #192 was merged to `main` as `0e0dcb823e16ed2b2483fcb3a8233d4db748b5bc` on 2026-09-01.
- AI-credit-floor repair PR #194 was merged to `main` as `9b93b5515f6d71e5ac0811a10b92eec1b8de6dd2` on 2026-09-01.
- Foremention Autopilot Controller run #2 (`33482925005`) succeeded with preflight, keyless Copilot execution, `--max-ai-credits 30`, bounded agent cycle completion, packaging/upload, and publisher validation.
- Run #2 intentionally produced no patch because no additional justified repository-safe work was present; it correctly skipped PR publication and did not manufacture a product change.
- Before selecting new product work, inspect all current open PRs and avoid duplicate implementation.
- Recommendation Engineering Core Loop v1 must follow the approved spec/plan and exact-head gates. Do not start Slice B until Slice A is merged and independently production-verified.

## Founder-decision queue

1. One-time repository setting may be required: allow GitHub Actions to create pull requests under repository Actions workflow permissions. The connected GitHub API tooling cannot read or change that administrative setting. Browser automation was attempted on 2026-09-01 but could not start because the external automation wallet had insufficient balance. The publisher path itself remains the authoritative test of whether this setting is already enabled.
2. Auto-merge remains intentionally disabled. Autonomous workers may create and repair local proposals/PRs, but merges stay founder-controlled unless a separate, explicitly approved publication identity and merge policy are introduced.
3. GitHub may require a maintainer to approve workflows on pull requests created by `GITHUB_TOKEN`; this is a GitHub recursion/security safeguard. A separate GitHub App/PAT could remove that click later, but is intentionally not required for the keyless baseline.

## Execution ledger

### 2026-09-01 — Autopilot control-plane bootstrap

- Starting main SHA: `2c306677e7e7b318c955d4ec81e99679129bf6c7`
- Purpose: create a repository-native continuation loop using GitHub Student's Copilot CLI capability rather than ChatGPT/Codex session allowance.
- Added/expected controls: repository Copilot instructions, dedicated Foremention Autopilot custom agent, bounded cycle prompt, persistent state ledger, issue template, two-job privilege-separated controller, deterministic self-modification/sensitive-path guard, documentation, and contract tests.
- Agent privilege: repository read + `copilot-requests: write`; no repository write permission.
- Publisher privilege: repository write, no AI execution; applies only the artifacted patch after exact-base and deterministic path validation.
- Cost controls: 30 AI-credit soft cap per objective (current Copilot CLI minimum), 8 maximum autopilot continuations, 12-hour fallback schedule, one concurrent controller run.
- Safety posture: no auto-merge; no destructive production/database actions or security/business-truth changes without founder approval.
- Continuation behavior: normal merge/push to `main` triggers the next bounded cycle; schedule is a fallback.

### 2026-09-01 — First live activation run

- Triggering main SHA: `0e0dcb823e16ed2b2483fcb3a8233d4db748b5bc`.
- GitHub Actions run: Foremention Autopilot Controller #1 (`33481511405`).
- Verified working: trigger, serialized preflight, read-only checkout, pnpm/Node setup, repository dependency install, current Copilot CLI install, `GITHUB_TOKEN` with `CopilotRequests: write`.
- Observed failure: CLI rejected `--max-ai-credits 10` with the explicit requirement to use at least 30 AI credits.
- Repair: set `--max-ai-credits 30`; keep all other privilege, continuation, timeout, no-auto-merge, stale-patch, and protected-path controls unchanged.

### 2026-09-01 — Recommendation Engineering unblocked

- Verified production base: `3256b9fd6e2c99e40f1667b81778915fff620ba6`.
- Runtime hardening PRs: #204 workflow envelope; #205 collection runtime/canary envelope.
- Production verification: exact release, live Inngest sync, live Inngest execution probe, authenticated first-evidence canary, and evidence archival all succeeded before Change Specification implementation began.
- Approved architecture authority: PR #200 plus `docs/superpowers/specs/2026-09-01-recommendation-engineering-core-loop-design.md` and its implementation plan.

## How to update this file

Append only durable handoff facts that materially help the next autonomous worker. Prefer links/SHAs/issue or PR numbers over prose. Do not store secrets, raw customer data, invented commercial metrics, or temporary speculation here.
