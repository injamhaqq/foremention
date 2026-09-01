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

## Operating objective

Advance Foremention through small, evidence-based, reviewable engineering cycles without requiring the founder to repeatedly type “continue.” Each cycle must recover reality, choose one justified task, implement the smallest complete solution, verify it, open a review-only PR, and leave an evidence-backed handoff.

## Open autonomous work

- The AI-credit repair PR merged to `main` at `9b93b5515f6d71e5ac0811a10b92eec1b8de6dd2` on 2026-09-01.
- The repair applied the supported Copilot CLI minimum of `30` AI credits and kept the keyless bounded-control-plane design intact; no additional repository patch was produced after that merge.
- Controller run #2 succeeded with keyless Copilot execution from the exact merged `main` SHA. The live activation evidence confirms that the bounded control plane is working without a repository write grant to the AI agent.
- Auto-merge remains intentionally disabled. The security guardrails remain in force: no destructive production/database actions, no secret changes, no weakened auth/RLS/security boundaries, and no unaudited product/runtime changes.
- Before selecting new product work, inspect all current open PRs and avoid duplicate implementation.

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

### 2026-09-01 — AI-credit repair merge and controller run #2

- Starting main SHA for the fix: `0e0dcb823e16ed2b2483fcb3a8233d4db748b5bc`.
- Repair PR merged to `main` at `9b93b5515f6d71e5ac0811a10b92eec1b8de6dd2`.
- Verified live evidence: controller run #2 succeeded with keyless Copilot execution from the exact merged `main` SHA.
- No additional repository patch was produced after the merge; the AI agent remained bounded by the read-only checkout and no-auto-merge policy.
- Product/runtime behavior was not changed by this control-plane status update; the change is limited to canonical state/documentation truth.

## How to update this file

Append only durable handoff facts that materially help the next autonomous worker. Prefer links/SHAs/issue or PR numbers over prose. Do not store secrets, raw customer data, invented commercial metrics, or temporary speculation here.
