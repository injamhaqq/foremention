# Experiment — diegosouzapw/OmniRoute (register disposition: EXPERIMENT)

**Result: NOT ADOPTED. PRs #448 and #449 closed unmerged.** 2026-10-12.

## Acceptance (from the repository register)

> Bounded dev-only evaluation with authorized provider endpoints; stable model/upstream receipts; no fallback measurements; stop before quota.

Precondition status: Foremention has **no authorized OmniRoute endpoint** — no `OMNIROUTE_BASE_URL` / `OMNIROUTE_API_KEY` exists on the production Worker (`foremention-mvp` secret names checked 2026-10-12) or as repository secrets. So no evaluation can satisfy the acceptance test today.

## PR #448 — "feat: add first-class OmniRoute AI gateway" (draft, base `601fc24`)

- Adds `omniroute` to the customer-facing provider set: `app/api/runs/route.ts` `allowedProviders`, `lib/providers/index.ts`, source-map engine labels, onboarding wizard, outreach mini-audit, analytics contract and the production evidence canary.
- Default model guidance is OmniRoute `auto` routing, which lets the gateway pick/fall back between upstream models per request — the measured answer would not carry a stable model/upstream receipt.
- **Fails acceptance:** it would route customer measurement evidence through an unauthorized gateway and permits fallback measurements. Converting it to a dev-only, default-off path would mean removing almost all of the diff, and there is still no endpoint to evaluate. It is also four days stale against a fast-moving `main`.
- Action: closed as not adopted, with a comment citing the acceptance criteria.

## PR #449 — "feat: add OmniRoute-powered Foremention builder" (base Oct 8)

- Developer tooling only (manual `workflow_dispatch` Codex builder → review-only PR); does not touch customer evidence.
- Default route `auto/coding` (gateway-chosen model, fallback permitted); requires `OMNIROUTE_BASE_URL`/`OMNIROUTE_API_KEY` repository secrets that do not exist; adds a 390-line workflow holding an inference credential with a `contents: write` / `pull-requests: write` publisher job.
- **Fails acceptance:** no authorized endpoint, no pinned model receipt. Merging would add an unusable privileged workflow and attack surface for no benefit.
- Action: closed as not adopted, with a comment citing the acceptance criteria.

## Reopen criteria

1. The owner provides an authorized, HTTPS OmniRoute endpoint with a scoped key and a stated quota (no new spend without approval).
2. Requests pin an explicit model ID (no `auto`), and every response's model/upstream identity is recorded and compared against the pin; any mismatch is discarded, never counted as a measurement.
3. Dev-only and default-off: never in `allowedProviders` for customer runs until a separate measurement-comparability review passes.
4. A hard stop before quota.

Rebuild from current `main` at that point rather than reviving the stale branches.
