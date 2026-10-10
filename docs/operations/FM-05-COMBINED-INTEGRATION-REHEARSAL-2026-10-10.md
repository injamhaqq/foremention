# FM-05 Cross-PR Integration Rehearsal — 10 October 2026

**DRAFT / CI-ONLY VALIDATION. NOT AUTHORIZATION TO MERGE OR DEPLOY.**

This branch starts from draft #479 and combines the exact source changes from draft #474 and #486, plus explicit reconciliation of their shared CI and isolated authenticated-journey workflows. It exists because individually passing checks on three different draft branches do **not** prove that all three changes coexist safely.

- #474: read-only data integrity/preflight with history gap counting.
- #479: buyer-question creation RPC, member write lockout for provider evidence, delayed question-history and composite-FK activation. Authenticated buyer-question POST/PATCH E2E.
- #486: actor-bound human Source Map review RPC and distinct delayed source-entry writer lockdown, preserving service-role collectors and human audit/opportunity workflow.
- The combined CI local database resets, then **explicitly** applies three release-gate SQL candidates to its disposable PostgreSQL instance only: `FM05-activate-question-history-privileges.sql`, `FM05-activate-composite-project-fks.sql`, `FM05-source-review-activation.sql`. It then runs both SQL denial fixtures. The isolated authenticated journey applies all three candidates on its isolated stack before testing the real Worker.
- **No automatic production migration may apply any of the three activation candidates**: their originals are under `scripts/release-gates/`, NOT timestamped `supabase/migrations/`. Later FM-00 owner-authorized migration files must be materialized separately when application deployment and live DB provenance gates are satisfied.

## Latest main movement and revalidation

Main advanced from the initial FM-05 base `d4fea60a7bb8e047f2282cea9134121e9496c67e` to `3ab01d39436ef3ac885454ab841ce56b03ad03fd` with FM-11 workstream coordination guards ([#464](https://github.com/injamhaqq/foremention/pull/464)). The update adds six read-only tool/test/doc files, none overlapping the changed files in this combined FM-05 branch. This documentation-only commit exists to request **fresh GitHub pull-request merge-ref checks against current main**, rather than relying on the earlier exact-head test results that may precede the main movement. FM-00 must still review exact main and branch heads at integration time.

## Manual release decision gates

1. Confirm actual production deployed code SHA, identify any other pending merged migrations, and independently compare state to this main base SHA: `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
2. Resolve production migration lineage issue #332 with exact stored SQL receipts, semantic schema equivalence, duplicate/conflict classification, and a reviewed remediation plan. Do **not** invoke generic linked production `supabase db push`.
3. Verify a real backup and an isolated **successful restore** of the target production state, with timestamp and retention, not only a backup-available flag.
4. Rehearse on a production-shaped isolated clone. Take actual ownership and privilege snapshots before any DDL and compare all relevant contracts. Source Map reviewers and buyer-question editors must work through the RPC path.
5. FM-00 selects and integrates the desired workstreams in main through approved PRs, resolves shared workflows/test/migration conflicts, re-runs the full release gate and records the exact release SHA.
6. **Phase A**: apply additive RPC schema migrations via the reviewed and lineage-compatible controlled mechanism; verify role grants.
7. **Phase B**: deploy matching application using the verified release mechanism, and test owner/analyst allow, viewer/nonmember denied, sibling project denied, safe read, and provider service ingestion.
8. **Phase C**: independently approve and materialize the three later activation candidates as forward-only migration(s), verifying constraints, grants, PostgREST route caches and RLS; rollback from independently tested plan if failures.
9. Capture post-deployment verification receipts; do not assert the historical orphaned buyer question has been repaired. Mark historic evidence as unverifiable until genuinely proven.

This branch tests the combined target end state, but **cannot substitute for actual staged rollout, production restore rehearsal, source-data provenance adjudication, or FM-00 owner approval**.
