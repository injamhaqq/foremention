# 06 — Enterprise Security, Trust, Legal Readiness & Data Governance

Status: implementation and operating framework for enterprise evaluation.  
Base recovered before changes: `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`.  
Branch: `build/billion-dollar-06-enterprise-trust`.

This document is an engineering and operating-control map. It is not legal advice, a certification, an audit opinion, an insurance statement, or a contractual guarantee. Where production configuration, a signed agreement, a provider term, or an independent audit has not been verified, the state is explicitly marked as unavailable or verification-required.

## 1. Executive control posture

Foremention already had a meaningful security substrate before this build: organization membership, PostgreSQL row-level security, tenant-relation integrity hardening, service-role restrictions, security/performance advisor hardening, signup security attestation, owner-controlled data deletion, and production/release tests. This build does not replace those controls. It adds an enterprise control plane around them.

The enterprise posture is:

- database authorization remains authoritative;
- organization scope is never accepted solely from browser state;
- external enterprise features fail closed when unconfigured;
- privileged server operations use service-role boundaries rather than browser credentials;
- security-sensitive activity has a durable append-only audit vocabulary;
- unsupported certifications, residency, SCIM, and SLA claims stay unavailable;
- provider-specific contractual claims require provider/agreement verification;
- human review remains part of the evidence and Recommendation Record boundary.

## 2. Identity and administration

### 2.1 Authentication boundary

Supabase Auth remains the application identity provider boundary. Foremention does not introduce a parallel password store.

Current facts:

- normal authentication remains Supabase-backed;
- enterprise SSO code is configuration-dependent and throws when SSO is not configured;
- configured SSO domains are an explicit allowlist rather than inferred from an email alone;
- SSO redirect origin is constrained to Foremention when `NEXT_PUBLIC_SITE_URL` is set;
- a code path existing is not evidence that a customer SSO connection is active.

### 2.2 SAML / enterprise SSO

State: **configuration required, not universally active**.

The existing enterprise SSO route can initiate the configured Supabase SSO path only when required environment configuration and a matching domain exist. The new governance model adds organization-domain verification state and an `sso_enforced` policy flag. That flag does not itself create or prove an identity-provider connection.

Enablement gate before any customer is told SSO is active:

1. customer organization exists;
2. work domain is verified through the supported verification workflow;
3. identity-provider connection is created in the actual auth environment;
4. domain is explicitly allowlisted/configured;
5. test user can sign in through the expected IdP;
6. non-SSO bypass behavior is reviewed for the intended enforcement mode;
7. evidence is recorded for the customer workspace;
8. only then may `sso_enforced` be enabled.

### 2.3 Organization roles and permissions

Canonical roles after this build:

- `owner` — full workspace authority, including deletion;
- `admin` — organization/member/security administration except owner-only workspace deletion;
- `analyst` — operational evidence/Record work;
- `reviewer` — evidence review plus read access;
- `viewer` — read access;
- `stakeholder` — read access intended for governed stakeholder participation.

Canonical fine-grained permissions:

- `org.read`
- `org.admin`
- `members.manage`
- `security.read`
- `security.manage`
- `audit.read`
- `data.export`
- `data.delete`
- `records.publish`
- `evidence.review`

Rules:

- unknown permissions return false;
- explicit deny overrides explicit allow;
- owner-only `data.delete` cannot be granted to a non-owner through an override;
- RLS remains the enforcement layer; TypeScript permission helpers are for consistent server/UI gating only;
- permission overrides are organization/user scoped and reference a real organization membership.

### 2.4 Provisioning and deprovisioning

Human provisioning remains organization-membership based. Invitations and membership management should emit the canonical audit actions:

- `member.provisioned`
- `member.role_changed`
- `member.deprovisioned`
- `permission.override_changed`

Deprovisioning requirements:

- remove/disable organization membership;
- revoke or expire pending invitations for that identity where supported;
- terminate or revoke applicable sessions using the actual authentication capability in scope;
- reassign owned workflow objects where business continuity requires it;
- record the administrative change in the audit log.

A removed member must not retain workspace access merely because an application page still has cached state.

### 2.5 Session controls

The governance model records:

- maximum session age;
- inactivity timeout;
- reauthentication requirement for sensitive actions.

These values are policy inputs. They must not be advertised as enforced authentication behavior until the deployed auth/session implementation demonstrably enforces them. Defaults are conservative configuration targets, not a contractual session guarantee.

### 2.6 Service accounts

State: **architecture ready; disabled by default; no self-serve issuance claim**.

The model stores:

- tenant scope;
- human-readable name;
- opaque principal key;
- scopes;
- credential hash only;
- expiry;
- last use;
- revoked state and actor.

Raw credentials must never be persisted in the database or rendered after initial issuance. Creation/rotation/revocation should remain server-side, audited operations. `service_accounts_enabled` defaults to false.

### 2.7 SCIM

State: **unavailable today**.

`scim_connections` exists as a future control-plane record and defaults to `unconfigured`. No automatic provisioning or deprovisioning should be marketed until a real SCIM protocol endpoint, bearer-token lifecycle, schema mapping, group/user behavior, idempotency, replay protection, failure handling, and interoperability tests exist.

## 3. Audit and governance

### 3.1 Audit event model

`audit_events` is tenant-scoped and append-oriented. Application users do not receive direct insert/update/delete rights. Trusted server processing appends through the service-role-only `append_audit_event` RPC. Update and delete triggers reject mutation.

Captured fields include:

- organization;
- category;
- action;
- actor type;
- user or service-account actor;
- target type/id;
- request correlation id;
- hashed network/user-agent identifiers where needed;
- bounded metadata;
- occurrence timestamp.

Raw IP addresses and raw user agents should not be treated as necessary durable audit fields when a keyed/controlled hash is sufficient for correlation.

### 3.2 Required audit coverage

Authentication history:

- sign in;
- local sign out;
- sign out all devices;
- SSO configuration changes;
- failed/blocked enterprise-access attempts where a safe tenant association exists.

Administration:

- member provision/deprovision;
- role changes;
- permission overrides;
- domain verification lifecycle;
- security/session setting changes;
- service-account lifecycle;
- SCIM configuration lifecycle.

Evidence and Record governance:

- evidence review decisions;
- Recommendation Record publication/unpublication/share changes;
- reviewer/actor and timestamp;
- target object and bounded rationale metadata.

Data governance:

- export requested/completed;
- deletion requested/completed;
- correction/restriction request lifecycle;
- benchmark-consent changes;
- security-sensitive governance changes.

### 3.3 Immutability boundary

Audit immutability means normal application actors cannot rewrite history. It does not mean backups, database superusers, or infrastructure operators are cryptographically incapable of changing storage. Stronger tamper-evidence (for example chained hashes, WORM storage, or externally anchored logs) is a future enhancement and must not be claimed today.

## 4. Data governance

### 4.1 Classification

Minimum classification model:

| Class | Examples | Handling |
| --- | --- | --- |
| Public | marketing pages, public methodology | normal public delivery |
| Internal | operational run metadata, non-sensitive internal configuration | authenticated/authorized access |
| Confidential customer | buyer questions, provider answers, citations, evidence, workspace actions | tenant-scoped RLS, least privilege |
| Restricted | credentials, secrets, auth tokens, service-account secrets, sensitive security evidence | server-only, never browser-rendered, no plaintext persistence where avoidable |

`classification_profile` can be `standard` or `restricted` for future workspace-specific enforcement. It is not a substitute for field-level handling rules.

### 4.2 PII inventory

Known or expected personal-data classes in the product architecture:

- authentication identifiers and email addresses in the identity system;
- profile name/avatar when supplied;
- invitation/member identity data;
- design-partner/contact submission information;
- application email recipient addresses;
- audit actor identifiers;
- optional analytics identifiers using internal IDs rather than raw email where implemented;
- customer-provided content that could itself contain personal data.

Restricted inventory:

- auth/session tokens;
- provider/API credentials;
- webhook secrets;
- service-role secrets;
- future service-account credentials.

The inventory must be updated whenever a new field, provider, connector, analytics event, or export is introduced.

### 4.3 Data lineage

Core lineage:

`Authenticated user / workspace input → organization-scoped database record → controlled collection job → configured AI provider → provider response/citations → evidence/review state → Recommendation Record / comparison / action → later measurement`.

Supporting lineage:

- application request → Cloudflare runtime → Supabase data/auth boundary;
- controlled background event → Inngest → server-side job → data/provider boundary;
- application email → configured email path/Resend where active;
- approved product analytics event → configured analytics provider with the documented minimization boundary.

Each new external provider must declare input categories, output categories, persistence, purpose, tenant linkage, deletion implications, and whether the provider is actually active.

### 4.4 Retention

`retention_days` is modeled but nullable. A null value means no customer-specific retention duration has been established by this control plane. Do not imply a fixed contractual retention period without a verified policy/agreement.

Retention implementation must account for:

- primary records;
- deleted/archived product objects;
- logs;
- audit records;
- backups;
- provider-side retention;
- exported files;
- support/security evidence.

### 4.5 Deletion

Existing deletion architecture is preserved:

- owner initiated;
- delayed safety window;
- second confirmation boundary;
- active work cancellation;
- organization cascade deletion;
- non-identifying deletion receipt with record counts;
- service-role execution.

The enterprise governance request table records the request lifecycle but does not bypass or duplicate the established deletion executor.

### 4.6 Backups

Current code can model a backup-policy reference; it does not prove the deployed database backup schedule, retention, geographic location, encryption details, or successful restoration.

Enterprise evidence required before answering “yes” to backup questions:

- provider/project backup configuration screenshot or API evidence;
- retention and restore-window evidence;
- last successful restore exercise;
- responsible owner;
- test scope and outcome.

### 4.7 Benchmark eligibility and customer consent

Default: `benchmark_eligible = false`.

A workspace cannot be marked benchmark-eligible without `benchmark_consent_at`. Benchmark use should additionally require:

- defined purpose;
- documented aggregation/anonymization threshold;
- exclusion of raw customer content not needed for the benchmark;
- opt-out/revocation handling;
- source/workspace lineage;
- legal/privacy review before external publication.

### 4.8 Anonymization

Default: `anonymization_required = true`.

“Anonymized” must not be used merely because obvious fields were removed. A release process should assess direct identifiers, quasi-identifiers, small cohorts, free text, linkability, and re-identification risk.

### 4.9 Provider processing and training restrictions

Foremention&apos;s governance model sets `customer_content_training_allowed = false` and constrains it false at the database level. This is an internal product-policy boundary. It does **not** by itself prove that every external provider contract guarantees no training or the same retention behavior.

For each provider used with customer content, verify:

- applicable product/API terms;
- training/default data-use behavior;
- retention/logging controls;
- abuse-monitoring exceptions;
- subprocessors;
- region/data transfer terms;
- deletion options;
- enterprise addendum if required.

### 4.10 Data residency readiness

`data_residency_region` is a readiness field only. No customer-selectable or guaranteed data residency is currently claimed. A residency commitment requires end-to-end proof across application runtime, database/auth, background jobs, analytics, AI providers, logs, backups, support access, and the signed agreement.

## 5. Threat model

### 5.1 Protected assets

- customer workspace data and evidence;
- authentication/session tokens;
- provider credentials;
- service-role credentials;
- Recommendation Records and publication state;
- audit evidence;
- billing/commercial identifiers;
- source/evidence provenance;
- production deployment controls.

### 5.2 Primary threat actors

- unauthenticated internet attacker;
- authenticated user attempting cross-tenant access;
- lower-privilege member attempting administrative escalation;
- compromised browser/session;
- leaked application/provider secret;
- malicious or compromised dependency;
- compromised service account or server-side integration;
- mistaken privileged operator;
- external provider compromise.

### 5.3 Priority abuse cases

1. cross-tenant read/write through missing RLS or forged organization ID;
2. privilege escalation by role/permission manipulation;
3. service-role secret exposure to browser/client bundles;
4. SSO bypass or open redirect;
5. forged webhook/provider event;
6. deletion/export by non-owner or wrong tenant;
7. evidence/Record publication without authorized human action;
8. audit-history rewrite;
9. raw secret stored in service-account/domain/SCIM records;
10. provider/customer content leaking into analytics or logs.

### 5.4 Mitigations in this repository

- organization-scoped RLS;
- tenant-relation integrity constraints/hardening;
- service-only RPC restrictions;
- fail-closed enterprise SSO;
- signed webhook boundaries where implemented;
- provider abstraction and spend/collection controls;
- explicit review states;
- immutable application audit table;
- credential hashes instead of raw future enterprise credentials;
- test contracts that reject fabricated security/compliance claims.

## 6. Asset inventory

Maintain the inventory by asset class, owner, environment, data class, criticality, backup requirement, and credential boundary.

Current architectural asset classes include:

- Cloudflare application/runtime configuration;
- Supabase Auth and PostgreSQL;
- Inngest background orchestration;
- configured AI provider APIs;
- application-email provider path;
- product/experience analytics where active;
- source repository and CI/CD;
- DNS/domain configuration;
- secrets/environment bindings.

This document does not invent account IDs, regions, legal ownership, backup tiers, or paid-plan features that have not been verified.

## 7. Risk register

| Risk | Inherent concern | Current mitigation | Residual / next evidence |
| --- | --- | --- | --- |
| Cross-tenant access | Critical | RLS, tenant integrity, membership functions | continue negative RLS tests and production canaries |
| Privilege escalation | High | role/permission model, owner-only deletion, server checks | wire every admin mutation to `has_org_permission` and audit |
| Secret leakage | Critical | server-side bindings, service role separation, hashed enterprise credentials | automated secret scanning and periodic rotation evidence |
| SSO misconfiguration | High | fail-closed config/domain allowlist | verified per-customer IdP test and bypass review |
| SCIM incorrect provisioning | High | unavailable; defaults unconfigured | implement protocol/interoperability tests before exposure |
| Audit tampering | High | no authenticated writes, update/delete rejection | future external tamper-evident archive if required |
| Provider data handling mismatch | High | provider boundaries and transparency | verify provider terms/config for each customer use case |
| Backup/restore failure | High | provider capability expected but not claimed | documented restore exercise required |
| Dependency vulnerability | High | lockfile/CI/security workflows | define SLA for triage only after process evidence exists |
| Incident response immaturity | High | policy below | run and record tabletop exercise |

## 8. Dependency and vulnerability management

Required operating loop:

1. lock dependencies and review upgrades;
2. run dependency/security scanning in CI where configured;
3. inspect high/critical findings for exploitability and reachable surface;
4. patch or document an accepted risk with owner/date;
5. do not mark a scanner pass as a certification;
6. preserve SBOM/provenance evidence where existing release automation produces it.

No response-time SLA is claimed in this document.

## 9. Secrets and privileged access

Rules:

- no service-role secret in browser code or `NEXT_PUBLIC_*` variables;
- no raw SSO/SCIM/service-account secret in ordinary database rows;
- prefer runtime secret bindings;
- production access is least-privilege and purpose-limited;
- privileged changes should produce platform logs and, where application-visible, Foremention audit events;
- rotate on suspected exposure and after personnel/access changes where appropriate;
- do not paste customer secrets into tickets, analytics, logs, or AI prompts.

## 10. Production access logs

The application audit log is not the same as infrastructure access logging. Enterprise evidence should distinguish:

- application audit events;
- auth-provider events;
- database/provider administrative events;
- Cloudflare/runtime logs;
- deployment/CI logs;
- secret-management access/change logs.

Availability and retention of each log source must be verified from the actual production plan/configuration before answering a questionnaire.

## 11. Incident response

Severity framework:

- SEV-1: confirmed or strongly suspected material confidentiality/integrity compromise, destructive cross-tenant event, or critical production security failure;
- SEV-2: significant security degradation or exploitable weakness without confirmed material compromise;
- SEV-3: contained vulnerability or low-impact security defect;
- SEV-4: hardening / observation.

Core workflow:

1. detect and open incident record;
2. identify incident commander/owner;
3. preserve evidence;
4. contain credentials, sessions, deployment, provider access, or vulnerable path;
5. assess affected tenants/data/time window;
6. remediate and verify;
7. determine contractual/regulatory notification obligations with qualified counsel and executed agreements;
8. communicate truthfully to affected customers when required;
9. perform post-incident review and track corrective actions.

Do not promise a notification period that has not been legally/contractually established for the incident in scope.

## 12. Responsible disclosure

Public reporting route: `hello@foremention.com` with “Security report” in the subject until a separately verified security mailbox/process exists.

Requested report content:

- affected route/surface;
- reproduction steps;
- observed impact;
- minimal proof;
- reporter contact if they want follow-up.

Reporters should avoid unnecessary customer-data access, destructive testing, persistence, denial of service, social engineering, or public disclosure that creates active user risk.

No bounty amount or safe-harbor legal promise is invented here.

## 13. Backup, restore, disaster recovery and continuity

### Backup / restore

Code-level readiness is not restore evidence. Maintain a dated restore log containing:

- environment/provider;
- backup selected;
- restore target;
- start/end timestamps;
- result;
- integrity checks;
- owner;
- issues/follow-ups.

### Disaster recovery

At least a tabletop should cover:

- Supabase/database unavailability;
- Cloudflare/application deployment failure;
- compromised service credential;
- background orchestration outage;
- AI provider outage;
- DNS/domain incident;
- destructive customer-data event.

RTO/RPO values remain **uncommitted** until measured, approved, and contractually established where relevant.

### Continuity

Maintain:

- production ownership contacts;
- recovery runbooks;
- provider escalation paths;
- credential-recovery procedure;
- source/deployment access continuity;
- customer communication template;
- evidence of periodic exercises.

## 14. Trust Center claim matrix

Canonical public states are sourced from `lib/trust-capabilities.ts`.

Explicitly unavailable today:

- SOC 2 certification/examination claim;
- ISO 27001 certification;
- automatic SCIM;
- general contractual SLA;
- guaranteed customer-selectable data residency.

Configuration-dependent / staged:

- enterprise SSO;
- domain verification workflow;
- service accounts.

Implemented engineering controls are not certifications.

## 15. Procurement evidence package

The maintainable package is in `docs/enterprise-procurement-package.md` and should be answered from evidence, not memory. Required artifacts include:

- security questionnaire matrix;
- architecture overview;
- data-flow narrative;
- current subprocessor list;
- DPA readiness checklist;
- MSA readiness checklist;
- SLA framework with uncommitted fields;
- incident-response policy;
- vendor-risk evidence index.

## 16. Release / QA requirements

Enterprise/security changes require tests that cover at minimum:

- unknown permissions fail closed;
- owner/admin/analyst/reviewer/viewer/stakeholder permission defaults;
- owner-only deletion cannot be delegated accidentally;
- cross-tenant RLS denial;
- audit table RLS;
- authenticated users cannot insert/update/delete audit events directly;
- audit mutation triggers reject update/delete;
- service-role audit append surface is explicit;
- SSO remains disabled without real configuration;
- SCIM defaults unconfigured and is not claimed available;
- service accounts default disabled;
- domain verification defaults pending;
- benchmark eligibility requires consent;
- customer-content training policy cannot be toggled true by the governance row;
- trust center explicitly marks unsupported certification/SLA/residency claims unavailable;
- public copy never converts engineering controls into certification claims.

## 17. Red-team acceptance questions

Before enterprise launch, an evaluator should be able to answer “yes” with evidence to each relevant item:

- Can one tenant read another tenant&apos;s new enterprise tables? **Must be no.**
- Can a viewer grant themselves permissions? **Must be no.**
- Can an admin delete the workspace through the permission override? **Must be no; owner only.**
- Can a browser insert or rewrite audit history? **Must be no.**
- Can a service account become active only because a row exists? **Must be no.**
- Can SCIM be marketed because a schema table exists? **Must be no.**
- Can an unverified domain be treated as verified? **Must be no.**
- Can a workspace become benchmark eligible without consent? **Must be no.**
- Can the governance setting permit customer-content model training? **Must be no.**
- Can Foremention claim SOC 2/ISO/SLA/residency without independent truth? **Must be no.**

## 18. Definition of enterprise-buyability done

This build makes Foremention structurally more enterprise-buyable when:

- the migration applies cleanly;
- auth/RLS tests pass;
- control defaults are fail-closed;
- audit events are wired into security-sensitive mutation paths;
- environment-specific SSO/provider/backup evidence is captured before claims are made;
- the public Trust Center and procurement answers use the same claim boundary;
- unsupported assurances stay explicitly unavailable;
- legal terms and customer commitments are reviewed by qualified counsel before execution.

Enterprise buyability is a continuous evidence program, not a one-time page launch.
