# Final production hardening evidence — 2026-08-14

This addendum supplements `PRODUCTION-READINESS-EVIDENCE-2026-08-14.md`. It records only the final hardening work completed after that document's controlled-private-beta sign-off and does not expand the commercial/legal scope of the launch.

## Exact release

- PR #86, `Index active foreign-key cleanup paths`, merged through the normal protected workflow.
- Merge/main commit: `3241b4a7fc0561508d6480bdf6963a6c5f13ff61`.
- Main CI run: `31785946985`.
- The main run passed production dependency audit, tests, lint, TypeScript typecheck, production build, Cloudflare Worker dry run, verified-build archive, exact Cloudflare production release verification, live Inngest function sync, and exact-build live Inngest execution.

## Live foreign-key cleanup hardening

PostgreSQL catalogs were used instead of relying blindly on a stale advisor list. A usable foreign-key index was defined as a valid, non-partial index whose leading key columns exactly cover the foreign key.

Before the migration, 31 foreign-key paths on already-populated production tables lacked such an index. The affected live paths included tenant/project/run/user cleanup relationships across citations, source observations, jobs, Source Map entries, run attempts, AI cost events, run prompt selections, prompts, prompt versions, runs, competitors, run answers, usage events, audit logs, Source Maps, organization members, projects, prompt clusters, and source snapshots.

The migration deliberately indexes only currently populated paths. Empty future-facing tables were not pre-indexed merely to silence generic advice, avoiding unnecessary write amplification.

After the production migration, the same catalog detector returned **zero missing foreign-key indexes on populated public tables**.

## RLS auth initialization review

Every current public RLS policy that references `auth.uid()` is already deparsed as `(SELECT auth.uid())`. No policy still performs a direct per-row `auth.uid()` or `auth.jwt()` initialization call. Therefore no RLS rewrite was made in this final pass.

The previously reported `complete_onboarding` mutable-search-path warning was also checked against the live function definition. The live function is `SECURITY DEFINER`, has `SET search_path TO ''`, and fully qualifies its application tables. It was not changed merely to silence stale advisor output.

## Recovery-target parity after hardening

The isolated `$0/month` restore target `nhbdnpbpidydzpvoipez` was resumed only for the drill update, received the same 31-index migration, and was rechecked before being paused again.

Observed after the migration:

- representative restored application-evidence rows: **92**;
- final hardening indexes present: **31**;
- restored synthetic run/provider/model/citation/source evidence remained unchanged;
- the disposable restore project was paused again after verification.

The recovery scope remains application evidence/data. This still does not claim Supabase Auth identity restoration.

## Dependency queue hygiene

The current production dependency audit is green. Old Dependabot PRs #1, #3, #6, #7, #8, and #9 were closed rather than merged blindly from stale bases. In particular, the old Vite PR was already superseded by the newer version on `main`, the Node type major did not match the Node 22 runtime, and the vinext jump is a framework-level compatibility project rather than a private-beta bug fix.

Future dependency upgrades should be regenerated from the current head and pass the same full CI/deployment proof rather than reviving stale bot branches.

## Final interpretation

The controlled/private-beta status remains **GREEN**. This hardening pass improves cleanup scalability, deletion safety, recovery parity, and repository hygiene without changing Foremention's evidence model, tenant boundary, commercial truth boundary, UI system, provider abstraction, or paid-GA status.

The best-model architecture remains intentionally configurable rather than hard-coded to a transient leaderboard: native and OpenAI-compatible provider adapters persist exact provider/model/usage/cost provenance, so frontier models can be introduced through configuration and controlled acceptance instead of bespoke model-specific forks.

Residual boundaries from the canonical readiness record remain unchanged: paid checkout/payment lifecycle is separate activation work; contracting/tax/customer-specific legal approvals are not created by engineering; Sentry itself is not independently verified; Supabase Auth identity restore is outside the application-data drill; and the final fresh mobile acceptance did not independently exercise Source X-Ray.
