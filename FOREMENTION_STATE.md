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

- Control-plane bootstrap: branch `build/foremention-autopilot-control-plane`.
- Before selecting new product work, inspect all current open PRs and avoid duplicate implementation. The repository already had multiple active feature/operating-system PRs when this control plane was created.

## Founder-decision queue

1. One-time repository setting may be required: allow GitHub Actions to create pull requests under repository Actions workflow permissions. The connected tooling used for this bootstrap could not read or change that administrative setting.
2. Auto-merge remains intentionally disabled. Autonomous workers may create and repair local proposals/PRs, but merges stay founder-controlled unless a separate, explicitly approved publication identity and merge policy are introduced.
3. GitHub may require a maintainer to approve workflows on pull requests created by `GITHUB_TOKEN`; this is a GitHub recursion/security safeguard. A separate GitHub App/PAT could remove that click later, but is intentionally not required for the keyless baseline.

## Execution ledger

### 2026-09-01 — Autopilot control-plane bootstrap

- Starting main SHA: `2c306677e7e7b318c955d4ec81e99679129bf6c7`
- Purpose: create a repository-native continuation loop using GitHub Student's Copilot CLI capability rather than ChatGPT/Codex session allowance.
- Added/expected controls: repository Copilot instructions, dedicated Foremention Autopilot custom agent, bounded cycle prompt, persistent state ledger, issue template, two-job privilege-separated controller, deterministic self-modification/sensitive-path guard, documentation, and contract tests.
- Agent privilege: repository read + `copilot-requests: write`; no repository write permission.
- Publisher privilege: repository write, no AI execution; applies only the artifacted patch after exact-base and deterministic path validation.
- Cost controls: 10 AI-credit soft cap per objective, 8 maximum autopilot continuations, 12-hour fallback schedule, one concurrent controller run.
- Safety posture: no auto-merge; no destructive production/database actions or security/business-truth changes without founder approval.
- Continuation behavior: normal merge/push to `main` triggers the next bounded cycle; schedule is a fallback.
- Next verification: exact-head CI, Agent Harness, and Autopilot contract tests on the bootstrap PR.

## How to update this file

Append only durable handoff facts that materially help the next autonomous worker. Prefer links/SHAs/issue or PR numbers over prose. Do not store secrets, raw customer data, invented commercial metrics, or temporary speculation here.
