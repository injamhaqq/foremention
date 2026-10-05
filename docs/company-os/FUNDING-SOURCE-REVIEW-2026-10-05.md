# Company OS Funding Source Review

Date: 2026-10-05

## Goal

Add a bounded internal Capital OS layer that can safely re-inspect an already verified official funding source, persist Foremention-native bounded page evidence, and record an explicit human operator review receipt.

This increment does **not** discover programs, parse eligibility criteria automatically, change funding-draft eligibility, submit applications, send email, open browser forms, accept terms, spend money, or deploy anything.

## Authority boundary

The internal API is `GET|POST|PATCH /api/internal/company-os/funding-source-reviews`.

Every live request must fail closed unless the viewer:

- is an authenticated non-demo Supabase user;
- is in `FOREMENTION_COMPANY_OPERATOR_EMAILS`;
- is an owner or admin of the exact `FOREMENTION_COMPANY_OS_ORGANIZATION_ID`;
- can see the exact active `FOREMENTION_COMPANY_OS_PROJECT_ID` under the viewer token.

The viewer token proves identity, membership, exact active project visibility, and the evidence item. Native source/snapshot writes and the internal review ledgers are trusted server-only writes using `SUPABASE_SERVICE_ROLE_KEY` after those checks pass.

Public, anon, and authenticated browser roles receive no direct access to the new Company OS source-check/review tables.

## Source inspection

POST accepts only:

```json
{
  "schemaVersion": 1,
  "evidenceItemId": "<uuid>"
}
```

The evidence item must already belong to the configured Company OS project and be:

- `evidence_type = funding_program_official`;
- `verification_status = verified`;
- backed by a public HTTPS `source_url`;
- backed by non-empty `usage_rights`;
- not expired.

The route must use the existing `validatePublicSourceUrl` / `inspectSourceUrl` safety boundary, request bounded visible text only, and reuse the organization-wide native `sources` record for the exact canonical evidence URL (creating that native source server-side if absent).

The route must persist the observation through the existing `persistSourceSnapshot` engine with a bounded evidence excerpt. It must not store a full raw page body.

Each inspection creates an immutable, project-scoped `company_funding_source_checks` receipt that binds:

- organization and project;
- evidence item;
- native source;
- exact source snapshot;
- evidence verification timestamp observed at check time;
- actor;
- checked time;
- explicit internal-review-only authority flags.

## Human review

PATCH accepts only:

```json
{
  "schemaVersion": 1,
  "checkId": "<uuid>",
  "decision": "accepted | rejected",
  "note": "optional bounded operator note"
}
```

A review is append-only. One check receives at most one decision. The database must independently verify that:

- the check belongs to the configured organization/project;
- the decision actor is an owner/admin of that organization;
- the checked evidence still belongs to that same project, remains official/verified/source-linked/rights-bearing, and still points to the same URL;
- an `accepted` decision is impossible when the exact snapshot was blocked, unreachable, or otherwise not safely retrievable.

Acceptance means only: **the operator reviewed this bounded source observation and accepts it as current evidence for later Capital OS use**. It grants no submission or spend authority.

This increment does not automatically update `evidence_items.verified_at`. It also does not yet make an accepted source review mandatory for funding draft creation; that gate is a subsequent bounded increment.

## Read surface

GET returns a bounded recent list for the configured project by joining the internal check/review receipts server-side. It must not expose other organizations or projects.

## Storage and deletion

Both new tables are service-only, RLS-enabled, project-scoped, and append-only to ordinary application flows. Workspace/account deletion may remove them through the existing privileged deletion/cascade path.

## Native reuse

Use, do not replace:

- `lib/source-inspection.ts`
- `lib/source-snapshots.ts`
- `public.sources`
- `public.source_snapshots`
- `public.evidence_items`
- Supabase organization/project truth
- the existing Company OS operator allowlist

No new crawler, workflow orchestrator, vector store, browser automation framework, or external database is introduced.
