# Production readiness evidence — 2026-08-14

This record continues Foremention’s evidence-before-theatre production-readiness work. It records only observations actually made against the deployed system or exact verified build. It does not convert unavailable operator controls into completed gates.

## Exact current production release

- Current merge/main commit: `edb438186006ed93881af7063659811f0087e21c`.
- Main CI run `31736237831` completed successfully.
- Required gates passed: dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry run, verified build archive, exact Cloudflare release verification, live Inngest sync, and exact-build Inngest execution.

## Previously completed production evidence

The existing production record remains valid for compromised-password controls, direct-signup bypass prevention, confirmed login, all-device session revocation, the real Groq collection, the workspace-export fix, reciprocal tenant search/export isolation, and representative authenticated Chromium/Firefox mobile acceptance.

The real provider acceptance run remains `d9c16871-72dc-4fcd-a208-d395a0e9e3b7`, provider `groq`, model `groq/compound-mini`, methodology `3.0`, recorded actual cost `$0.008653`, one verified answer, nineteen citations, and nineteen source observations.

## Backup -> restore drill — completed

A separate disposable Supabase project was created in `ap-northeast-2` solely for recovery testing after the control plane reported a creation cost of `$0/month`. Production was not restored over, paused, or mutated by the drill.

The isolated database was rebuilt from the source-controlled migration set at the exact production commit and verified to have exact public-table-name parity with production: `62/62` public base tables.

The data restore used the already-proven real production acceptance collection rather than copying authentication credentials or unrelated user data. The restored chain contained one organization, one project, one prompt cluster, one category, one prompt, one completed run, one verified run answer, nineteen cited sources, and nineteen citations. `created_by` identity references were intentionally excluded/null in the recovery copy. No production password hashes, confirmation tokens, recovery tokens, session tokens, email credentials, or authentication secrets were copied.

The restored run remained `d9c16871-72dc-4fcd-a208-d395a0e9e3b7`, model `groq/compound-mini`, with recorded actual cost `$0.008653`.

Production and the isolated target were then hashed independently table-by-table. Row counts and logical JSON hashes matched exactly after normalizing only the intentionally excluded `created_by` field:

- organizations — 1 — `b2662a00c732271e148921d5a3d980e6`
- projects — 1 — `5f96da2dce3ffcaf6b37f0f7add1c7fa`
- prompt_clusters — 1 — `4d7d6775a8dca3cdca37126862ed84ec`
- categories — 1 — `21a02e16d72a8ad858777f1f1e47330b`
- prompts — 1 — `cd5becc8f6be05cdfab37f6317003a55`
- runs — 1 — `5e7816c545122325178a42119b0cb08d`
- run_answers — 1 — `d00a0e4472dcf9435ca4a8411160a6a1`
- sources — 19 — `8fb029287176b2322efbdf10af31d147`
- citations — 19 — `912fdf2050225998d1b82ef827a586dd`

This closes the backup -> isolated restore proof gate for Foremention’s core evidence chain. The temporary anonymous restore-ingest endpoint on the disposable project was replaced after verification with a JWT-protected HTTP 410 handler. The platform safety layer intercepted the separate project-pause action, so this record does not claim the target was paused; its creation cost was `$0/month`.

## Remaining production gates

### Monitoring / Sentry — open

Sentry SDK code is present, but browser Sentry is not proven active in the exact production build and no harmless controlled event has been observed in an operator Sentry alert channel. Do not claim this gate complete until that event receipt exists.

### Legal / commercial / operator approval — open

Existing Privacy and Terms pages are substantive implementation evidence, not a substitute for founder/operator or counsel decisions around entity/jurisdiction, paid activation/order forms, DPA/subprocessors, exact retention obligations, support expectations, and incident-response ownership.

## Current status

Closed with production evidence: release provenance, dependency/tests/lint/type/build, Cloudflare exact-release proof, Inngest sync/execution, auth/password controls, direct-signup hook protection, session revocation, real provider collection and evidence chain, workspace export repair, reciprocal tenant search/export isolation, representative mobile/cross-browser acceptance, and isolated schema+data restore with matching hashes.

Still open: observed production Sentry alert delivery and human legal/commercial approvals. Source X-Ray remains a narrower unexercised state in the final fresh synthetic mobile pass and should not be overclaimed.
