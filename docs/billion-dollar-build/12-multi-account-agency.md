# Chat 12 — Multi-Account, Agency, Multi-Brand, and Enterprise Workspace Architecture

**Status:** Architecture contract / implementation blueprint  
**Repository:** `injamhaqq/foremention`  
**Audited base:** `main` @ `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`  
**Branch:** `build/billion-dollar-12-multi-account`  
**Safety rule:** RLS remains the primary database-enforced tenant boundary. No phase in this plan permits weakening or temporarily bypassing RLS for convenience.

---

## 1. Executive decision

Foremention should evolve from its current **organization-as-tenant** model to a model in which:

- an **Organization** is the durable governance, identity, commercial, billing, and policy container;
- a **Workspace** is the durable brand/product/client data boundary and the default scope for operational records;
- a **Portfolio / Business Unit** is optional and is introduced only for delegated governance, grouping, shared templates, or authorized roll-up reporting;
- a **User** receives access through explicit scoped grants and role presets backed by capabilities;
- an **Agency** does not become the owner of a client's data merely because agency staff operate the client's workspace;
- cross-workspace reporting is an explicit authorization mode, never an implicit consequence of organization or agency membership;
- ownership, payer, operator, reviewer, and approver are separate concepts.

The target hierarchy is therefore:

```text
Organization (governance / ownership / billing)
├── optional Portfolio / Business Unit
│   ├── Workspace / Brand
│   └── Workspace / Brand
└── Workspace / Brand
    ├── scoped users / grants
    ├── buyer questions
    ├── runs / measurements
    ├── evidence / sources / citations
    ├── Recommendation Records
    ├── reviews / approvals
    ├── actions / outcomes
    ├── integrations / API credentials
    └── exports / shares / audit events
```

For agencies, access is an overlay rather than a second ownership tree:

```text
Agency Organization
  └── Agency Operator
       └── Agency Engagement / explicit grant
            └── Client-owned Workspace

Client Organization (data owner)
  └── Client-owned Workspace
       ├── Client Reviewers / Approvers
       └── Agency Operators with explicit scoped access
```

### Non-negotiable invariants

1. **Every operational tenant row has one authoritative workspace scope** once the migration is complete.
2. **Organization membership alone must not grant access to every client workspace** in an agency scenario.
3. **Agency membership alone must never grant access to another client's workspace.**
4. **The database must enforce tenant isolation through RLS.** Server handlers must also authorize, but server checks are defense in depth rather than a substitute for RLS.
5. **Cross-workspace operations start from an authorized workspace set** and intersect any workspace IDs supplied by the caller.
6. **Data ownership and billing responsibility are independent.** An agency may pay for a client workspace without owning client data.
7. **Role names are convenience presets. Capabilities are the authorization contract.**
8. **Ownership transfer is explicit, audited, high risk, and never inferred from billing changes or membership changes.**
9. **Revoked access must fail closed across UI, API, exports, shares, background jobs, and integration credentials.**
10. **No service-role credential may be exposed to a browser or used as a shortcut around user authorization.**

---

## 2. Current-state audit at the audited SHA

This section distinguishes repository facts from target architecture.

### 2.1 Verified repository facts

| Area | Current state | Architectural consequence |
| --- | --- | --- |
| Organizations | `public.organizations` is the current top-level tenant object. | Preserve it as the governance/commercial container rather than renaming it into a brand. |
| Memberships | `public.organization_members` maps users to organizations. | Existing membership data can seed initial workspace access during migration. |
| Roles | `public.organization_role` currently has `owner`, `analyst`, `viewer`. | Too coarse for enterprise review, billing, integration, export, API, and agency boundaries. Keep temporarily for compatibility, then map presets to capabilities. |
| Tenant columns | Core product tables such as categories, prompts, runs, answers, sources, citations, source maps, placements, and events carry `organization_id`. | Current data isolation is organization-wide. Multi-brand requires a narrower operational scope. |
| RLS helpers | `is_org_member` and `has_org_role` are `SECURITY DEFINER`, use fixed `search_path`, and read membership from database state. | Preserve the database-derived authorization pattern; replace/augment with scoped capability helpers rather than trusting client claims. |
| RLS policies | RLS is enabled across the core tenant tables. Select is generally organization membership; writes commonly require owner/analyst. | Migration must be additive and parity-tested before replacing these policies. |
| Exports | Recommendation Record export routes authorize through the signed-in viewer before materializing the record. | Keep this object-authorization pattern and add workspace/capability checks for multi-account use. |
| Billing | Billing logic is organization-scoped. | Organization remains a sensible billing account boundary; payer can be separate from workspace owner. |
| Workspace abstraction | No mature first-class workspace/brand tenant boundary is present in the audited core schema. | Introduce workspace deliberately rather than layering agency behavior onto organization membership. |
| Portfolio hierarchy | No required portfolio/business-unit layer is established in the audited core model. | Do not make portfolio mandatory. |

### 2.2 Current limitations that matter for this mission

The existing `owner / analyst / viewer` model conflates several materially different privileges. In an agency or enterprise account, an analyst who can run measurements should not automatically gain billing administration, user management, API-key administration, exports, publication, audit-log access, or ownership transfer.

Likewise, organization-level membership is too broad if one legal/commercial organization contains multiple brands with restricted teams, or if an agency organization manages unrelated clients. Simply adding more organization roles would not solve the scoping problem.

The required change is therefore **two-dimensional authorization**:

```text
WHO / relationship scope  ×  WHAT capability
```

Examples:

- Workspace A + `records.view`
- Workspace A + `runs.execute`
- Portfolio North America + `reports.rollup.view`
- Organization + `billing.manage`
- Workspace Client X + `reviews.perform`

---

## 3. Target domain model

### 3.1 Organization

**Purpose:** durable owner/governance/commercial boundary.

Recommended responsibilities:

- legal/customer account identity;
- data ownership default;
- billing account association;
- organization-wide security policy;
- organization administrators;
- organization-level integrations only when truly shared;
- portfolio creation;
- workspace creation/archival;
- audit retention policy;
- enterprise identity configuration;
- entitlements and contract limits.

An organization is **not** the correct default scope for buyer questions, evidence, runs, Recommendation Records, actions, or exports after multi-brand support is introduced.

### 3.2 Workspace / Brand

**Purpose:** operational tenant boundary.

A workspace represents one coherent measurement and evidence context, normally one brand, product line, market-specific brand instance, or client account.

Recommended fields:

```text
workspaces
- id uuid PK
- owner_organization_id uuid FK organizations
- portfolio_id uuid nullable FK portfolios
- name text
- slug text
- status active | suspended | archived
- brand_name text
- canonical_domain text nullable
- default_locale text
- created_by uuid
- created_at / updated_at
```

Key constraints:

- workspace slug uniqueness should be scoped appropriately, normally per owner organization;
- archived workspaces remain addressable for audit/history but cannot start new runs;
- operational records reference `workspace_id` directly rather than deriving it through long joins whenever practical;
- `organization_id` may remain during migration for parity checks, but workspace becomes the authoritative operational scope after cutover.

### 3.3 Portfolio / Business Unit — optional

Do **not** introduce a mandatory extra level.

Use a portfolio only when at least one of these is required:

- delegated administration over a subset of workspaces;
- a stable business-unit grouping used by enterprise buyers;
- a stable client-team grouping used by an agency;
- shared question-template governance;
- scoped roll-up reporting;
- portfolio-specific budget/usage allocation;
- portfolio-specific retention/security configuration.

If the only requirement is visual grouping, prefer lightweight workspace tags or saved views instead of a new security boundary.

Recommended v1 representation if true delegated governance is required:

```text
portfolios
- id
- organization_id
- name
- slug
- status
- created_by
- created_at / updated_at

workspaces.portfolio_id nullable
```

One workspace belongs to at most one portfolio in v1. Avoid many-to-many portfolio membership until a real customer requires it because overlapping security scopes substantially complicate authorization reasoning.

### 3.4 User and profile

Authentication identity remains global. Access is granted separately.

A single user may legitimately be:

- owner of Organization A;
- viewer of Workspace B;
- reviewer of Workspace C through an agency engagement;
- billing admin of Organization D;
- no-access member of other workspaces in the same organization.

Do not encode these relationships in a single enum on the user or JWT.

---

## 4. Authorization architecture

### 4.1 Capabilities are canonical

Use a closed, version-controlled capability vocabulary. Initial capability set:

| Capability | Meaning | Normal scope |
| --- | --- | --- |
| `records.view` | View Recommendation Records and permitted evidence | Workspace |
| `runs.execute` | Start/retry permitted measurements | Workspace |
| `reviews.perform` | Review evidence / records | Workspace |
| `approvals.grant` | Approve publishable/releasable work | Workspace |
| `shares.publish` | Create/revoke external share artifacts | Workspace |
| `assignments.manage` | Assign actions/owners | Workspace |
| `exports.create` | Export permitted workspace data | Workspace |
| `questions.manage` | Create/edit buyer questions and templates linked to workspace | Workspace |
| `workspace.settings.manage` | Change workspace configuration | Workspace |
| `members.manage` | Invite/remove/change scoped workspace members | Workspace or Organization |
| `billing.manage` | Manage payer/subscription/payment operations | Organization |
| `integrations.manage` | Configure integration credentials | Workspace by default |
| `api.access` | Use API within granted scope | Workspace |
| `api_keys.manage` | Create/revoke API credentials | Workspace or tightly controlled Organization |
| `audit.view` | Read scoped audit history | Workspace / Organization |
| `reports.rollup.view` | View authorized multi-workspace rollups | Portfolio / Organization |
| `roles.manage` | Assign approved role presets/grants | Matching or narrower scope |
| `ownership.transfer` | Transfer workspace ownership | Organization/Workspace, highest risk |

### 4.2 Role presets

Roles are named bundles of capabilities. Suggested defaults:

- **Organization Owner** — governance, billing, security, and transfer authority; not automatically operationally active in every workspace unless policy says so.
- **Organization Admin** — organization and membership administration except protected ownership operations.
- **Billing Admin** — billing only.
- **Security / Audit Admin** — audit/security visibility without operational mutation.
- **Portfolio Manager** — authorized roll-up plus administration inside one portfolio.
- **Workspace Admin** — workspace settings, users, operational actions; no organization billing or ownership transfer.
- **Operator / Analyst** — run, review, create actions, view records; no billing/member/API-key management by default.
- **Reviewer** — view + review, optionally assign comments; no execution/configuration.
- **Approver** — view + review + approve/publish according to customer workflow.
- **Viewer / Client Reviewer** — read-only, with optional review/comment capability as explicitly assigned.

Do not hard-code product behavior to role names. Product behavior checks capabilities.

### 4.3 Proposed authorization tables

A normalized implementation may use:

```text
roles
- id
- organization_id nullable         # null for system role templates
- name
- description
- is_system
- created_at / updated_at

role_capabilities
- role_id
- capability
- primary key (role_id, capability)

access_grants
- id
- grantee_user_id
- role_id
- scope_type organization | portfolio | workspace
- scope_id
- source direct | organization_policy | portfolio_policy | agency_engagement
- source_id nullable
- status active | revoked | expired
- starts_at nullable
- expires_at nullable
- granted_by
- created_at / revoked_at
```

The application may retain `organization_members` as the organization relationship record while `access_grants` holds fine-grained authorization. Organization membership is not itself sufficient evidence of workspace access unless an explicit organization policy grants it.

### 4.4 Privilege-escalation rules

- A user cannot grant a capability they do not possess at the same or broader authorized scope.
- A workspace admin cannot grant organization billing or ownership-transfer capabilities.
- A portfolio manager cannot grant access outside that portfolio.
- An agency operator cannot invite another agency user into a client workspace unless the client engagement explicitly permits delegation.
- A user cannot modify their own grant to obtain a higher privilege.
- Removing the final Organization Owner must be blocked unless a controlled ownership-transfer workflow succeeds.

---

## 5. RLS contract

RLS is the primary tenant enforcement layer.

### 5.1 Canonical helper shape

Implement database authorization helpers equivalent to:

```sql
public.has_workspace_capability(
  check_workspace_id uuid,
  required_capability text
) returns boolean
```

and, only where necessary:

```sql
public.has_portfolio_capability(check_portfolio_id uuid, required_capability text)
public.has_organization_capability(check_organization_id uuid, required_capability text)
```

Security requirements for helpers:

- `SECURITY DEFINER` only where needed;
- fixed `search_path = ''`;
- fully qualified table names;
- derive actor from `auth.uid()`;
- resolve only active, unexpired grants;
- no dynamic SQL;
- no user-controlled capability list passed as proof;
- no trust in writable JWT metadata;
- stable/read-only behavior;
- explicit grants to `authenticated`, not broad public execution.

### 5.2 Tenant-table policy shape

After backfill and parity validation, operational tables should use a pattern like:

```sql
create policy records_select_workspace
on public.recommendation_records
for select
using (
  public.has_workspace_capability(workspace_id, 'records.view')
);
```

Mutating operations receive distinct capability policies rather than one broad `FOR ALL` policy where the action semantics differ.

Examples:

- viewing a run → `records.view` or a dedicated measurement-read capability;
- starting a run → `runs.execute`;
- reviewing evidence → `reviews.perform`;
- approving → `approvals.grant`;
- exporting → `exports.create` plus read authorization on underlying objects.

### 5.3 Direct workspace scope

Prefer a direct `workspace_id` on tenant rows that are independently addressed through UI/API routes. This reduces ambiguous joins and makes RLS easier to reason about.

For child rows that inherit scope from a parent and are never independently queried, derived scope may be acceptable, but the policy must have an indexed, unambiguous path to the workspace.

### 5.4 Cross-workspace authorization

A cross-workspace query must follow this contract:

1. derive actor from auth/session;
2. resolve the actor's authorized workspace IDs for the required capability;
3. intersect with any requested IDs;
4. query only the intersection;
5. apply RLS to all underlying rows anyway;
6. aggregate only after authorization;
7. suppress small-cohort benchmark output that could reveal another tenant's data.

Never accept `organization_id`, `portfolio_id`, or a list of workspace IDs from the client as proof of access.

---

## 6. Safe migration from organization-as-tenant

This must be an additive migration. No step should require turning RLS off.

### Phase 0 — inventory and policy map

Before schema mutation:

- enumerate every table with `organization_id`;
- enumerate all RLS policies and helper functions;
- enumerate every server route/action that receives organization/object IDs;
- enumerate background jobs, exports, shares, webhooks, integrations, and API surfaces;
- map foreign-key chains and unique constraints;
- create negative authorization tests before changing policies.

### Phase 1 — add workspace control plane

Create `workspaces`, optional portfolio structure only if required, role/capability tables, and grant tables.

RLS must be enabled on each new tenant/control table at creation time, with deny-by-default behavior until policies are installed.

### Phase 2 — create default workspace per existing organization

For every current organization:

- create exactly one default workspace;
- keep `owner_organization_id = current organization`;
- seed workspace access from existing organization membership with a deterministic role mapping;
- record migration provenance.

Initial compatibility mapping:

```text
owner   -> Organization Owner + Workspace Admin for default workspace
analyst -> Operator / Analyst for default workspace
viewer  -> Viewer for default workspace
```

This is a migration mapping only, not the long-term authorization model.

### Phase 3 — dual-scope tenant rows

Add nullable `workspace_id` to organization-scoped operational tables.

Backfill using the organization's default workspace. Validate:

- every row maps to exactly one workspace;
- workspace owner organization matches the legacy `organization_id`;
- child-parent workspace scope is consistent;
- row counts and unique constraints are preserved.

Application writes should then dual-write/check both scopes temporarily, with database constraints preventing mismatched organization/workspace pairs.

### Phase 4 — introduce workspace RLS alongside legacy protections

Add workspace-aware authorization policies without dropping legacy protections prematurely.

The migration must never create a window where a row is accessible because `workspace_id` is null or because the new helper fails open.

Recommended migration rule:

```text
legacy authorization AND workspace authorization
```

until parity is proven, then move deliberately to the workspace-authoritative policy.

### Phase 5 — cut application reads/writes to workspace scope

Update:

- route loaders;
- server actions;
- background jobs;
- exports;
- sharing;
- analytics joins;
- integrations;
- API endpoints;
- audit events;
- billing/entitlement checks where workspace limits apply.

### Phase 6 — enforce workspace invariants

Only after production/backfill verification:

- make required `workspace_id` columns `NOT NULL`;
- add/validate foreign keys and composite consistency constraints;
- replace obsolete organization-wide policies;
- retain `organization_id` only if it has a legitimate ownership/reporting purpose; otherwise remove it in a later cleanup migration;
- preserve migration audit evidence.

---

## 7. Multi-brand operations

### 7.1 Workspace switching

The app shell should include a persistent context switcher showing:

- current organization;
- current workspace/brand;
- optional portfolio context when relevant;
- explicit Portfolio View entry only when the actor has roll-up permission.

Switching a workspace changes data scope, not merely a client-side filter.

Rules:

- server navigation validates requested workspace membership/capability;
- last-used workspace may be stored as a preference but is never trusted for authorization;
- unavailable/revoked workspaces disappear immediately after permission refresh;
- deep links to inaccessible workspaces return a safe not-found/forbidden experience without leaking names or metadata.

### 7.2 Brand-specific data

These remain workspace-local:

- buyer questions selected for measurement;
- competitors;
- run configuration and observations;
- sources/citations/evidence;
- Recommendation Records;
- reviews and approvals;
- actions and owners;
- later measurements/outcomes;
- workspace integrations;
- workspace exports and shares.

### 7.3 Shared buyer-question templates

Templates may be organization- or portfolio-owned, but applying a template to a workspace must not create a cross-tenant evidence bridge.

Recommended pattern:

- immutable/versioned template definition;
- explicit scope owner: organization or portfolio;
- workspace creates a local question instance referencing template version or stores a snapshot;
- later template edits do not silently rewrite historical measurement meaning;
- evidence always belongs to the workspace measurement context.

### 7.4 Cross-brand comparison

Cross-brand comparisons are permitted only when every included workspace is authorized for the required reporting capability.

Comparisons must expose:

- included workspace list;
- measurement-window comparability state;
- provider/model/environment comparability where relevant;
- excluded workspaces and reason;
- no hidden fallback to organization-wide data.

---

## 8. Agency model

### 8.1 Ownership

Default rule: **the client organization owns client workspace data**.

Agency employees receive access through an explicit `agency_engagement` or equivalent grant source.

Recommended engagement model:

```text
agency_engagements
- id
- agency_organization_id
- client_organization_id
- workspace_id
- status pending | active | suspended | terminated
- permissions_policy / allowed_role_ids
- can_delegate boolean default false
- starts_at
- ends_at nullable
- created_by
- accepted_by_client nullable
- created_at / updated_at
```

The grant source should be traceable so terminating the engagement can revoke all derived grants deterministically.

### 8.2 Agency operator

An agency operator can only access client workspaces explicitly granted through active engagements.

Agency membership **must not** imply:

- access to every client;
- ability to discover client names;
- access to sibling client analytics;
- export authority;
- billing authority;
- transfer authority;
- ability to add other agency operators.

Each of those requires an explicit capability and scope.

### 8.3 Client reviewer

A client reviewer should be supportable without making the client an agency organization member.

Typical Client Reviewer preset:

- `records.view`;
- `reviews.perform` if review comments/status are desired;
- no `runs.execute`;
- no `exports.create` by default;
- no `members.manage`;
- no billing/integration/API-key access.

### 8.4 Agency reporting

Agency portfolio reporting resolves only workspaces for which the current user has `reports.rollup.view` or the necessary workspace-level reporting grants.

An agency employee with Client A access and Client B access may compare A and B only when cross-client reporting is explicitly allowed by engagement policy. The system must not assume that access to two individual workspaces implies authorization to blend their data.

### 8.5 Offboarding and termination

Termination workflow:

1. mark engagement terminated;
2. revoke all engagement-derived access grants in the same controlled transaction where possible;
3. revoke/rotate agency-created API keys and integration credentials that should not survive handoff;
4. invalidate active share artifacts according to client policy;
5. preserve client-owned records and audit trail;
6. transfer outstanding action ownership where required;
7. notify client administrators through the normal product channel;
8. record who terminated, why, and effective timestamp.

No client data is deleted simply because an agency relationship ends.

### 8.6 Client handoff

A handoff package should be client-scoped and may include:

- workspace membership review;
- active integrations and credentials inventory;
- scheduled runs;
- current buyer questions/templates;
- open Recommendation Records/actions;
- export/share inventory;
- engagement-generated audit history;
- revoked agency users/API keys confirmation.

### 8.7 Ownership transfer

Ownership transfer is different from agency offboarding.

Required controls:

- actor must hold `ownership.transfer`;
- source and destination organizations must be explicit;
- destination acceptance should be required for external transfers;
- billing payer changes are separate;
- transfer must validate integrations, API keys, data-processing settings, retention, and domain bindings;
- transfer creates an immutable audit event;
- transfer should support a short fail-safe/administrative recovery process without silently duplicating data.

---

## 9. Settings information architecture

Settings must make scope visible.

Recommended structure:

### Personal

- profile;
- personal notifications;
- sessions/security devices where supported.

### Organization

- organization profile;
- organization admins;
- billing and plan;
- security/identity policy;
- portfolios;
- workspace directory;
- organization audit;
- organization-level API/integration policy.

### Portfolio — only when enabled

- name/governance;
- portfolio managers;
- workspace membership in the portfolio;
- template library;
- roll-up/report policy.

### Workspace / Brand

- brand profile/domain;
- users and roles;
- buyer-question configuration;
- measurement settings;
- integrations;
- API keys;
- exports/shares;
- branding for permitted client-facing artifacts;
- workspace audit log.

All destructive/high-risk settings must display the affected scope in the confirmation UI.

---

## 10. Billing and packaging boundary

Keep organization as the billing-account boundary unless commercial evidence requires another model.

### 10.1 Separate concepts

```text
workspace owner organization != billing payer organization
```

An agency may pay for a client workspace while the client remains the data owner.

Recommended association:

```text
billing_accounts
- id
- payer_organization_id
- provider_customer_id
- contract / plan state

workspace_entitlements
- workspace_id
- billing_account_id
- entitlement values / limits
```

Do not make Stripe/customer ownership the tenant-security relationship.

### 10.2 Packaging primitives

Potential packaging dimensions, to validate commercially rather than assume:

- number of active workspaces/brands;
- measured buyer questions;
- comparable measurement frequency;
- users / reviewers;
- portfolio reporting;
- agency client workspaces;
- API access;
- SSO / provisioning;
- audit retention;
- export/presentation branding;
- advanced governance roles.

Do not gate basic tenant isolation or security behind a premium tier.

---

## 11. API and API-key architecture

### 11.1 Workspace-scoped by default

API credentials should default to one workspace and an explicit capability set.

Recommended fields:

```text
api_keys
- id
- owner_organization_id
- workspace_id nullable
- portfolio_id nullable
- name
- secret_hash
- prefix
- capabilities[] or normalized relation
- workspace_allowlist nullable
- status active | revoked | expired
- expires_at nullable
- created_by
- last_used_at
- created_at / revoked_at
```

Rules:

- secrets shown once at creation;
- only hashed credentials stored;
- rotation and revocation supported;
- workspace keys cannot request another workspace;
- organization/portfolio keys are exceptional and require explicit workspace allowlists plus capability checks;
- key usage is audit logged;
- key scopes are re-evaluated against current ownership/engagement state where appropriate;
- terminating an agency engagement revokes credentials derived from that engagement.

### 11.2 API object authorization

Every object-addressed endpoint must validate:

```text
object -> workspace -> actor/key capability
```

Do not authorize an endpoint only because the object ID is hard to guess.

List endpoints also require scoped filtering; avoiding IDOR on detail routes is insufficient if list/search/export endpoints leak sibling tenants.

---

## 12. Exports and sharing

### 12.1 Exports

The existing signed-in export authorization pattern should be retained and strengthened with workspace capability checks.

Requirements:

- caller has `exports.create` for the workspace(s);
- underlying records are separately readable;
- export job stores authorized workspace scope at creation;
- completion/download re-authorizes or uses a narrowly scoped artifact grant;
- exports cannot sweep sibling clients by organization or agency membership;
- export creation and download are auditable;
- generated files inherit retention/deletion policy.

### 12.2 Shared artifacts

Public/client share links must be scoped artifacts, not live database bypasses.

Recommended characteristics:

- point to a frozen/versioned Recommendation Record or report snapshot;
- opaque high-entropy token stored hashed;
- optional expiry;
- revocable;
- optionally recipient/domain constrained for enterprise plans;
- no navigation from the artifact into the underlying workspace without normal authorization;
- no sibling-record enumeration;
- create/revoke/access events auditable where appropriate.

---

## 13. White-label boundary

Foremention can support legitimate client-facing customization without erasing product identity from security-critical surfaces.

### Allowed configurable surfaces

- logo on exported reports;
- agency/client-facing display name on reports;
- cover page / footer metadata;
- client-presentation branding;
- approved custom report subtitle/contact details.

### Keep Foremention identity by default

- authentication;
- core application shell;
- security and privacy surfaces;
- audit logs;
- API documentation;
- billing/admin system surfaces;
- transactional security notices.

A fully white-labeled application should be a separately justified commercial/product decision because it creates support, trust, domain, email, SSO, documentation, and security-signaling complexity.

---

## 14. Portfolio Intelligence

Portfolio Intelligence is a future authorized aggregation layer, not a new source of truth.

Candidate views:

- accounts/workspaces needing attention;
- stale or failed measurements;
- benchmark availability / comparability state;
- unresolved high-impact Recommendation Records;
- high-opportunity workspaces;
- open actions / overdue actions;
- renewal-risk signals where real contract/customer-success data exists;
- portfolio trend lines;
- usage/entitlement pressure;
- evidence-review backlog.

### Security and statistical rules

- aggregate only authorized workspace IDs;
- never expose another tenant as an anonymous residual through totals;
- benchmark data needs minimum cohort thresholds and suppression rules;
- label insufficient sample/comparability explicitly;
- do not create fake renewal-risk or opportunity scores without real inputs;
- report drill-down re-authorizes at workspace scope.

---

## 15. Security threat model and QA matrix

Multi-account release is blocked until negative authorization tests exist for each relationship class.

### 15.1 Actor / relationship classes

At minimum test:

1. same workspace, permitted capability;
2. same workspace, missing capability;
3. same organization, different workspace, no grant;
4. same organization, different workspace, explicit grant;
5. same portfolio, unauthorized sibling workspace;
6. agency operator with Client A only attempting Client B;
7. agency operator with A and B attempting unauthorized blended reporting;
8. client reviewer attempting agency admin paths;
9. revoked agency engagement;
10. expired temporary grant;
11. former workspace member with stale deep link;
12. API key for Workspace A requesting Workspace B;
13. organization-scoped key with workspace not in allowlist;
14. user attempting self role escalation;
15. user attempting to remove/replace final owner;
16. ownership-transfer actor without transfer capability.

### 15.2 Resource / operation matrix

For every actor class, exercise:

- list routes;
- detail routes;
- create/update/delete;
- run start/retry;
- evidence review;
- approval/publication;
- assignment;
- search;
- export create/download;
- share create/read/revoke;
- audit access;
- integration configuration;
- API-key create/use/revoke;
- invitations;
- role changes;
- workspace switch/deep link;
- portfolio roll-up;
- ownership transfer;
- background job execution.

### 15.3 IDOR requirements

Object IDs are hostile input.

Tests must prove that substituting another tenant's valid ID returns no data and causes no side effect for:

- Recommendation Record;
- run;
- source/citation/evidence;
- action/outcome;
- export job/file;
- share artifact;
- integration;
- API key metadata;
- invitation;
- audit event;
- workspace;
- portfolio.

### 15.4 Invitation security

- invitation token high entropy and one-time/revocable;
- invitation binds intended organization/workspace and role/grant;
- accepting user cannot alter scope/capabilities;
- expired/revoked invitations fail closed;
- accepting an agency invite must not silently create client ownership;
- domain restrictions are supplementary, not sole authorization;
- invitation and acceptance are audited.

### 15.5 Role-change security

- server and database validate grant authority;
- target grant cannot exceed actor's delegable privilege;
- no client-supplied role/capability object trusted without validation;
- downgrade/revoke takes effect promptly;
- stale sessions do not preserve database access because RLS resolves current grants.

### 15.6 Integration isolation

- credentials encrypted/sealed at rest according to existing secret-management architecture;
- workspace integration secrets never readable by sibling workspaces;
- org-shared integrations require explicit workspace allowlist;
- webhook events resolve authoritative workspace before mutation;
- background jobs carry workspace identity and re-check current authorization/configuration as appropriate;
- logs redact secrets and avoid leaking another tenant's identifiers/content.

---

## 16. Audit event contract

Multi-account operations require durable actor/scope evidence.

Minimum events:

- workspace created/archived/restored;
- portfolio created/updated;
- member invited/accepted/removed;
- role/grant created/changed/revoked;
- agency engagement created/accepted/suspended/terminated;
- API key created/rotated/revoked/used for sensitive operation;
- integration connected/disconnected;
- export created/downloaded;
- share created/revoked;
- billing admin change where appropriate;
- ownership transfer initiated/accepted/completed/failed;
- high-risk settings changed.

Each event should capture at least:

```text
actor_id / actor_type
owner_organization_id
portfolio_id nullable
workspace_id nullable
action
resource_type / resource_id
before/after or structured change metadata where safe
request/correlation id
occurred_at
```

Audit records must not become a side channel: reading audit data itself is capability-scoped and tenant-isolated.

---

## 17. Backend and API route rules

### Request handling order

For authenticated user-facing operations:

```text
authenticate
→ resolve requested resource
→ resolve authoritative workspace/organization scope
→ authorize required capability
→ validate input/business invariants
→ mutate/query under RLS
→ audit high-risk action
→ return least necessary data
```

### Never do

- load by object ID with a privileged service client and authorize afterward;
- accept `workspace_id` as proof that a child object belongs to that workspace;
- infer client ownership from agency membership;
- infer access from billing payer;
- rely on hidden UI controls as security;
- cache authorization indefinitely;
- aggregate first and filter tenants afterward.

---

## 18. UX architecture

### 18.1 Context clarity

Every operational screen should make the current workspace visible. Portfolio mode should look meaningfully different from single-workspace mode so operators do not accidentally act on the wrong client.

For agency users, show the client/workspace name prominently in:

- run creation;
- approval/publication;
- export creation;
- integration setup;
- API-key creation;
- destructive settings.

### 18.2 Safe switching

The switcher should support:

- recent workspaces;
- search;
- organization grouping;
- optional portfolio grouping;
- permission-filtered results;
- no disclosure of inaccessible workspace names/counts.

### 18.3 Portfolio vs workspace actions

Portfolio mode should be primarily observational/coordination-oriented. Mutating a workspace from a portfolio view must identify the target workspace and re-authorize that specific operation.

Bulk actions across clients should not be introduced until there is a real, reviewed use case and an explicit per-workspace authorization contract.

---

## 19. Enterprise governance rules

The architecture must accommodate, without prematurely implementing every feature:

- SSO/SCIM mapping to organization membership and approved role presets;
- domain verification at organization level;
- automated deprovisioning that revokes derived workspace grants;
- service accounts with narrow workspace scope;
- session controls;
- auditable administrator changes;
- retention/export policy;
- legal/data-owner boundaries across agency engagements.

SCIM groups should map into policy-controlled roles/scopes. Do not copy arbitrary IdP group names directly into application capabilities.

---

## 20. Recommended delivery sequence

### Release 12A — authorization foundation

- add workspaces;
- create default workspace per current organization;
- add capability vocabulary and role presets;
- create scoped access grants;
- add RLS helpers and negative authorization tests;
- add workspace context to audit events.

### Release 12B — migrate operational scope

- add/backfill `workspace_id` on core tenant tables;
- dual-validate organization/workspace scope;
- migrate reads/writes/background jobs;
- enforce `NOT NULL` and consistency constraints after parity proof;
- replace legacy organization-wide policies only after security verification.

### Release 12C — multi-brand UX

- workspace switcher;
- scoped settings;
- brand-specific configuration;
- shared versioned question templates;
- explicitly authorized cross-brand reporting.

### Release 12D — agency access

- agency engagements;
- client reviewers;
- engagement-derived access grants;
- termination/handoff flow;
- agency reporting with explicit cross-client reporting policy.

### Release 12E — enterprise/portfolio refinement

Only when customer need is verified:

- delegated portfolio governance;
- SSO/SCIM mappings;
- organization/portfolio API credentials;
- advanced audit/export controls;
- portfolio intelligence;
- configurable report branding.

---

## 21. Release gates

Do not ship multi-account access until all applicable gates pass.

### Data / migration

- [ ] Every migrated tenant row has exactly one valid workspace.
- [ ] Workspace owner organization matches migration source where expected.
- [ ] No orphan rows.
- [ ] Unique constraints preserve current behavior or are intentionally re-scoped to workspace.
- [ ] Backfill is idempotent/restartable.
- [ ] RLS remains enabled throughout migration.

### Authorization

- [ ] Capability matrix is covered by unit/integration tests.
- [ ] Same-org sibling-workspace denial is tested.
- [ ] Agency Client A → Client B denial is tested.
- [ ] Revoked engagement denial is tested.
- [ ] Export/share IDOR is tested.
- [ ] API-key cross-workspace denial is tested.
- [ ] Invitation scope tampering is tested.
- [ ] Role escalation is tested.
- [ ] Ownership transfer is tested.

### Product

- [ ] Current workspace is visible on operational surfaces.
- [ ] Switcher cannot reveal unauthorized workspace names.
- [ ] Portfolio mode is distinguishable from workspace mode.
- [ ] Agency operator/client reviewer permissions match UI affordances, while backend/RLS remain authoritative.
- [ ] Offboarding preserves client-owned records.

### Operational

- [ ] Audit events exist for high-risk scope/role changes.
- [ ] API keys can be revoked and rotated.
- [ ] Integration credentials cannot leak across workspaces.
- [ ] Background jobs have explicit workspace context.
- [ ] Logs and analytics do not leak cross-tenant content or raw secrets.

---

## 22. What not to build yet

Do not introduce these merely to make the architecture look enterprise-complete:

- mandatory Business Unit/Portfolio hierarchy;
- arbitrary custom roles before default capability presets are proven insufficient;
- nested portfolios;
- many-to-many portfolio membership;
- automatic agency access to all clients;
- bulk cross-client mutation;
- global organization API keys without allowlists;
- fully white-labeled core product;
- synthetic renewal-risk scoring;
- cross-customer benchmarks without privacy/minimum-cohort rules;
- billing-derived data ownership;
- application-only tenant filtering.

---

## 23. Acceptance scenarios

### Scenario A — single-brand SaaS

One organization, one default workspace, current users mapped to equivalent presets. User experience remains essentially unchanged while the data model becomes workspace-ready.

### Scenario B — multi-product SaaS

One organization has Product A and Product B workspaces. Product A analyst cannot see Product B until explicitly granted. Organization billing can cover both. Authorized executives may receive roll-up reporting without getting mutation rights.

### Scenario C — enterprise group

One organization has optional portfolios aligned to business units. Portfolio managers administer only their assigned portfolio. Security/billing admins operate at organization scope. Workspace teams remain isolated from sibling workspaces unless policy grants access.

### Scenario D — agency with multiple clients

Agency Organization has operators. Client Organizations A and B each own their workspaces. Operator Alice receives an engagement grant to Client A only and cannot discover B. Operator Bob can access A and B but may not blend A/B reporting unless both engagement policy and reporting capability permit it.

### Scenario E — client handoff

Client terminates agency engagement. Derived agency grants and engagement API keys are revoked; client workspace, evidence, Records, actions, history, and audit trail remain owned by the client. Client administrators retain access.

---

## 24. Architecture decision record

### ADR-12.1 — Organization remains governance/commercial container

**Decision:** keep organization as top-level ownership/billing/security container.  
**Reason:** current billing and membership already align there, while reusing organization as brand scope would prevent safe multi-brand/agency separation.

### ADR-12.2 — Workspace becomes operational tenant boundary

**Decision:** all independently addressable operational product data moves to workspace scope.  
**Reason:** this is the smallest durable boundary supporting single-brand, multi-brand, enterprise, and client-isolated agency operation.

### ADR-12.3 — Portfolio is optional

**Decision:** do not require a portfolio/business-unit row.  
**Reason:** hierarchy without delegated governance or roll-up need adds authorization complexity without customer value.

### ADR-12.4 — Capability authorization replaces role-name logic

**Decision:** roles are presets; capability + scope is canonical.  
**Reason:** `owner / analyst / viewer` cannot safely represent enterprise duties or agency/client relationships.

### ADR-12.5 — Agency access is an explicit engagement grant

**Decision:** agency organization membership never grants client access by itself.  
**Reason:** prevents client leakage and preserves client data ownership.

### ADR-12.6 — RLS remains mandatory

**Decision:** migration is additive and fail-closed; RLS remains enabled.  
**Reason:** tenant isolation must survive application bugs, stale UI, ID tampering, and mistaken server queries.

### ADR-12.7 — White label is limited to client-facing artifacts by default

**Decision:** permit report/export/presentation branding, retain Foremention identity in the core product.  
**Reason:** provides agency utility without prematurely multiplying security, support, domain, and trust complexity.

---

## 25. Definition of done for Chat 12

This document is the canonical architecture contract for the multi-account transition. Chat 12 is complete when the repository has this audited design and subsequent implementation work can be evaluated against the invariants and release gates above.

The next implementation step is **not** to weaken current organization RLS or immediately rewrite all tenant tables. It is to create the workspace/capability control plane and negative authorization tests first, then execute the additive migration phases with evidence that tenant isolation is preserved at every step.
