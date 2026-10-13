# Repository register verification — 2026-10-12

Register: [`register-2026-10.csv`](./register-2026-10.csv) (124 rows; 14 KEEP, 3 REJECT, 2 UNRESOLVED, 85 DEFER, 16 REFERENCE ONLY, 3 EXPERIMENT, 1 COMPLETE). Committed verbatim from the owner's upload, with line endings normalised to LF.

This pass covers the KEEP, REJECT and UNRESOLVED rows only. It was checked against `main` at `97346c2` (A21, #556).

## Status key

- **VERIFIED**: the acceptance test is met by current code or CI, and the evidence is cited below.
- **GAP-FIXED**: a cheap, concrete gap was closed in this change.
- **GAP-OPEN**: some of the acceptance test still needs hosted or owner evidence, or a larger change. The note says what is missing.

## CI context on `main`

Pushes to `main` currently end `failure` or `cancelled` in CI and Browser Acceptance. In every case the failing step is the production release check: `Verify exact Cloudflare production release` (CI run 38265726837) and `Verify exact production release before trusted live acceptance` (Browser Acceptance run 38265732976). Production is deployed manually, so on a push the live Worker is not yet at that commit. All earlier steps pass, including the build, tests, lint, typecheck and both Wrangler dry runs.

These are the latest fully green runs on `main` (commit `4cec28e`):
- CI 38234334511
- Browser Acceptance 38234334337

Security, AI Safety and Code Health, OpenSSF Scorecard and CodeQL are green at `97346c2` (runs 38265732848, 38265732834, 38265732833, 38265732852). Pull request candidates are green in both CI and Browser Acceptance; examples are runs 38264561770 and 38264561785, for #556.

## KEEP rows

| Repository | Status | Evidence |
|---|---|---|
| microsoft/playwright | **GAP-FIXED** | Playwright 1.60.0 is pinned in `.github/workflows/browser-acceptance.yml`, which installs and launch-tests chromium, firefox and webkit. The public journey and axe audit in `scripts/browser-acceptance.mjs` covered five Chromium profiles plus `firefox-desktop`. WebKit was only exercised by `scripts/browser-zoom-reflow.mjs` (`webkit-mobile`). **Fix:** added a `webkit-desktop` profile to the public journey, so every public path (10) is now audited on all three engines, with an axe check on each. Contract test added in `tests/browser-acceptance-contract.test.mjs`. Artifacts are kept for each SHA as `foremention-browser-acceptance-<sha>`. The latest main artifact (4cec28e) shows 0 failures, 60 public observations and an authenticated pass. |
| inngest/inngest | **GAP-OPEN** (partial) | The SDK is pinned as `inngest@4.13.0` in `pnpm-lock.yaml`, with functions in `lib/jobs/inngest.ts`. Retries and idempotency are covered by `tests/inngest-provider-retry.test.mjs` and `tests/fm08-inngest-webhook-concurrency.test.mjs`, and replayed in CI with `scripts/verify-fm08-webhook-concurrent-sessions.sh`. Live production execution is checked on every main push by `Sync live Inngest functions` and `Probe live Inngest execution`; both passed in CI 38234334511. **Open:** the hosted Inngest plan quota still has to be checked on the Inngest dashboard (owner). |
| PostHog/posthog | **VERIFIED** (no free text) / **GAP-OPEN** (quota, server conversions) | `lib/product-analytics.ts` sets `autocapture: false`, `disable_session_recording: true` and `capture_pageleave: false`, and sends every event through `before_send: sanitizePostHogPayload`. `tests/product-analytics-privacy.test.mjs` checks that customer content, emails, URLs and secrets hidden behind allowed keys are dropped. `tests/posthog-production-ingestion.test.mjs` checks the pinned production config. New guard: `tests/repository-register-guards.test.mjs`. **Open:** server-verified conversions and the hosted PostHog quota still need a dashboard check (owner). |
| promptfoo/promptfoo | **VERIFIED** | `promptfoo@0.122.0` is pinned in `.github/workflows/quality.yml`. Remote generation and telemetry are turned off, and the eval runs against the local provider `evals/foremention-safety-provider.ts`. Run 38265732834 (97346c2) has artifact `promptfoo.json` with 10 successes, 0 failures, 0 errors and 0 tokens used, under the safety identity "Foremention native safety boundary". |
| gitleaks/gitleaks | **GAP-FIXED** | `gitleaks-action` v3.0.0 (pinned by SHA) scans full history in `security.yml`. Run 38265732848 has a SARIF artifact with 0 findings. **Fix:** a new `secrets` step downloads gitleaks 8.30.1 (sha256 checked) and generates a synthetic `ghp_` token at runtime; the token is never committed and is masked in the log. The step checks three things: the scan exits 1 with exactly one `github-pat` finding, the `Secret` field is `REDACTED`, and neither the log nor the report contains the raw value. Guarded by `tests/repository-register-guards.test.mjs`. |
| aquasecurity/trivy | **VERIFIED** | `trivy-action` v0.36.0 (pinned by SHA) runs in `security.yml` with `exit-code: '1'` on fixable HIGH/CRITICAL vulnerabilities, secrets and misconfigurations, on every PR and push. The `trivy` job is a required check, so applicable final-head advisories block a merge. It passed in run 38265732848. |
| ossf/scorecard | **VERIFIED** (dated findings recorded) | `scorecard-action` v2.4.4 runs on push and weekly. Run 38265732833 (97346c2, 2026-10-12) produced artifact `scorecard.json` with an aggregate score of **6.4**. The findings are listed below. The score is not a compliance certification. |
| google/osv-scanner | **VERIFIED** | `osv-scanner-action` v2.3.8 (pinned by SHA) scans the lockfiles recursively in `security.yml`, and the job fails when it finds a vulnerability. It passed at 97346c2 (run 38265732848). CI also runs `pnpm audit --prod --audit-level=moderate`. |
| dequelabs/axe-core | **VERIFIED** (automated) | `@axe-core/playwright@4.12.1` runs on every public path for every profile, and on the authenticated routes. Serious or critical violations fail the run (`scripts/browser-acceptance.mjs`). It now also covers WebKit. Manual keyboard checks are not automated here; they remain a human release step. |
| GoogleChrome/lighthouse | **VERIFIED** (reports retrieved) | `@lhci/cli@0.15.1` produces per-route reports, archived in `.lighthouseci`. Reports from main run 38234334337 (4cec28e) are summarised below. The score floors are set to `warn` (audit-first), per `lighthouserc.cjs`. |
| webpro-nl/knip | **VERIFIED** | `knip@6.32.2` is pinned in `quality.yml`, in report-only mode. `scripts/validate-knip-audit.mjs` stores the JSON and does not delete anything. The run 38265732834 artifact `knip-summary.json` reports 86 findings in `mode: audit-first` with `blocking: false`. These need human review; nothing is auto-deleted. |
| supabase/supabase | **GAP-OPEN** (partial) | **Tenant denial:** CI replays every migration on a disposable local Supabase and runs `scripts/verify-tenant-isolation.sql`. **Restore:** `scripts/verify-workspace-export-delete-restore.sql` checks a logical workspace restore. **Migration parity:** checked read-only on 2026-10-12 with `scripts/audit-production-migration-lineage.mjs`, against a live `schema_migrations` export (97 local, 100 remote). 44 match exactly; 29 match by name with a different version; 20 are alias candidates without SQL proof. Two local migrations (`20260814060000_placement_events_organization_index`, `20260915172000_customer_value_pilot_evidence_gates`) have no obvious remote name. This is metadata only, not proof of SQL equivalence. **Open:** a migration-parity proof at the SQL-receipt level, a platform backup-restore drill, and "no second store". The Worker also binds the Cloudflare D1 database `foremention-intake` (`wrangler.jsonc`, `worker/index.ts`), which holds public rate limits, source-gap requests and public visibility scores. |
| cloudflare/vinext | **VERIFIED** | Pinned exactly as `vinext@0.0.50`, which the guard test checks. `pnpm build` runs `vinext build` to produce the integrated Worker. Browser acceptance runs against that exact candidate under `wrangler dev` on every PR (e.g. run 38264561785) and against production on main (38234334337). |
| cloudflare/workers-sdk | **VERIFIED** | `wrangler@4.114.0` is pinned exactly. CI dry-runs both `dist/server/wrangler.json` and `wrangler.jsonc`, and on main it archives `dist` with an SBOM and attests build provenance and the SBOM with `actions/attest`. All of this is guarded by `tests/repository-register-guards.test.mjs`. |

### Scorecard findings (run 38265732833, 2026-10-12)

| Score | Checks |
|---|---|
| 10 | Security-Policy, Dependency-Update-Tool, Dangerous-Workflow, Token-Permissions, Binary-Artifacts, Vulnerabilities, SAST, CI-Tests |
| 8 | Pinned-Dependencies |
| 3 | Branch-Protection, Contributors |
| 0 | Maintained, Code-Review, License, CII-Best-Practices, Fuzzing |
| N/A | Packaging, Signed-Releases |

Notes on the low scores:
- **Code-Review 0:** the repository has one maintainer, and PRs are squash-merged by the owner or agents.
- **License 0:** there is no LICENSE file. This is intentional for a private product, but the owner should decide.
- **Maintained 0:** the repository is new (less than 90 days old by Scorecard's measure).

### Lighthouse per-route reports (main 4cec28e, run 38234334337)

| Route | Perf | A11y | Best practices | SEO |
|---|---|---|---|---|
| / | 0.72 ⚠ | 1.00 | 0.96 | 1.00 |
| /product | 0.80 | 1.00 | 0.96 | 1.00 |
| /pricing | 0.79 | 1.00 | 0.96 | 0.69* |
| /score | 0.79 | 1.00 | 0.96 | 1.00 |
| /prompt-check | 0.72 ⚠ | 1.00 | 0.96 | 1.00 |
| /login | 0.72 ⚠ | 1.00 | 0.96 | 0.69* |
| /signup | 0.70 ⚠ | 1.00 | 0.93 | 0.69* |

- ⚠ marks a route below the 0.75 performance floor. This is a warning and does not block.
- \* The SEO score is low only because of `is-crawlable`. The page is deliberately `noIndex: true` (`app/pricing/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`). Whether `/pricing` should stay noindex is an owner decision.

## REJECT rows

| Repository | Status | Evidence |
|---|---|---|
| tashfeenahmed/freellmapi | **VERIFIED** | `git grep -i freellmapi` returns no matches anywhere, including `package.json`, `pnpm-lock.yaml` and `.github/workflows`. Guard: `tests/repository-register-guards.test.mjs`. |
| vitest-dev/vitest | **VERIFIED** | No matches in the manifest, lockfile or workflows. Tests use `node --test` (`package.json` `scripts.test`). Guard test added. |
| EpicGames/raddebugger | **VERIFIED** | No matches. Guard test added. |

## UNRESOLVED rows (no licence, so they must not be vendored or copied)

| Repository | Status | Evidence |
|---|---|---|
| Bristotle/ai-visibility-tracker | **VERIFIED** (not copied) | The upstream repository reports `license: null` through the GitHub API. It is a Python project (`visibility_tracker.py`, `publish.py`, `data/fixtures/*`), and this repo has no `.py` files. No matches for `ai-visibility-tracker`, `visibility_tracker`, `Bristotle`, `observations.csv` or `publish.py`. Upstream function names (`analyse_answer`, `find_mentions`, `per_intent_presence`, `classify_sentiment`, `build_report`, `summarise`, `format_position_delta`, …) have no matches. The only overlap is the generic `load_run`, which is the repo's own Inngest phase name. Not vendored; guard test added. |
| alvinunreal/freesubstats.com | **VERIFIED** (not copied) | The upstream repository reports `license: null` and contains only a `README.md`. No matches for `freesubstats`. Guard test added. |

## Open items for the owner

1. Inngest and PostHog hosted plan quotas, plus PostHog server-verified conversions (dashboard checks).
2. Supabase: an SQL-receipt-level migration parity proof, a platform backup-restore drill, and a decision on whether the D1 `foremention-intake` store is acceptable under "no second store".
3. Lighthouse performance on `/`, `/prompt-check`, `/login` and `/signup` is below the 0.75 warning floor.
4. 86 Knip findings and the Scorecard findings need human review.
5. Manual keyboard accessibility checks are not automated.
