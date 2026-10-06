# Company OS Funding Draft Reviewed-Evidence Gate

Date: 2026-10-06

## Goal

Make a current accepted Company OS funding-source review receipt a mandatory prerequisite for every official program evidence record used to create a funding draft. Persist the exact source-check and human-review receipt IDs used for the draft so the artifact has an auditable evidence chain.

This increment does not discover programs, extract criteria automatically, submit applications, send messages, execute browser forms, authorize spend, deploy, or change production.

## Authority boundary

The existing internal funding-draft route remains the only application write surface.

The authenticated user token continues to prove:

- live non-demo identity;
- Company OS operator allowlist membership;
- owner/admin membership in the configured organization;
- visibility of the exact configured active project;
- access to the requested official evidence and Company Truth.

The internal source-check/review ledgers remain service-only. The route may read them with the trusted server credential only after the user-scoped checks above pass.

## Current accepted review

Each requested `funding_program_official` evidence item must resolve to one accepted review chain in the same configured organization/project where:

- the review decision is `accepted`;
- the review references a same-project `company_funding_source_check`;
- the check references that exact evidence item;
- the check's `evidence_verified_at` exactly equals the evidence item's current `verified_at`;
- the native source still has the same canonical URL as the evidence item's current `source_url`;
- the exact native snapshot still belongs to that source and URL;
- snapshot access is `open` or `partial`;
- snapshot `content_hash` is non-null;
- snapshot `evidence_excerpt` is non-empty;
- the review decision timestamp is not earlier than the check timestamp;
- the check and review are not from the future;
- the check is no older than the existing `FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS` freshness window;
- the evidence itself remains current, verified, unexpired, rights-bearing, and same-project.

A later evidence reverification, URL change, deleted/cascaded snapshot/check/review, rejected-only chain, stale check, or unreviewable snapshot invalidates the gate.

## Draft evidence semantics

For program evidence, the draft's `observedAt` becomes the accepted source check's `checked_at`, not the older evidence-row verification timestamp. This makes draft freshness reflect the actual reviewed source observation.

Company Truth evidence keeps its existing semantics.

## Artifact provenance

Add to `company_funding_draft_artifacts`:

- `program_source_check_ids uuid[]`
- `program_source_review_ids uuid[]`

Existing historical rows may retain empty arrays after migration. Every new insert after this migration must provide arrays with the same cardinality/order as `program_evidence_ids`.

The database trigger must independently verify the exact ordinal triple:

`program_evidence_ids[i] -> program_source_check_ids[i] -> program_source_review_ids[i]`

against the current evidence/source/snapshot/review state. The trusted server route is not the only enforcement layer.

## Read surface

Funding draft GET should return the persisted check/review provenance arrays with each artifact.

## Failure behavior

Draft creation fails closed with HTTP 409 when any requested program evidence lacks a current accepted source-review chain.

No partial packet is created.

## Native reuse

Reuse:

- `company_funding_source_checks`
- `company_funding_source_reviews`
- `sources`
- `source_snapshots`
- `evidence_items`
- existing Company OS operator/scope checks
- existing deterministic funding draft engine

No second truth store, crawler, orchestrator, or external executor is introduced.
