# Foremention workspace export and controlled restore

Foremention workspace exports are owner-authorized recovery archives. They preserve customer-owned workspace configuration, membership/entitlement state, measurement records, evidence provenance, decisions, actions, and reviewed follow-up links while deliberately excluding authentication secrets, provider credentials, integration credentials, webhook secrets, invitation token hashes, and service-account key material.

## Export boundary

The canonical archive is the ZIP returned by the workspace export endpoint. `manifest.json` records the organization identity, generation time, dataset counts, and exclusions. `workspace.json` contains the same manifest plus every exported dataset. Per-dataset JSON and CSV files are convenience representations; `workspace.json` is the recovery source of truth because JSON preserves arrays, objects, nulls, UUIDs, timestamps, and numeric values without CSV coercion.

`source_snapshot_observations` is exported through the tenant-owned `source_snapshots` graph because the relationship table itself has no `organization_id`. This prevents a broad unscoped relationship export. `run_prompt_selections` is ordered by its persisted `(run_id, prompt_key)` key so repeated exports paginate deterministically.

## Permanent deletion boundary

Permanent deletion remains a separate, owner-only operation. It requires recent authentication, a seven-day reversible safety window, a second explicit owner confirmation, and acknowledgement that the export has been downloaded. The database deletion RPC records a non-identifying receipt and then deletes the organization so tenant-owned rows cascade according to schema constraints. Authentication infrastructure and the non-identifying deletion receipt are intentionally outside the workspace archive.

## Controlled restore procedure

There is no public self-service “undo permanent deletion” button. A restore is an operator-controlled recovery procedure and must target an empty/disposable or explicitly approved recovery environment. Never merge an old archive into a live organization with the same identifiers without a separate reconciliation plan.

1. Verify the archive source, `manifest.organizationId`, generation time, and dataset counts. Reject archives with an unknown format or unexpected secret-bearing datasets.
2. Ensure the referenced authentication users exist in the target auth system before restoring rows that reference user IDs. The workspace archive does not recreate passwords, sessions, MFA factors, or provider credentials.
3. Restore `organization` first, then `organization_members` and singleton organization state such as entitlements/governance settings.
4. Restore parent product records before children: projects/categories/domains/competitors/prompts, then runs and immutable prompt selections, answers/citations/sources, evidence and Source Map records, then action/decision/follow-up records.
5. Restore relationship tables only after both parents exist. This includes `verified_claim_evidence`, `source_snapshot_observations`, cross-business evidence links, and resolution evidence links.
6. Do not restore queued/running background work blindly. A production recovery must review run/schedule state before re-enabling dispatch so stale work is not replayed against providers.
7. Reconnect external integrations and webhooks separately with newly authorized credentials. Secrets are intentionally absent from the export.
8. Compare restored dataset counts against `manifest.datasets` and verify representative foreign-key chains, source-snapshot excerpts, review decisions, and follow-up records before declaring recovery complete.

## Executable acceptance proof

`scripts/verify-workspace-export-delete-restore.sql` runs in CI only after all migrations are replayed into the isolated local Supabase database. It creates a synthetic canonical workspace graph, captures that graph as JSON in the same record shape used by the export, executes the real permanent-deletion RPC after an eligible deletion request, proves the tenant graph disappeared and a deletion receipt remains, then restores the captured JSON in dependency order and verifies the representative evidence/provenance relationships exactly.

The script runs inside a transaction that is rolled back. It must never be pointed at production. Production deletion is verified through the application’s guarded owner flow; destructive restore testing belongs only in a disposable database.
