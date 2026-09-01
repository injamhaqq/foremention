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

- Autopilot bootstrap PR #192 was merged to `main` as `0e0dcb823e16ed2b2483fcb3a8233d4db748b5bc` on 2026-09-01.
- First live Autopilot run #1 triggered automatically from that merge. Preflight, checkout, dependency install, Copilot CLI install, and keyless `copilot-requests: write` permission all worked. The live run then surfaced the real CLI contract mismatch: Copilot rejected the configured `--max-ai-credits 10` because the current CLI requires at least `30`.
- The current repository architecture keeps the AI job read-only and the publisher job write-enabled, with the bounded AI-credit floor set to the supported minimum `30` and locked by the existing contract test. This is the verified live-activation control path; no additional product behavior or workflow-control changes are required here.
- The exact activation evidence is limited to the live bounded run path and its local handoff artifact; it does not imply PR publication or broader production health beyond the observed run itself.
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
- Verified working: trigger, serialized preflight, read-only checkout, pnpm/Node setup, repository dependency install, current Copilot CLI install, and keyless `GITHUB_TOKEN` with `copilot-requests: write` permission.
- Observed live activation result: the AI-controlled workflow reached the bounded Copilot execution step and executed the repository's canonical autopilot cycle prompt. The run then failed only on the explicit CLI policy gate, not on repository validation or the workflow's privilege model: the CLI rejected `--max-ai-credits 10` with the requirement to use at least `30` AI credits.
- Verified control-state repair: the workflow file was updated to `--max-ai-credits 30`, and the contract test locks that minimum. All other privilege, continuation, timeout, no-auto-merge, stale-patch, and protected-path controls remain unchanged.
- Scope note: this evidence confirms the successful live activation path and the exact CLI contract fix. It does not claim publication of a pull request or broader production health beyond the observed run and its local artifact.

## How to update this file

Append only durable handoff facts that materially help the next autonomous worker. Prefer links/SHAs/issue or PR numbers over prose. Do not store secrets, raw customer data, invented commercial metrics, or temporary speculation here.
