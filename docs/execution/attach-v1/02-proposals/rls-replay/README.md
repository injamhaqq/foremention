# Chat02 local RLS replay (CV-04 / A11) — reproducible evidence, not CI

Replays **all 97 repo migrations** into PGlite (PostgreSQL compiled to WASM, run
in-process; no Docker, no network, no production access) with a minimal Supabase
shim (`auth.uid()` from `request.jwt.claim.sub`, roles `anon` / `authenticated` /
`service_role` / `supabase_auth_admin`, `extensions.digest`), then executes
SQL-level two-tenant probes as real Postgres roles with RLS enforced.

These scripts intentionally live outside `tests/` because they need
`@electric-sql/pglite`, which is **not** a repository dependency. Adding it (or
running this in CI) is an FM-00 decision (Chat07 license review: PGlite is
Apache-2.0 / PostgreSQL licensed).

## Run (scratch directory, nothing added to the repo)

```bash
mkdir -p /tmp/rls && cd /tmp/rls && npm init -y >/dev/null && npm i @electric-sql/pglite@0.5.9
cp <repo>/docs/execution/attach-v1/02-proposals/rls-replay/*.mjs .
node replay.mjs <repo>                       # migrations applied 97/97
node replay.mjs <repo> ./rls-probe.mjs       # 10 RLS probes
node replay.mjs <repo> ./proposal-probe.mjs  # probes + proposed project-scoped RPC
node replay.mjs <repo> ./dump.mjs            # writes local-policies.json
```

## Fidelity check against production (read-only, 2026-10-13)

Using the Supabase Management API read-only SQL endpoint (SELECTs on catalog
views only; no row data, no writes, no secrets):

- `pg_policies` (public): **215 local vs 215 production; 0 missing either side;
  0 definition differences** (cmd, roles, USING, WITH CHECK, whitespace-normalized).
- `SECURITY DEFINER` functions in `public`: 33 vs 33. Name differences:
  production-only `rls_auto_enable()`; replay-only `validate_customer_confirmed_value_evidence()`
  (security-definer locally, not in production's definer set) — FM-00 should
  reconcile this drift; neither is callable by `authenticated`.
- Authenticated-callable definer RPCs: identical in both — `create_prompt_versioned`,
  `review_source_map_entry`, `update_prompt_versioned`. **None callable by `anon`**
  in production.
- Production `anon` has SELECT on 0 of 126 public tables and INSERT on 1
  (the consented public source-gap intake). The two `authenticated`-readable views
  are `security_invoker = true`.
- Migration history: production records 100 versions, the repo has 97 files; the
  version timestamps differ (production migrations were applied with different
  version stamps/names), so file-to-version mapping is **not** 1:1. Policy
  equivalence above is the fidelity evidence, not the migration ledger.

## Probe results at this branch head (2026-10-13)

`# pass 10 fail 0`:
1. A owner reads no Org B rows across `organization_members, projects, categories,
   prompts, runs, invitations, billing_accounts, account_deletion_requests, audit_logs`
   and the `organizations` row.
2. A owner UPDATE/DELETE on B rows affects 0 rows; B data verified unchanged.
3. A owner INSERT into B (project, category, self-membership as owner, invitation,
   forged audit log) rejected.
4. Moving an A row into B (UPDATE organization_id) rejected.
5. Viewer cannot write; analyst cannot self-escalate, demote the owner, invite, or
   read invitation token hashes / deletion requests.
6. Anonymous and non-member identities read nothing.
7. Revoked membership loses all reads immediately.
8. `update_prompt_versioned` denies cross-organization prompts.
9. **FINDING (A11) reproduced:** an org analyst can edit a *sibling project's*
   prompt via `update_prompt_versioned` (no project predicate). See
   `../proposed-migration-update-prompt-in-project.sql`; its probe rejects
   sibling-project and cross-org calls and allows own-project edits.
10. No non-trigger `SECURITY DEFINER` function is anon-executable.

## Not proven here
- PostgREST/GoTrue behavior, JWT signature validation, real `service_role`
  call sites, Storage policies, and Supabase-managed schemas (shimmed).
- Tables not seeded above (≈115) are covered only by the static fact that every
  public policy is organization-scoped through `is_org_member` / `has_org_role` /
  `has_org_permission` (or service-role only), not by row probes.
- Project is **not** an RLS boundary anywhere: all 215 policies are
  organization-scoped. Any org member can read every project of the org through
  PostgREST directly. Whether that is acceptable (e.g. agency client viewers) is a
  product decision for FM-00/founder.
- A nonproduction Supabase project is still required for the end-to-end token-bound
  HTTP matrix in `../authorization-and-privacy-gates.md`.
