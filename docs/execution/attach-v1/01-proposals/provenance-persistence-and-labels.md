# Proposal (Chat01 -> Chat06, Chat04, Chat05, FM-00): persist and show reference provenance

Why: CV-11/A09 — independently retrieved search results on the Cloudflare lane are persisted and shown as provider citations. Contract: `lib/evidence-provenance.mjs` (on `fm-attach-v1/01-measurement`). Not applied here because the files belong to other owners / shared schema.

## Chat06 — `lib/jobs/inngest.ts` (persistAnswer, `sources` upsert)
```ts
import { citationOriginForAnswer, REFERENCE_ORIGIN_LABELS } from "@/lib/evidence-provenance.mjs";
const origin = citationOriginForAnswer({ provider: answer.provider, raw: answer.raw });
// replace: source_type: "provider-returned citation",
source_type: origin === "native_citation" ? "provider-returned citation" : origin === "independent_retrieval" ? "independently retrieved search result" : "unknown origin",
```
`sources` rows are org-shared; a source first seen via retrieval and later returned natively should keep per-observation origin. Preferred: add `reference_origin` to `source_observations` (FM-00 migration) and stop deriving origin from `sources.source_type`.

## FM-00 — migration (proposal only, not created)
```sql
alter table public.source_map_entries drop constraint if exists source_map_entries_reference_origin_check;
alter table public.source_map_entries add constraint source_map_entries_reference_origin_check
  check (reference_origin in ('provider_citation','independent_retrieval','answer_url','unknown'));
alter table public.source_observations add column if not exists reference_origin text not null default 'unknown'
  check (reference_origin in ('native_citation','independent_retrieval','answer_url','unknown'));
```
Backfill: rows from runs whose `run_attempts.raw_response->>'retrievalProvider'` is not null => `independent_retrieval`; others stay as recorded. Rollback: restore the single-value check after setting non-`provider_citation` rows back (lossy — keep a snapshot).

## Chat04 — `lib/source-map-generation.ts`, `app/api/export/source-map/route.ts`, record views
- Write `reference_origin` from the observations' origin (after the migration) instead of the constant `"provider_citation"`; analyst note "Provider-returned citation…" must use `REFERENCE_ORIGIN_LABELS[origin]`.
- Export: add `reference_origin`, `reference_origin_label`, `human_review` via `referenceExportColumns()`.
- Record/evidence review UI: show the origin label next to each URL and the human-review overlay separately ("Reviewed by a person" never implies provider citation).

## Chat05 — examples/demo/public copy
- `lib/demo-data.ts` sets `referenceOrigin: "provider_citation"` on every example row; examples presented as the hosted-model lane should use `independent_retrieval` with its label.
- Any copy saying "sources returned by AI" for the Cloudflare lane should say "search results Foremention retrieved and gave to the model".

Acceptance: a reviewer looking at a record, its CSV export and the public example can tell, per URL, whether it was a provider-native citation, an answer-text URL, an independent retrieval result, and whether a person reviewed it.
