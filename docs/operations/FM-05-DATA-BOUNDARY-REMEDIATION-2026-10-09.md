# FM-05 — Database evidence-integrity and project-key gate (9 October 2026)

**Classification:** non-production implementation preparation. **Authority:** FM-00. **Do not run a blanket production Supabase migration push.**

## Exact inspection checkpoint

- Canonical GitHub `main`: `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
- Production project: `vuujwdxivjsdikdstwib`, PostgreSQL 17.6.
- 124/124 public tables have RLS enabled; 221 policies.
- 96 production migration records and 93 repository SQL files. Their 96 version/name/SQL SHA-256/Git blob receipts exactly match the pinned **26 September** historical snapshot. This only proves the *recorded ledger* was unchanged between observations.
- Of 96 recorded SQL bodies, 36 are byte-equal to files on current main. An earlier independent audit classified 33 more as matching after removing precisely one terminal LF from the local file. The remaining 27 are not resolved by these two strict evidence tiers.
- 36 production foreign keys point at `public.projects`; 2 are composite with `organization_id`. Six read-only relationship checks returned zero recorded organization mismatches. There are currently no organizations with two projects in production.
- `authenticated` has `INSERT/UPDATE/DELETE` table privileges on `prompt_versions`, `run_attempts`, `source_observations` and `jobs`. RLS allows owner/admin/analyst writes on those tables. This is an **authorized-member evidence-integrity/tampering risk**; a credentialed exploit was NOT performed or claimed.
- The `update_prompt_versioned` definer RPC is callable by authenticated members, but contains a role check, organization predicate, and row lock. Do not revoke without replacing its essential customer workflow.

## Independently verified buyer-question history gap (9 October 2026)

- Live read-only aggregate: 50 buyer questions and 50 version rows, but **one active question is missing both version 1 and its current version**, and **that same question has already been referenced in a monitoring-run selection**. The checks refer to the same question, not two separate customer records. No question text or UUID was exported.
- Historical immutability is not repairable through guesswork. Do not insert a retroactive version row based on the question's mutable current text, and do not alter old run selections. Investigate source records and decision provenance under restricted access; retain an explicit `history_missing`/unverifiable classification in any customer-facing proof derived from that question until provenance is proved.
- The preflight now outputs only aggregate counts for missing initial/current versions and historical selection overlap. This prevents false "everything is versioned" claims without disclosing customer content.

## Added non-destructive preflight

`scripts/audit-fm05-data-boundaries.sql` is **read-only** and returns *only* catalog metadata, policy predicates, grant flags, six mismatch counts, and hash-only migration receipts; no raw customer or SQL-body data. Run through authorized read-only SQL tooling against a verified project, after reading it. It must not be wired into a production migration or scheduled blindly.

`tests/fm05-data-boundary-preflight.test.mjs` verifies source-level safety/coverage of the diagnostic. It **cannot** prove production authorization correctness. Runtime security tests remain owner-gated to an isolated database with two organizations, and two sibling projects inside one organization.

## Proposed changes: unimplemented and owner-gated

1. **Historical immutable versions:** convert question creation from two user-token PostgREST writes (`prompts` and `prompt_versions`) to a *single atomic, authorization-checked database RPC*; keep `update_prompt_versioned` as the only authorized update/versioning path. Then revoke authenticated direct `INSERT/UPDATE/DELETE` on `prompt_versions`. Revoke `UPDATE/DELETE` earlier only after isolated tests prove safe.
2. **Provider attempts:** `lib/jobs/inngest.ts` writes through service role; audit every caller before revoking authenticated `INSERT/UPDATE/DELETE` on `run_attempts`, and preserve cost-ledger triggers. Prove attempts cannot be manufactured by an authenticated analyst via PostgREST.
3. **Project ownership:** add `(organization_id, project_id) -> projects(organization_id,id)` foreign-key contracts in careful batches (`NOT VALID` followed by `VALIDATE`), retaining existing delete behavior. Confirm all table columns and representative write paths, and test mismatching organization IDs before rollout.
4. **Human evidence review:** preserve legitimate reviewer edits before restricting `source_observations` writes; use explicit project-checked review transitions rather than permitting arbitrary rewriting of collection fields.
5. **Search:** keep Postgres as sole authoritative product database. Evaluate `pg_trgm`/FTS only after realistic query plans show a measured need.
6. **Recovery and migration lineage:** finish #332 against exact stored-SQL evidence, restore nonproduction backups, and obtain written FM-00/founder approval for any production migration or history repair.

## Acceptance before merging a real schema change

- In isolated PostgREST, test anonymous, unrelated organization member, viewer, analyst, owner/admin and service-role behavior for INSERT/SELECT/UPDATE/DELETE.
- Force forged prompt-version insert, update and delete; unauthorized attempt writes; cross-org and sibling-project references; stale sessions; concurrent prompt edits.
- Verify the exact RPC workflow and trigger-generated ledger receipts still work, no production secrets exposed, and no missing/version-divergent migrations applied automatically.
- Run full `pnpm test`, typecheck, lint, build, migration replay, CI, and the repository release gate at pinned SHA.
- Explicit owner signoff and FM-00 migration ownership before any deploy. Backout must include a successfully rehearsed restore path.

This documentation does not claim an exploit, repaired RLS, passing end-to-end integration tests, migration parity, or production deployment. It does not supersede [migration lineage issue #332](https://github.com/injamhaqq/foremention/issues/332).
