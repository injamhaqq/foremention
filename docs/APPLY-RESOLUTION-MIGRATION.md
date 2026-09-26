> **HISTORICAL HANDOFF — NOT A CURRENT PRODUCTION MIGRATION INSTRUCTION (verified 2026-09-26).** The live Foremention project now contains all three Resolution Engine tables described below, and the connected project is reachable. Do **not** repeat these dashboard SQL steps or run a blanket `supabase db push` on this existing project. Its recorded migration versions differ extensively from the checked-in filename versions. See [Production migration lineage and reconciliation](operations/PRODUCTION-MIGRATION-LINEAGE-2026-09-26.md) before making **any** migration-history repair or global CLI push.

# Applying the Resolution Engine migration

The Resolution Center and Outcome Ledger read three tables that do not exist in
production yet. Until the migration below is applied, both pages show an
explainable "not enabled yet" notice instead of records. No customer data is at
risk, and nothing is estimated in the meantime.

## Why an agent could not apply it

The Supabase MCP connector in the Claude Code session is authenticated to a
different Supabase account: organization `ProofFlow`, containing one inactive
project named `Vorinas`. The Foremention project (`vuujwdxivjsdikdstwib`) and the
`Foremention` / `foremention-dev` organizations are not visible to that token, so
the migration cannot be applied from the session. Applying it to `Vorinas` would
have created infrastructure in the wrong project, which the handoff forbids.

## Option A — Supabase dashboard (no installs, recommended)

1. Open the SQL editor for the Foremention project:
   `https://supabase.com/dashboard/project/vuujwdxivjsdikdstwib/sql/new`
2. Confirm the project reference in the URL bar reads `vuujwdxivjsdikdstwib`
   before pasting anything.
3. Open `supabase/migrations/20260804000100_resolution_engine.sql` in this
   repository, copy its entire contents, and paste it into the editor.
4. Run it. The script is wrapped in `begin; ... commit;`, so it either applies
   completely or leaves the database untouched.
5. Expected result: `Success. No rows returned`.

The migration is forward-only. It creates three new tables
(`resolution_assets`, `resolution_asset_evidence`, `resolution_follow_ups`),
their indexes, validation triggers, and row-level-security policies. It contains
no `drop`, no `delete`, no `update` of existing rows, and no change to any
existing table.

## Option B — Supabase CLI (**BLOCKED FOR THIS EXISTING PRODUCTION HISTORY**)

Do not run a blanket migration push: repository timestamps and applied remote history are not aligned, and some remote entries are aliases or duplicates. A command that appears to apply only pending migrations may replay earlier SQL. Follow the [lineage audit and controlled reconciliation procedure](operations/PRODUCTION-MIGRATION-LINEAGE-2026-09-26.md) instead. This warning does **not** block isolated local CI migration replay or independently reviewed forward-only migrations against the known connected project.

## Option C — reconnect the MCP connector

Authorize the Supabase MCP server with the account that owns the Foremention
project, then an agent session can apply and verify it directly.

## Verifying it worked

Run this in the SQL editor. It should return three rows, each with
`rowsecurity = true`:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('resolution_assets', 'resolution_asset_evidence', 'resolution_follow_ups')
order by tablename;
```

Then confirm the policies exist — this should return eight rows:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('resolution_assets', 'resolution_asset_evidence', 'resolution_follow_ups')
order by tablename, policyname;
```

## After it is applied

1. Sign in to a real workspace and open `/app/resolutions`. The pending-migration
   notice must be gone.
2. Review a run so at least one source observation reaches `verified`.
3. Generate a resolution draft, submit it, approve it as an owner, mark it
   applied with a real destination, then request the comparable remeasurement.
4. Open `/app/outcomes` and confirm the five-step chain and the before/after
   deltas render for that record.

Do not deploy before that journey passes end to end.
