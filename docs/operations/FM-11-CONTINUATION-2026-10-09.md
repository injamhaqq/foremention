# FM-11 Continuation Packet — 2026-10-09

**Status (updated 2026-10-10):** [PR #464](https://github.com/injamhaqq/foremention/pull/464) **merged to `main` and verified in production** as `3ab01d39436ef3ac885454ab841ce56b03ad03fd`. All 12 applicable release checks passed following one browser acceptance retry. The first browser run saw authenticated mobile HTTP 503s; [issue #504](https://github.com/injamhaqq/foremention/issues/504) remains open for root-cause investigation. GitHub approval/ruleset shortcomings remain tracked in [issue #490](https://github.com/injamhaqq/foremention/issues/490). FM-00 remains the integration authority.

## Exact observed baseline

- Canonical repository: `injamhaqq/foremention`; default branch: `main`.
- Audited main SHA at the original handoff: `d4fea60a7bb8e047f2282cea9134121e9496c67e`. The merged and verified release SHA was `3ab01d39436ef3ac885454ab841ce56b03ad03fd`; refresh live main before acting.
- The original review branch was `fm-11/workstream-handoff-guard-20261009`; the squash merge is recorded in closed PR #464. For new proposals, refresh the current head and main SHA before review.
- Node requirement `>=22.13.0`; package manager `pnpm@10.25.0`.
- `CLAUDE.md` and `FOREMENTION_STATE.md` govern Stage 0 customer proof, the product's truth boundaries, and manual-dispatch-only Copilot Autopilot.
- PR #464 added only development tooling, deterministic tests and FM-11 operating documentation. No customer application, payment provider, live AI inference, database migration, secrets, or production configuration was intentionally modified.

## Existing automation — preserve it

- `.github/workflows/autopilot-control.yml`: manual-dispatch GitHub Copilot CLI cycle. Its AI job has repository read plus `copilot-requests: write`, while a non-AI publication job has GitHub write permission and uses exact-base and protected-diff checks. No auto-merge. Stored model API key is not required for this canonical path; included Copilot capacity is finite.
- CI performs isolated Supabase migrations and security checks, tests, AI release gate, lint, typecheck, build and Worker dry-runs. Distinct workflows cover CodeQL, OSV, Trivy, dependency review, secret scanning, GitHub Actions analysis, browser/axe/Lighthouse acceptance, and isolated customer journeys.
- Existing Playwright, Promptfoo, Knip, Gitleaks and release SBOM/attestation work should be retained, not duplicated. Semgrep can be tested against a defined policy-specific gap; Repomix and addyosmani/agent-skills are optional development tools, not SaaS runtime integrations.
- PR #449 proposes a Codex/OmniRoute **builder**; PR #448 proposes a separate customer inference gateway. Their integration contracts and provider/privacy/cost guarantees must be reviewed independently. Neither is a verified, unlimited free agent system.
- Recommended primary coding system: existing GitHub-native Copilot controller; optional sandboxed Codex/OpenCode workers only where they improve measured, accepted engineering output.

## FM-11 deliverable

- `scripts/capture-workstream-prs.mjs`: read-only, paginated GitHub GET inventory; protects against API errors, PR/main movement, file caps, duplicate files and renamed-file blind spots.
- `scripts/verify-workstream-handoff.mjs`: fail-closed matching of current main SHA, signed-off write-set, reserved integration files, 15-minute inventory freshness, cross-PR overlaps, actual own-PR head and declared file coverage. Accepts existing FM-03/FM-05/FM-07 and canonical worker branch conventions.
- Tests in `tests/fm11-pr-inventory.test.mjs` and `tests/fm11-workstream-handoff.test.mjs` require deterministic success; do not claim current-head success before CI completes.
- `docs/operations/FM-11-WORKSTREAM-PROTOCOL.md` defines workstream handoffs and FM-00 ownership.

Usage (must run in a trusted environment with GitHub REST access and sufficient GET quota):

```bash
git fetch origin main
node scripts/capture-workstream-prs.mjs > /tmp/fm11-open-prs.json
node scripts/verify-workstream-handoff.mjs packet.json /tmp/fm11-open-prs.json "$(git rev-parse origin/main)"
```

The collector reads public metadata only, with optional read-only `GH_TOKEN`/`GITHUB_TOKEN` when the unauthenticated REST rate limit is insufficient. The packet and PR snapshot are transient; never commit tokens or raw customer information.

## Conflict findings — observation, not integration approval

During this October 9 audit, GitHub reported 63 open PRs. All 63 available changed-file inventories were checked in batches (including #476); **none touched FM-11's five existing proposed paths at collection time**. This was a multi-call, non-atomic snapshot: the PR count can change. Refresh immediately before approving integration.

Representative cross-lane conflicts needing FM-00 sequencing:
- #470 vs #471: demo authentication routes.
- #466 vs #458: scheduling, settings, Worker config and limits; #466 vs #457: gateway and scheduling implementation.
- #449 vs #235: agent-harness workflow.
- #448 vs #457/#459/#461: providers, run route and source-evidence infrastructure.
- #436 vs #433: two PRs referencing **the same head branch** `product/decision-editor-trust-20261006`.
- #368 vs #367: two PRs referencing **the same head branch** `strategy/competitive-signal-governance-20260930`.

The shared-head pairs must not be treated as independent patches. Cross-file semantic overlaps are possible even when an exact-path check reports no collision.

## Cost, license, and security constraints

- This validator/collector uses Node built-ins and GitHub REST; no new package or model inference fee was added. GitHub-hosted workflows and Copilot can still consume allowance, minutes and external gateway credits.
- Third-party CLI, agent skill, scanner, prompt evaluator, browser runner and model router versions, license grants, extension trust, supply chain and data processing must be evaluated before adoption. Do not describe bundled credits as unlimited.
- The main ruleset observed at audit requires `CI` but zero mandatory approving reviews and includes an always-active repository-role bypass. FM-00 should assess independent-review and bypass policy without weakening existing checks.
- Existing Autopilot uses `npm install --global @github/copilot@latest`; an approved, tested pin would improve reproduction.
- Future PRs require exact current-head evidence. For #464, verified deployment and production checks are recorded on the squash-merged SHA; passing checks on a different commit are not a substitute.

## FM-00 post-integration decisions

PR #464 is merged and its exact release has passed production verification. These separate company-wide operating risks remain:

1. [Issue #490](https://github.com/injamhaqq/foremention/issues/490): the protected-main ruleset requires only CI, currently zero approving reviews and an always-active repository-role bypass. Enforce additional stable PR check contexts and arrange an independent reviewer through the authorized GitHub administrator; do not make speculative ruleset changes or disable checks.
2. [Issue #504](https://github.com/injamhaqq/foremention/issues/504): investigate the first trusted mobile-browser run's two authenticated HTTP 503 responses using Cloudflare/Worker logs. A clean retry does not establish that the intermittent root cause has been eliminated.
3. Re-capture the complete open-PR inventory and current main immediately before *future* integrations. Resolve shared-head/overlapping ownership with FM-00 rather than treating previously green checks as enduring evidence.
4. Keep GitHub Copilot Autopilot manual-dispatch only during Stage 0. Evaluate any further coding-agent automation against actual pilot blockers, cost bounds and human review; this package did not enable unattended 24/7 coding.

## FM-11 completion criterion

FM-11's original engineering package **is integrated and production-verified** at main SHA `3ab01d39436ef3ac885454ab841ce56b03ad03fd`. This does not imply that autonomous unattended engineering was enabled or that separate incidents #490 and #504 have been resolved. Any subsequent FM-11 enhancement is a new, separately reviewed exact-head change; do not conflate a proposal with a deployed release or infer customer traction, revenue or return on investment.
