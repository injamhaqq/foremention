# FM-05 — Atomic buyer-question provenance and provider-attempt write boundary

**9 October 2026. DRAFT / NOT DEPLOYED.** FM-00 is the sole integration authority. Main baseline: `d4fea60a7bb8e047f2282cea9134121e9496c67e`.

## Problem, verified against production (read-only)

- Members with owner/admin/analyst access currently have table-level `INSERT/UPDATE/DELETE` grants and permissive write policies for `prompts`, `prompt_versions`, and `run_attempts`, allowing direct PostgREST writer paths separate from the protected application workflow.
- `app/api/prompts/route.ts` currently inserts a new question and its initial immutable version in two separate database requests. A failure between requests can leave an unversioned question.
- Provider workers in `lib/jobs/inngest.ts` already persist `run_attempts` with `serviceRole: true`, while authorized reviewers read attempts using a member token.
- Read-only production counts: **50 prompts, 50 prompt_versions**, with **one prompt missing its current version and one missing version 1**. These are count-only diagnostics; do not manufacture/backfill an unknown customer history or assert the two findings refer to different prompts.

## Design and concrete write-set

1. `supabase/migrations/20261009000100_create_atomic_buyer_question_rpc.sql`: explicit `create_prompt_versioned` signed-in, owner/admin/analyst RPC; verify project, organization, category and cluster ownership; lock project row and enforce 10 questions per project; create question + version 1 in one PostgreSQL transaction; grant RPC to `authenticated` and `service_role` only. Revoke direct authenticated `run_attempts` DML and drop its write policies, preserving SELECT and service-role writes.
2. `app/api/prompts/route.ts`: replaces two request initial prompt/version writes with one authenticated RPC. Keeps existing CSRF/origin, identity, role and plan checks and demo behavior.
3. `supabase/migrations/20261009000200_harden_evidence_writer_privileges.sql`: **separate activation phase**, revoking authenticated direct DML on `prompts` and `prompt_versions` and removing their obsolete writer policies; SELECT remains available. `update_prompt_versioned` stays the authorized edit path.
4. `scripts/verify-fm05-atomic-evidence-writers.sql`: transaction-rolled-back isolated fixtures covering two organizations, two sibling projects, owner vs viewer, forged cluster and cross-tenant requests, concurrent-capacity serialization contract, version 1/2 provenance and service-role grants.
5. `.github/workflows/ci.yml` adds that isolated SQL verification after the full local migration replay. `tests/fm05-atomic-evidence-writers.test.mjs` checks route/migration contracts. **All actual verification results must be read from the exact PR head CI.**

## Required staged deployment order — owner approval first

- **Gate 0:** unblock production migration ledger #332 by exact executed SQL/schema reconciliation. Export hash receipts; obtain current tested backup/PITR/restore evidence; rehearse phases in an isolated clone and verify no workspace, tenant, entitlement, or run regressions. No blanket `supabase db push` against this project.
- **Phase 1 database:** individually review/apply the phase 1 migration to approved production only. Verify `create_prompt_versioned` availability, execute privileges, service-role provider attempts, and read-only checks. The legacy app question-creation path still works because prompt table DML is not revoked in phase 1.
- **Phase 1 application:** deploy the exact approved application SHA using `rpc/create_prompt_versioned`, verify real authorized buyer-question creation and version 1, edit to version 2, onboarding, viewer denial and provider-run review in a controlled test tenant.
- **Phase 2 database:** only after observing the new application path healthy, explicitly approve/apply phase 2 to revoke direct member writes to `prompts` and `prompt_versions`. Re-run the negative PostgREST permission tests and service-role tests. Then mark the accepted production SHA and receipts.
- Do not apply phase 2 before the application routes have switched. The CI migration replay includes both phases at once in its isolated database; this is **not** a production rollout authorization.

## Reversibility / failure modes

- Phase 1 is additive for question creation; provider-attempt writer revoke must be rolled back only under security incident/change-control approval (a `GRANT` would reopen the member tamper surface). If a provider job breaks, stop deployment and repair privileged service permissions rather than leaving tamper enabled.
- If phase 1 application fails, redeploy the prior app **before** phase 2; the old two-write behavior still operates while phase 2 remains unapplied.
- If phase 2 unexpectedly breaks a hidden customer writer, roll back the application and/or use a carefully reviewed forward-only privilege correction, with exact permissions, logs, backup and FM-00 sign-off. Do not automatically re-grant untrusted direct writes.
- No historical version repair or customer data changes are included. Investigate the one observed prompt lacking version 1 before deciding any fact-preserving remediation.

## Explicit limitations

- A draft migration in GitHub does not change production. The production migration ledger remains unreconciled.
- This patch restricts direct authenticated writes to three integrity-sensitive tables. It does not purport to solve every sibling-project FK, every RLS policy, historical version gap, recovery process, or all customer authorization risks. Separately validate row-level project referential invariants.
- The current `update_prompt_versioned` function checks organization membership, not per-project entitlement. This patch does not invent a project-role model; the creation RPC verifies exact project/cluster ownership, and follow-up multi-project RLS tests are required.
- The SQL contract's Foundation access cap `10` must remain synchronized with `FOUNDATION_ACCESS_LIMITS.buyerQuestions`. A plan change requires schema-contract review.

**FM-00 release recommendation:** draft PR and isolated CI review only; hold production migration and deployment pending #332 and signed rollout acceptance.
