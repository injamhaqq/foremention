# Foremention Autopilot

Foremention Autopilot is the repository-native continuation loop for doing bounded engineering work online without requiring the founder to keep a ChatGPT/Codex browser session open or repeatedly type `continue`.

## What this implementation uses

The canonical path is:

`GitHub Actions -> GitHub Copilot CLI -> local isolated proposal -> diff safety gate -> autonomous branch -> review-only pull request -> existing CI/security/browser gates -> human merge -> next main-push cycle`

The Copilot execution job authenticates with GitHub Actions' built-in short-lived `GITHUB_TOKEN` and grants only `copilot-requests: write` plus repository read permissions. There is no `OPENAI_API_KEY`, Anthropic key, Gemini key, model API key, or long-lived GitHub PAT in the canonical path.

For a personally owned repository, GitHub documents that Copilot CLI can use the built-in `GITHUB_TOKEN`; usage is charged against the repository owner's Copilot seat/AI-credit allowance. Copilot Student includes Copilot CLI and an allowance of GitHub AI Credits. This means the system is keyless, but it is **not unlimited**: autonomous work pauses when the included Copilot AI-credit allowance is exhausted and resumes when credits are available again.

GitHub Models is not part of this design. GitHub retired the separate GitHub Models playground/catalog/inference API on 2026-07-30.

## Why the agent cannot directly write to GitHub

The controller uses privilege separation:

### Job 1 — `agent`

The AI job receives:

- `contents: read`;
- `issues: read`;
- `pull-requests: read`;
- `copilot-requests: write`.

It does **not** receive repository write permission. It may inspect Foremention, edit the ephemeral checkout, run commands/tests, and produce a local patch. Even though Copilot runs with autonomous tool permission inside the disposable runner, GitHub rejects repository-write API calls from that job.

### Job 2 — `publish`

The publication job receives GitHub write permission but runs **no AI model**. It downloads the patch as a workflow artifact, proves the base SHA is still current, applies it to a clean checkout, runs the deterministic diff safety guard, commits it to an `autopilot/run-*` branch, and opens a pull request.

This prevents the AI process from holding the credential that publishes its own work.

## Self-modification guard

`scripts/validate-autopilot-diff.mjs` blocks an autonomous proposal from editing sensitive/self-governing paths including:

- `.github/workflows/**`;
- `.github/actions/**`;
- `.github/copilot-instructions.md`;
- `.github/agents/foremention-autopilot.agent.md`;
- `.github/autopilot/**`;
- `scripts/validate-autopilot-diff.mjs`;
- `.mcp.json`;
- `.claude/hooks/**`;
- secret-style `.env` files other than `.env.example`.

The outer publisher reads the validator from a clean `main` checkout, so an agent cannot approve a change by weakening the validator in its proposed patch.

## Execution cadence

The controller runs when:

- a maintainer manually dispatches it;
- `main` receives a normal user/maintainer push or merge;
- the 12-hour fallback schedule fires.

A successful human merge therefore acts as the normal continuation signal: the next cycle starts from the new `main` without the founder typing `continue`.

The preflight refuses to start a second autonomous product branch while an open PR whose head starts with `autopilot/` already exists. This prevents the system from spraying competing autonomous branches.

## One-cycle budget

Each run is intentionally bounded:

- maximum Copilot autopilot continuations: `8`;
- soft maximum GitHub AI Credits per agent objective: `10`;
- controller concurrency: `1`;
- AI job timeout: `45 minutes`;
- no auto-merge.

These are safety/cost controls, not throughput promises. Adjust them only after observing real usage and quality.

## Task selection

The custom agent reads:

- `CLAUDE.md`;
- `.github/copilot-instructions.md`;
- `FOREMENTION_STATE.md`;
- canonical product/company/security/testing documentation;
- current code/tests/migrations;
- open PRs/issues when relevant.

It must select one bounded, evidence-backed task. An open issue containing `autopilot:ready` is treated as an explicit queue candidate, but live production/security/release defects can outrank it. The agent must reject stale or duplicate tasks rather than blindly execute them.

Use `.github/ISSUE_TEMPLATE/autopilot-task.yml` when you want to give the system a specific next task.

## Founder decisions

If the agent determines that progress genuinely requires a founder decision, it must avoid manufacturing an answer and write `.autopilot-output/founder-decision.md` locally. The publication job removes that control output from the code patch and creates one non-duplicated `[FOUNDER DECISION] Foremention Autopilot needs input` issue.

Examples of founder-gated actions include:

- material ICP/category/business-model changes;
- public pricing decisions;
- destructive database/production actions;
- secret changes;
- weakening authentication, authorization, RLS, or other security gates;
- customer communications or public claims;
- material spending or legal commitments.

## Pull-request and CI behavior

Autopilot never merges its own PRs. Existing CI/security/browser/release checks remain authoritative.

GitHub documents a special rule for pull requests created with a workflow `GITHUB_TOKEN`: `pull_request` workflows are created in an approval-required state. A maintainer may need to click **Approve workflows to run** on an Autopilot PR before the existing Foremention checks execute. This is an intentional GitHub recursion/security safeguard.

If you later want fully unattended PR workflow execution, GitHub requires a different publishing identity such as a GitHub App installation token or a personal access token. That is optional and is deliberately **not** configured here because the requested baseline is keyless and safer.

## One-time repository setting

GitHub repositories can disable GitHub Actions from creating pull requests. The publication step requires the repository setting **Settings -> Actions -> General -> Workflow permissions -> Allow GitHub Actions to create and approve pull requests** to permit PR creation.

The controller itself requests only explicit job-level permissions. Enabling that repository setting does not make Autopilot auto-merge; this repository keeps auto-merge out of the Autopilot design.

If the setting is disabled, the AI cycle can still run, but the publication step will be unable to open its PR until a repository administrator enables it.

## Activation checklist

1. Keep GitHub Copilot Student activated on the repository owner's GitHub account.
2. Merge the Autopilot bootstrap PR after the normal Foremention release gates pass.
3. Ensure GitHub Actions is enabled.
4. Ensure GitHub Actions is allowed to create pull requests if you want automatic proposal publication.
5. Use **Actions -> Foremention Autopilot Controller -> Run workflow** for the first controlled run, or allow the next `main` push/schedule to trigger it.
6. Review the generated `autopilot/run-*` PR and approve its workflow runs when GitHub requests approval.
7. Merge only after the normal exact-SHA Foremention gates pass. The merge automatically triggers the next bounded cycle.

No laptop, browser tab, Codex session, OpenAI API key, or model API server needs to stay running.

## Failure modes

- **Copilot AI credits exhausted:** the Copilot step stops; no partial patch is published because the publisher requires a zero agent exit code.
- **`main` changes during an agent run:** the publisher refuses the stale patch; a later `main` push or scheduled run retries from fresh reality.
- **Agent produces no justified change:** no empty PR is opened.
- **Founder decision required:** a founder-decision issue is opened instead of speculative code.
- **Agent modifies a protected control-plane path:** deterministic diff guard rejects publication.
- **Another Autopilot PR is open:** preflight skips the cycle unless a maintainer manually dispatches with `force=true`.
- **PR workflow approval is pending:** approve the workflows in the PR UI; the agent's code remains unmerged until that happens.

## Optional future upgrade

If Foremention later needs truly zero-click PR CI and merge orchestration, introduce a dedicated least-privilege GitHub App as the publication identity and keep the AI job isolated from that credential. Do not solve this by giving the Copilot process a broad long-lived token.
