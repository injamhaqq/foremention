# Foremention Retention Loop 1–25 Design

## Purpose

Turn the existing Foremention private-beta foundation into a cohesive, repeatable Recommendation Intelligence product that reaches value quickly, brings teams back for comparable remeasurement, and is commercially/enterprise ready without changing the public homepage or weakening the existing evidence-integrity architecture.

## Locked boundaries

- Do **not** redesign or replace the homepage.
- Preserve the five primary signed-in objects: `Attention -> Questions -> Records -> Comparisons -> Settings`.
- Preserve Recommendation Record as the canonical product object.
- Evidence inspection remains contained inside the Recommendation Record; do not restore standalone Source X-Ray navigation.
- Preserve the truth chain: `buyer question -> provider/model -> answer -> named/recommended brand -> returned reference -> distinct source -> retrievability -> evidence -> human review -> competitor context -> decision -> action -> comparable later measurement`.
- Never collapse Returned, Retrieved, Observed, Reviewed, and Safe conclusion into a generic “verified” state.
- Do not claim causation, rankings, citation guarantees, traffic, leads, or revenue.
- Keep current provider adapters, `/api/runs`, Inngest execution, RLS, cost/quota controls, demo isolation, and existing production safety gates.
- Keep the canonical black/graphite + registered-green product visual system. No white/light dashboard surfaces.
- Keep private-beta commercial truth: no paid entitlement is activated unless a verified billing webhook exists and a real price/plan is configured.

## Scope mapped to items 1–25

### 1. First-run onboarding
Onboarding must produce a workspace context, a five-question starter set, selected competitors, and a clear first-collection CTA. Existing generated setup is retained; the UI must show an explicit activation path and cannot fabricate provider readiness.

### 2. Recurring measurement
Add organization-scoped measurement schedules with cadence `weekly`, `biweekly`, or `monthly`, timezone, selected question IDs, selected provider IDs, exact model/methodology snapshots, pause/resume state, next-run time, and last-run metadata. Scheduled runs must call the same trusted server-side run path as manual collection and must be idempotent.

### 3. Attention Inbox
Attention becomes the primary actionable feed. It aggregates persisted, truthful signals from onboarding state, failed/running collections, comparable movement, unreviewed evidence, due/overdue actions, alerts, and review needs. It does not create a second truth store.

### 4. Change detection
For reviewed collections, derive change items only when exact comparability gates pass. Supported v1 change kinds: recommendation presence changed, competitor appearance changed, citation/source set changed, evidence review backlog changed, and action remeasurement due. The system must surface “comparison withheld” when conditions do not match.

### 5. Executive Recommendation Record
Each Record must present: buyer question, provider/model/methodology, answer, brand outcome, evidence-state chain, competitor context, safe-conclusion state, reviewed sources, linked actions, and eligible later comparisons. This is an enhancement of the existing Record, not a replacement route.

### 6. Evidence Inspector
Keep current contained evidence inspection and strengthen source details, human-review state, provenance, citations, notes, and review history. Opening/closing evidence never changes review state implicitly.

### 7. Action system
Actions must support owner, due date, priority, status, linked source/opportunity, linked Recommendation Record/run, notes, and a remeasurement target. Existing placement/action data remains canonical where possible.

### 8. Before/after impact loop
Actions may link to a later eligible comparison. The UI may state “change observed after this action” only when chronology exists; it must not state the action caused the change. When comparability is ineligible, the loop explicitly withholds movement.

### 9. Alerts
Extend current in-app notifications to meaningful retention events. Email delivery is opt-in and requires an active configured mail provider; otherwise the UI remains in-app only. No fabricated delivery state.

### 10. Shareable stakeholder view
Add signed, revocable, read-only share links for Recommendation Records. Shared views expose only the selected Record and approved evidence fields, never workspace navigation, secrets, internal notes marked private, or cross-tenant data.

### 11. PDF/CSV/board-ready export
Extend export support with a print/PDF-friendly Record view and CSV evidence export. PDF is browser-print compatible unless a server PDF renderer is genuinely configured. Do not claim server-generated PDF when it is not.

### 12. Design-partner analytics
Track only internal IDs and safe categorical/bucketed properties for: activation completed, first collection, first Record viewed, first evidence reviewed, first action created, first comparable second cycle, schedule enabled, share created, and team invite sent.

### 13. Paid pilot/billing foundation
Add an organization billing state and signed-webhook entitlement path that remains inactive until real billing provider configuration exists. No price is hardcoded. No checkout appears as live when configuration is missing.

### 14. Commercial packaging
Represent Core, Signal, and Intelligence as entitlement bundles whose final prices remain configuration/contract facts. Feature access reads entitlements, not marketing copy.

### 15. Category benchmark engine
Add benchmark-ready aggregation boundaries and an organization-facing benchmark view that uses only the organization’s own data unless an anonymized benchmark cohort has enough configured samples. V1 must safely show “benchmark unavailable” rather than invent cross-customer numbers.

### 16. Automatic competitor discovery
Derive candidate competitors from named brands appearing in persisted answers. Candidates require human confirmation before joining the configured competitor set.

### 17. Buyer-question intelligence
Generate suggested questions from existing workspace context and categories while clearly labelling them suggestions until approved. Keep five-question starter activation as the default.

### 18. Question clustering
Use the existing cluster taxonomy (`Discovery`, `Comparison`, `Alternative`, `Use case`, `Trust`, `Constraint`) and surface cluster coverage/filters. Do not add a competing taxonomy.

### 19. Recommendation-gap diagnosis
Create a grounded diagnosis view that compares customer vs competitor appearance and reviewed evidence. Each diagnosis must cite the specific Records/evidence it derives from and distinguish observation from inference.

### 20. Evidence quality scoring
Expose component-level evidence quality dimensions (freshness, retrievability, source authority category, corroboration count, review state) rather than a single unexplained score. Any composite label must reveal its inputs.

### 21. Multi-market / locale measurement
Add optional locale/market metadata to question sets/schedules/runs and include it in comparability. Locale differences must prevent exact movement claims unless explicitly equivalent by methodology.

### 22. Multi-brand / multi-product workspace
Use the existing project/domain model to let one organization create/select multiple monitored projects/products without duplicating organizations. Every run/schedule/Record remains project-scoped where applicable.

### 23. Team collaboration
Strengthen existing invitations/team surfaces with comments/notes, assignment, review requests, and visible ownership where data models already support them. Preserve organization membership boundaries.

### 24. Role permissions
Support owner/admin/member/reviewer/stakeholder behavior at the application layer on top of RLS. Owners control billing/security; admins manage workflows/team; members run/review; reviewers can review evidence; stakeholders are read-only.

### 25. SSO/SAML foundation
Add a truthful enterprise SSO entry path backed by Supabase SSO when configured for the workspace/domain. If no SSO provider exists, the product says “SSO not configured”; it must not simulate SAML. SCIM is intentionally not part of item 25 in this pass because the approved list’s item 25 is SSO/SAML and SCIM was item 26.

## Data model changes

Create one additive migration with:

- `measurement_schedules`: organization/project, cadence, timezone, question/provider selections, exact collection snapshot, next/last run, enabled state, unique idempotency key.
- additive action/placement fields: owner user, due date, priority, linked run/record, remeasurement schedule/target.
- `record_shares`: organization, run/answer/record reference, token hash, created_by, expires/revoked timestamps, approved evidence visibility.
- `billing_accounts`: organization, provider, external customer/subscription IDs, state, verified webhook timestamp; no prices.
- `organization_entitlements`: organization, entitlement key, enabled, source, effective dates.
- optional `market`/`locale` columns on prompt versions/run snapshots where needed for exact comparability.
- optional project selection on schedule/run paths if not already present.
- role enum additions only if reviewer/stakeholder are not already represented.

Every new customer-owned table enables RLS and derives organization identity server-side.

## Service boundaries

- `lib/retention-loop.ts`: pure derivation for Attention items, change items, activation state, and retention milestones.
- `lib/measurement-schedules.ts`: schedule validation/next-run/idempotency logic.
- `lib/entitlements.ts`: commercial capability checks; no pricing facts.
- `lib/record-sharing.ts`: token creation/hash/expiry/revocation helpers.
- `lib/enterprise-sso.ts`: workspace SSO configuration lookup and Supabase SSO request shaping.
- Existing `lib/data.ts`, provider adapters, and Inngest execution remain authoritative for persisted product data and collection execution.

## API/UI changes

- `/app` Attention: unified prioritized feed plus existing truthful metrics.
- `/app/settings`: schedules, notification preferences, billing/entitlements status, SSO status, project selection, and team controls.
- `/app/runs/[id]`: executive Recommendation Record + contained inspector + linked actions/comparison/share/export controls.
- `/app/analytics`: exact-comparison changes, cluster/market filters, benchmark-unavailable truth state.
- `/api/schedules`: create/update/pause/resume schedules using authenticated organization/project context.
- Inngest scheduled dispatcher: evaluates due schedules and emits the same internal run request contract with deterministic idempotency.
- `/api/records/[id]/share`: create/revoke signed read-only share links.
- `/share/record/[token]`: revocable read-only stakeholder view.
- `/api/billing/webhook`: signature-verifying entitlement activation boundary when provider config exists; otherwise fail closed.
- `/api/auth/sso`: configured workspace/domain SSO only.

## Analytics milestones

Add safe events for:

- `first_record_reviewed`
- `action_created`
- `second_comparable_cycle_completed`
- `measurement_schedule_enabled`
- `record_share_created`
- `team_invite_sent`

No email/domain/customer name/raw question/raw answer is sent to product analytics.

## Testing

Required before merge:

- migration replay and RLS contract tests for all new tables;
- schedule validation, pause/resume, next-run calculation, idempotency, and no duplicate run tests;
- exact comparability includes locale/market/model/methodology/question text;
- Attention derives only persisted truth and withholds unsupported movement;
- record-share expiry/revocation/cross-tenant tests;
- billing webhook fails closed without valid signature/configuration;
- SSO fails closed when not configured;
- role access contract tests;
- analytics contract rejects PII and accepts new milestone events;
- existing unit/contract suite, lint, typecheck, build, security, browser acceptance, and exact-release canary remain green.

## Success criteria

A new private-beta customer can: complete setup -> approve five questions -> run a real provider -> inspect a Recommendation Record -> review evidence -> create/assign an action -> enable a repeat schedule -> receive an Attention change when an exact comparable run completes -> compare before/after without causal overclaim -> share/export the Record -> invite a teammate. Enterprise/admin surfaces truthfully show billing and SSO readiness without pretending unconfigured external services are active.
