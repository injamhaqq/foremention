# Company OS Funding Program Registry + Draft Consumption

Date: 2026-10-06

## Goal

Replace caller-transcribed funding opportunity metadata at draft time with a trusted, append-only Funding Program Registry.

A program revision is an operator-confirmed structured record bound to one current accepted funding-source review chain. Funding draft creation consumes current program revision IDs only; program name, kind, deadline, eligibility criteria, application questions, and source evidence are loaded server-side from the registry.

This removes the remaining draft-time trust gap without granting any application-submission, email, browser-form, payment, scheduling, or deployment authority.

## Canonical authority

Base: PR #429 exact verified head `81f7752bb1161adcbc843a1a1ca2af175edfa72f`.

Reuse:

- configured Company OS organization/project scope;
- authenticated operator allowlist;
- owner/admin membership;
- `evidence_items`;
- `company_funding_source_checks`;
- `company_funding_source_reviews`;
- `sources`;
- `source_snapshots`;
- deterministic funding draft engine;
- existing funding draft artifact ledger.

No second crawler, model-based truth store, workflow engine, or external executor is introduced.

## Program revision model

Create service-only `company_funding_program_revisions`.

Each row is immutable and contains:

- `id` — revision ID;
- `program_id` — stable logical program ID;
- organization/project;
- exact official `evidence_item_id`;
- exact `source_check_id`;
- exact accepted `source_review_id`;
- optional `supersedes_revision_id`;
- operator-confirmed `name`;
- `kind`: grant | accelerator | fellowship | credit;
- nullable `deadline_at`;
- strict JSON arrays `criteria` and `questions`;
- creator and creation timestamp;
- bounded authority flags:
  - mode = internal_registry_only
  - externalEffects = false
  - submissionAuthorized = false.

A first revision uses `program_id = id`. A later revision must keep the same `program_id`, reference the immediately superseded revision, and may not fork an already-superseded revision.

Updates are forbidden; corrections create a superseding revision.

## Review provenance

Every revision must bind a still-current accepted review chain in the same organization/project:

evidence item -> funding source check -> accepted review -> source -> exact snapshot.

The database independently verifies:

- project is active;
- creator is owner/admin;
- evidence is current, verified, official, rights-bearing, unexpired;
- check uses the exact evidence item and current `verified_at`;
- source URL is unchanged;
- snapshot belongs to that source and URL;
- snapshot is open/partial with non-null content hash and non-empty bounded excerpt;
- review decision is accepted;
- review occurs at/after check;
- check/review are not from the future;
- check is no older than 30 days.

If any of that changes, a new program revision cannot be created from the stale chain.

Existing revisions remain immutable historical receipts.

## Structured program contract

Criteria preserve the deterministic funding engine contract:

```
{
  id: identifier,
  factKey: identifier,
  operator: "eq" | "in" | "gte" | "lte",
  expected: scalar | scalar[]
}
```

Questions preserve the deterministic funding engine contract:

```
{
  id: identifier,
  prompt: bounded text,
  factKey?: identifier,
  maxChars: 1..2000,
  required: boolean
}
```

Limits:

- name <= 240 chars;
- max 30 criteria;
- max 30 questions;
- unique criterion IDs;
- unique question IDs;
- no unknown properties;
- control characters rejected;
- `gte/lte` require numeric expected values;
- `in` requires a non-empty homogeneous scalar list.

## API

`GET|POST /api/internal/company-os/funding-programs`

GET:
- owner/admin Company OS operator only;
- returns bounded current revisions for configured project;
- superseded revisions are omitted from the current list.

POST:
- trusted mutation origin;
- owner/admin Company OS operator;
- exact active configured project;
- strict bounded body;
- verifies evidence with user token;
- verifies accepted review chain server-side;
- writes one immutable revision via service role.

No PATCH/PUT/DELETE application mutation surface.

## Funding draft consumption

Change the internal funding-draft request to:

```
{
  "schemaVersion": 2,
  "programRevisionIds": ["<uuid>", "..."]
}
```

The caller no longer supplies `programEvidenceIds` or `opportunities`.

The funding-draft route:

1. loads each requested current program revision from the configured project;
2. rejects missing or superseded revisions;
3. revalidates each revision's accepted review chain;
4. derives official evidence IDs and source-check freshness from the registry;
5. reconstructs the deterministic opportunity definitions from registry fields;
6. loads Company Truth as before;
7. prepares the deterministic internal draft.

## Artifact provenance

Add `program_revision_ids uuid[]` to `company_funding_draft_artifacts`.

Every new draft insert must provide one revision ID aligned ordinally with:

- `program_evidence_ids`;
- `program_source_check_ids`;
- `program_source_review_ids`.

The database validates the exact quadruple against the registry and requires that the revision is still current (not superseded) at draft creation time.

Existing historical rows may retain an empty legacy default.

## Deadline semantics

The registry stores the operator-confirmed source deadline.

The deterministic funding engine remains conservative:

- null deadline => blocker `deadline_unverified`;
- deadline <= draft asOf => blocker `deadline_passed`;
- future deadline => no deadline blocker.

This slice does not send deadline reminders. The registry becomes the trusted basis for the later internal Deadline Radar.

## External authority

All records remain internal-only.

This slice does not:

- submit applications;
- send email/messages;
- execute browser forms;
- accept terms;
- spend money;
- change secrets;
- deploy;
- schedule autonomous external actions.
