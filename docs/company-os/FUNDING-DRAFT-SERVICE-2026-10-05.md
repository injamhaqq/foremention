# Authenticated Company OS funding draft service

Date: 2026-10-05

This increment extends the bounded funding draft runtime from the stacked funding branch. It does **not** activate funding discovery, submissions, email, browser automation, payments, account changes, production deployment, or new external authority.

## Boundary

The API surface is `GET|POST /api/internal/company-os/funding-drafts`.

It fails closed unless all of the following are true:

- the viewer is an authenticated live Supabase user, never demo;
- the viewer email is explicitly present in `FOREMENTION_COMPANY_OPERATOR_EMAILS`;
- the viewer is an owner or admin member of the exact configured Company OS organization;
- `FOREMENTION_COMPANY_OS_ORGANIZATION_ID` and `FOREMENTION_COMPANY_OS_PROJECT_ID` are both configured as UUIDs;
- the configured project exists in that organization, is `active`, and is visible through the authenticated user's RLS token.

The route uses the authenticated user's Supabase token for identity, membership, configured-project visibility, official evidence, and Company Truth. Funding artifact reads, duplicate detection, and inserts occur only inside the trusted server route using the existing `SUPABASE_SERVICE_ROLE_KEY` after those user-scoped checks pass. Authenticated browser roles have no direct table privileges.

## POST input

The browser/request may provide only:

```json
{
  "schemaVersion": 1,
  "programEvidenceIds": ["<verified evidence_items UUID>"],
  "opportunities": [
    {
      "id": "program-key",
      "name": "Program name",
      "kind": "grant",
      "sourceEvidenceId": "<one of programEvidenceIds>",
      "deadlineAt": "2026-11-01T23:59:59Z",
      "criteria": [],
      "questions": []
    }
  ]
}
```

The caller cannot provide `organizationId`, `projectId`, `asOf`, `profileRevision`, evidence verification, or company facts. Scope and time are bound by the server.

Each program evidence record must already exist in the configured Company OS project and be current, verified, source-linked evidence with usage rights and exact `evidence_type = funding_program_official`. The route snapshots its URL and verification timestamp and caps program-source freshness at 30 days.

Company facts are derived only from the configured project's single Company Truth entity and its current `verified` assertions. A scalar fact is included only while its same-project evidence remains verified, source-linked, rights-bearing, and unexpired. The service ignores caller claims that a company fact is verified because caller facts are not accepted at all. The profile revision is a deterministic digest of the current usable Company Truth assertion set actually admitted to the draft.

If there is no current scalar Company Truth fact, the draft can still be persisted, but affected eligibility criteria and required answers remain unknown/blocked. If more than one Company Truth `company` entity exists in the configured project, the service fails closed rather than choosing one.

## Artifact persistence

Migration `20261005000100_company_funding_draft_artifacts.sql` creates append-only artifact revisions with:

- organization/project scope;
- authenticated creator;
- Company Truth profile revision;
- package/input/artifact digests;
- official program evidence IDs;
- Company Truth assertion IDs;
- the exact deterministic draft artifact;
- creation timestamp.

The artifact table is service-only: `public`, `anon`, and `authenticated` receive no direct table privileges. RLS remains enabled as defense in depth, while route-level authorization establishes the authenticated operator and exact active configured project before any trusted server read or write. A validation trigger independently rejects inactive/mismatched organization-project scope, creators who are not owner/admin members of the persisted organization, unverified/cross-project program evidence, stale or superseded Company Truth provenance, artifact evidence that does not match those source records, and any artifact that changes the bounded authority flags.

Workspace/account deletion may still remove records through the repository's privileged retention/deletion process and foreign-key cascades. "Immutable" here means application revisions are append-only; it is not a promise of indefinite retention.

## Truth and authority limits

The generated pack remains:

- `mode: internal_draft_only`;
- `externalEffects: false`;
- `submissionAuthorized: false`;
- `requiresSubmissionApproval: true`.

This service still does not fetch or re-read a funding website. `programEvidenceIds` establish that a human-reviewed official source record exists in the configured Company OS project; the criteria, questions, and deadline carried in the POST request remain operator-transcribed draft inputs. They must be checked against the official source before relying on eligibility or a deadline.

The service does not create Company Truth, verify evidence, discover opportunities, draft narrative beyond the existing deterministic fact-backed answers, submit forms, send messages, accept terms, make legal declarations, spend money, or write the native action ledger.

## Required setup before any live request

1. Deploy the migration through the normal release process.
2. Create or designate a dedicated internal Company OS organization and active project.
3. Configure the exact organization/project UUIDs in the server environment.
4. Ensure the server-only `SUPABASE_SERVICE_ROLE_KEY` is configured and never exposed to browser code or model prompts.
5. Ensure the founder/operator email is in `FOREMENTION_COMPANY_OPERATOR_EMAILS`.
6. In that project, maintain one Company Truth `company` entity with reviewed, evidence-backed assertions.
7. Store each official funding source as a verified `evidence_items` row with `evidence_type = funding_program_official`, source URL, usage rights, and appropriate expiry/review cadence.
8. Use only current official program terms, closing time/timezone, and truthful Company Truth attributes.

No IDs, facts, evidence, eligibility, deadline, program, customer, revenue, award, or production configuration are asserted by this document.

## Known gaps after this increment

- No production environment IDs have been set by this change.
- No migration has been deployed by this change.
- No real funding source or real company profile has been evaluated by this change.
- Program criteria/deadline transcription is not independently re-read by the service.
- There is no funding discovery/source-change worker yet.
- There is no native task/action/event binding for this service yet.
- There is no submission executor, credential scope, provider receipt, or follow-up workflow.
- Stage 0 customer proof remains the operating priority; this funding service is internal infrastructure only.
