# FM-11 Continuation Packet — 2026-10-09

**Status:** Review-only engineering change proposed in [PR #464](https://github.com/injamhaqq/foremention/pull/464). **Not merged; not deployed to production.** FM-00 remains the sole integration authority.

## Exact observed baseline

- Canonical repository: `injamhaqq/foremention`; default branch: `main`.
- Audited main SHA at handoff: `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
- Changes are on `fm-11/workstream-handoff-guard-20261009`. Refresh the **actual** PR head and main SHA before review; do not rely on a recorded head that may change.
- Node requirement `>=22.13.0`; package manager `pnpm@10.25.0`.
- `CLAUDE.md` and `FOREMENTION_STATE.md` govern Stage 0 customer proof, the product's truth boundaries, and manual-dispatch-only Copilot Autopilot.
- PR #464 adds only development tooling, deterministic tests and FM-11 operating documentation. No customer application, payment provider, live AI inference, database migration, secrets, or production configuration was intentionally modified.

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
- Every PR, including #464, requires current-head evidence. Successful checks on prior commits are not substitute evidence. Passing checks do not constitute a production deployment.

## FM-00 next integration decisions

1. Refresh `main`, every open PR's head, changed-file list and GitHub ruleset. Confirm #464's latest complete security/CI/browser run and absence of overlapping filenames.
2. Perform human review of PR #464's collector and validator, including authorization, snapshot integrity, denial on incomplete data, path handling and no GitHub write actions.
3. Approve or request changes explicitly. Retain human-reviewed merge and exact-SHA production proof; no FM-11 worker may bypass branch rules or enable auto-merge.
4. Coordinate the shared-head PRs and consolidate overlapping product/gateway/DevSecOps work. Do not bulk-close PRs without author/integration review.
5. Keep Autopilot manual-only while Stage 0 customer proof is the priority. Consider pinning Copilot CLI and read-only inventory integration as separate reviewed work only after customer or reliability need justifies it.

## FM-11 completion criterion

The engineering proposal is considered **ready for FM-00 review** once its exact head passes required checks and the complete open-PR inventory is refreshed. It is **integrated** only after separate FM-00 human review, authorized merge, and confirmation that the merge/release corresponds to the verified SHA. Unknown customer traction, cost data and production state remain unknown.
