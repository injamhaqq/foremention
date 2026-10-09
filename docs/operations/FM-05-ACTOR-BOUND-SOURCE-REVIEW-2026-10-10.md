# FM-05 — Actor-bound Source Map review writer boundary

**10 October 2026. DRAFT / NOT DEPLOYED.** Root issue [#484](https://github.com/injamhaqq/foremention/issues/484). FM-00 is the sole integration and release authority. Base main SHA `d4fea60a7bb8e047f2282cea9134121e9496c67e`.

## Observed production behavior

The canonical review path `app/api/sources/[id]/review/route.ts` takes authenticated member input, checks the active workspace/project and PATCHes `public.source_map_entries` using its member token. That table grants authenticated users full `INSERT/UPDATE/DELETE` and has organization-role write policies. Thus a member can potentially bypass the review UI to change collector-origin ranking, citation counts, provider engines, or page-presence observations. This is a **confirmed overly broad authorization boundary**, not an observed attack or a demonstrated cross-tenant exploit.

Collector tasks in `lib/source-map-generation.ts` use `serviceRole: true`. The existing human route must keep working.

## Additive phase and permission-activation phase

**Phase 1**: `supabase/migrations/20261010000100_source_review_authorized_rpc.sql` adds `public.review_source_map_entry` with fixed search path and restricted EXECUTE. It reads `auth.uid()` and verifies owner/admin/analyst membership; locks the row; checks the exact organization, project, category, published/reviewed Source Map, run and source; only modifies `client_present`, `competitors_present`, `entry_route`, `feasibility`, `influence`, `analyst_note`, `reviewed_at` and `reviewed_by`. It derives the last two fields inside the database. No collector-derived field appears in the UPDATE.

**Application**: the same canonical route calls the authenticated RPC, verifies the persisted actor/entry/source result, uses the DB timestamp for its existing audit, opportunity sync and outbound notification handling. It never PATCHes entry rows directly. An obsolete `emerging` influence option is rejected because production's PostgreSQL enum lacks that value; a separate product/schema decision is required before supporting it.

**Phase 2**: `supabase/migrations/20261010000200_source_review_lock_down_table.sql` revokes broad authenticated DML on `source_map_entries` and removes owner/admin/analyst RLS write policies, retaining authenticated SELECT, existing RLS, the authenticated review RPC, and service-role collector DML. **Do not activate this phase before the RPC-backed application is deployed and functioning.**

## Verification

- Local synthetic `scripts/verify-fm05-source-review-boundary.sql` runs in a single rolled-back transaction. Creates two tenants and two sibling projects in A; verifies owner review, server-derived actor/time, collector fields unchanged, direct UPDATE denied, viewer denied, cross-tenant denied, sibling-project denied, unpublished draft denied, and invalid enum denied.
- `tests/fm05-source-review-writer-boundary.test.mjs` asserts the app, migration and SQL coverage. Full local migration replay invokes the SQL fixture through `.github/workflows/ci.yml`.
- The existing `Isolated Authenticated Journey` runs actual analyst `PATCH /api/sources/:id/review` and checks audit receipt and opportunity generation, so it provides an end-to-end compatibility test when the exact-head run passes.
- Human review and opportunity synchronization are **not one atomic transaction** in this patch; the RPC atomically persists only human-review fields. Existing audit/opportunity/email behavior remains separate and must be checked for partial-failure reconciliation before further scaling.

## Non-negotiable deployment gates

1. Close or explicitly approve the migration lineage reconciliation in [#332](https://github.com/injamhaqq/foremention/issues/332) with independent executed-SQL provenance; **never blanket db push** to the divergent production ledger.
2. Backup/PITR availability and tested isolated restore; ensure new migrations do not clash with parallel FM-00 workstreams. Verify exact-head checks on this branch and the planned integration commit.
3. Apply phase 1 only after isolated production-shaped rehearsal, then deploy and verify application route (analyst allowed; viewer, cross-org/project, stale/deleted map denied) using dedicated controlled fixtures, not live customer probes.
4. Only after healthy new application, apply phase 2 and verify grants/policies for `authenticated` and `service_role`, manual review and collector retries. No retroactive customer review or forged historical audit record.
5. Roll back application before revoking privileges if the RPC is unhealthy. Never grant unrestricted member table writes as an unreviewed workaround.

No production schema, grants, data, or migration ledger was changed in preparing this draft.
