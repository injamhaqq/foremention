# Foremention OmniRoute Builder

This is an optional repository-native engineering runner for using a remote OmniRoute instance as the inference backend for Codex CLI while building Foremention.

## Architecture

`iPhone / GitHub Actions -> Codex CLI -> OmniRoute -> routed coding model -> disposable Foremention checkout -> patch artifact -> non-AI publisher -> review-only PR`

It complements the existing keyless GitHub Copilot Autopilot. It does not replace Foremention's product runtime providers and does not make model usage unlimited.

## Why it is separate from the product

The builder exists to **build Foremention**. The model router is infrastructure for the coding harness. Customer-facing Foremention runtime provider decisions remain independent.

## Security boundary

The `agent` job has repository read permission only. It receives the OmniRoute inference credential, edits only the disposable checkout, and cannot push branches or open PRs.

The `publish` job receives GitHub write permission but receives no OmniRoute credential and executes no model. It accepts only an exact-base patch, applies the existing `scripts/validate-autopilot-diff.mjs` guard, then creates a review-only branch and PR.

The workflow additionally refuses to package a patch or handoff containing the exact OmniRoute API-key value. Raw Codex output is never uploaded as an artifact.

## Required repository secrets

Configure these under **Settings -> Secrets and variables -> Actions**:

- `OMNIROUTE_BASE_URL` — remote HTTPS OpenAI-compatible base URL ending in `/v1`.
- `OMNIROUTE_API_KEY` — an inference-only/scoped OmniRoute endpoint credential.

Never commit either value.

The GitHub-hosted runner cannot reach an OmniRoute process that exists only on `localhost` on your phone or laptop. Use a remotely reachable, access-controlled HTTPS deployment.

## Model route

The workflow defaults to `auto/coding`. You can override the model/router ID when dispatching the workflow. OmniRoute remains responsible for provider/model routing and fallback.

The workflow configures Codex with:

- custom provider `omniroute`;
- `requires_openai_auth = false`;
- `wire_api = "responses"`;
- `sandbox_mode = "workspace-write"`;
- `approval_policy = "never"` for the non-interactive disposable runner.

## Run it from an iPhone

After this workflow is merged and the two repository secrets are configured:

1. Open the Foremention repository in GitHub.
2. Open **Actions**.
3. Choose **Foremention OmniRoute Builder**.
4. Tap **Run workflow**.
5. Enter one bounded engineering objective.
6. Keep `auto/coding` or select another OmniRoute route.
7. Run it.
8. Review the resulting PR and its independent CI/security/browser checks.
9. Merge only when the normal Foremention gates are green and the change is correct.

No laptop needs to stay online.

## Operating constraint

During Stage 0 this workflow is manual-dispatch only. It has no schedule and no push trigger. Customer proof remains the governing business constraint; the builder is for a real production, security, reliability, or pilot blocker—not for manufacturing feature volume.

## Limits

OmniRoute can aggregate free and paid providers and can route around exhausted providers, but it cannot guarantee infinite model capacity. Each underlying provider can impose its own quota, rate limit, fair-use policy, availability limit, or price. Treat "free" and "unlimited" as provider-specific claims that must be verified, not as a Foremention assumption.
