# Foremention Reporting + Executive Communication — Implementation Plan

**Date:** 2026-08-30  
**Base:** `main` @ `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`  
**Branch:** `build/billion-dollar-13-reporting`

## Goal

Add a reporting communication layer without replacing Recommendation Records, Comparisons, or the Outcome Ledger. Reports are immutable snapshots of already-persisted customer evidence and decisions; they never create evidence or imply causality.

## Verified starting state

- Recommendation Record CSV exists at `app/api/export/record/[id]/route.ts`, but is answer-row oriented and does not carry the full executive truth envelope.
- Record sharing uses 32 random bytes, SHA-256 token hashing, expiry and revocation with tenant-scoped writes.
- Comparison logic withholds movement unless reviewed measurement context is comparable.
- Outcome Ledger links resolution assets to baseline/follow-up runs and labels changes as observed associations, not causal effects.
- Production dependencies contain no browser/PDF rendering package; keep the implementation Cloudflare/Vinext compatible.

## Architecture

### 1. Truth + immutable snapshot layer

Create `lib/reporting.ts` and `report_snapshots` persistence.

A report snapshot contains:
- schema version, report type, generated/data-as-of timestamps and reporting period;
- organization/project scope;
- source Recommendation Record IDs and run IDs;
- exact questions and provider/model context;
- measurement environment;
- evidence state;
- comparison eligibility;
- uncertainty;
- customer review state;
- actions/outcomes with explicit non-causal limitations;
- deterministic integrity hash material.

Nine canonical report types are a closed union.

### 2. Export + communication layer

Create `lib/report-export.ts` and one authenticated report export endpoint.

Formats:
- JSON: complete snapshot contract;
- CSV: audit-friendly flattened source rows;
- HTML/print: semantic headings, tables, captions, print CSS;
- PDF: dependency-free standards-compliant PDF document for durable export;
- email-ready: subject + text + HTML body, never sent by the formatter;
- presentation-ready: structured slide outline JSON with source references.

All authenticated exports use private/no-store/noindex headers.

### 3. Sharing security

Create report-specific shares rather than overloading Recommendation Record shares.

- 256-bit random raw token; SHA-256 only persisted;
- bounded expiry;
- revocation;
- RLS and organization scope;
- public-safe payload separate from private snapshot;
- access log records share/report/time/request fingerprint metadata without storing the raw token;
- `noindex`, `nocache`, no raw provider transcripts, no internal-only fields.

### 4. Scheduling + delivery safety

Persist schedules, recipients and delivery attempts.

Cadences: manual, weekly, monthly, quarterly.

External email delivery is fail-closed until an explicit enable flag, recognized provider and sender configuration are all present. Scheduler architecture may create/log a blocked delivery attempt, but must not pretend mail was sent.

Recipients have unsubscribe state. Every attempt has status, attempt number, timestamps and a stable error signature for retry/audit.

### 5. Executive visualization contract

Create semantic, data-first visualization specs with accessible tabular fallbacks for:
- longitudinal change;
- competitive difference;
- evidence coverage;
- action status;
- outcomes;
- risk/opportunity.

No decorative gauges, unlabeled sparklines, or canvas-only meaning. Where evidence is insufficient, the visualization says so rather than manufacturing a datapoint.

### 6. Product surface

Add a contextual `/app/reports` workspace surface, preserving the locked five-object global navigation. The screen explains available report types, truthful export formats, schedule readiness, and recent report snapshots when tables exist. Public report share lives at `/share/report/[token]`.

## Test order

1. Add `tests/reporting-executive-communication.test.mjs` first (expected red until implementation exists).
2. Add pure reporting/export/scheduling modules.
3. Add additive SQL migration with RLS and share RPC.
4. Add authenticated export/share APIs and public share page.
5. Add workspace reporting surface and contextual navigation entry.
6. Run repository test/typecheck/lint/build via CI and fix only evidence-backed failures.

## Non-goals / safety boundaries

- Do not synthesize customer proof, revenue, ROI, market movement, or causality.
- Do not send email while provider configuration is absent.
- Do not expose raw provider transcripts on public report links.
- Do not make report snapshots editable after generation; corrections create a new snapshot/version.
- Do not introduce a second action/outcome ledger or comparison engine.
- Do not add a PDF browser dependency to the production runtime.
