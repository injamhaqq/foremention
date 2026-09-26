# Foremention production Supabase migration lineage: drift and safe path

**Read-only observed on 26 September 2026. This document does not authorize mutation of production migration history.**

## Verified scope

- Active project: existing Foremention Supabase production. The connected project was reachable, and the existing `resolution_assets`, `resolution_asset_evidence` and `resolution_follow_ups` tables **already exist**. An earlier guide telling operators to create them is historical.
- The current default-branch repository contains **93 SQL migration files**. The production Supabase migration ledger records **96 entries**. By exact filename suffix versus recorded migration name, **69 remote records** share a local basename, of which **30 have a different timestamp**. **27 remote records** have no exact local basename, and **26 local files** have no exact matching remote name. Some remote basenames occur more than once. These are naming/history observations, not proof that corresponding SQL was or was not executed.
- Local isolated CI migration replay **passes**, and exact-production build, authenticated canaries and health checks can pass simultaneously with this **separate deployment-history risk**. Do not mistake passing local schema replay for migration-ledger parity.
- At least three recently applied production migrations have direct, known local counterparts but different recorded versions and names:

| Production recorded version | Production recorded name | Committed repository file |
| --- | --- | --- |
| `20260926063633` | `company_operational_cost_readiness_20260926` | `supabase/migrations/20260926071500_company_operational_cost_readiness.sql` |
| `20260926064502` | `company_cost_view_read_grants_20260926` | `supabase/migrations/20260926081000_company_cost_view_read_grants.sql` |
| `20260926071020` | `support_ticket_auth_rls_initplan_20260926` | `supabase/migrations/20260926090000_support_ticket_auth_rls_initplan.sql` |

The three production changes above were read back and independently checked for their intended schema/view/policy effects; this does **not** prove that every historical name match has byte-identical SQL or that a future CLI push will interpret both histories consistently.

## Immediate operator control

**BLOCKED: do not run an undifferentiated `supabase db push` against the existing linked production project.** Do not delete or rewrite earlier repository migrations, blindly mark extra remote versions reverted, truncate `supabase_migrations.schema_migrations`, or rerun the historical Resolution Engine guide. These actions could reapply non-idempotent DDL, break grants/RLS, or misrepresent deployment provenance.

Already-deployed production patches do not need to be repeated to settle their version labels. Future urgent forward-only changes require a separately reviewed single migration, explicit project identity, the exact source SHA, an isolated local replay and production effect/permission verification.

## Required controlled reconciliation

1. Snapshot the complete remote migration history (version, name, **stored executed SQL if available**) and the corresponding versioned repository blobs. Capture exact production schema/grants/policies/triggers, and obtain an approved backup/restore plan. Avoid exposing customer records or credentials.
2. Form an evidence-backed many-to-many mapping of remote executions to repository migrations, matching actual executed SQL/normalized statements and resulting schema—not just filenames. Handle duplicate remote names and intentionally split or combined migration bodies explicitly.
3. Identify genuinely unapplied changes by schema and history evidence. If anything is ambiguous, do not mutate `schema_migrations` or let automatic deployment infer that a migration is missing.
4. Test any proposed repair with a non-production database restored or reconstructed under an approved plan. Compare critical RLS, auth-definer privileges, provider cost triggers, support policies, performance/security advisors and application smoke tests.
5. Review the exact migration-history repair diff and operational restore path with the project owner. Only after explicit sign-off should a narrow, documented repair be applied. A migration-history repair changes bookkeeping, not the underlying schema, and must never impersonate an actual SQL execution.
6. After reconciliation, make all future migrations share **one** authoritative version from repository creation through production recording. Capture both the source commit SHA and applied version receipt; add a release gate for drift before restoring any automatic production push.

Track the controlled reconciliation as a separate infrastructure task rather than guessing at a global automatic fix. All current production financial metrics remain evidence-bounded: no invented infrastructure expenses, customer decisions or billed usage.
