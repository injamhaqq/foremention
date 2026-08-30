# Foremention Enterprise Procurement Package

Status: maintainable security/procurement response framework for enterprise review.  
Scope: Foremention application and the production environment actually used for the customer under review.  
Evidence rule: answer from current repository and environment evidence, not memory or assumption.

This package is not legal advice, a certification, an audit opinion, or an executed customer commitment. Foremention is not currently certified for SOC 2 or ISO 27001 based on the evidence recovered for this build. Contractual statements become binding only through an executed agreement reviewed by the appropriate parties.

## 1. Response taxonomy

Use one of four statuses in every questionnaire response:

- **Implemented** — supported by current code/configuration evidence.
- **Configuration-dependent** — supported only when the relevant production/customer configuration has been verified.
- **Evidence required** — the product may rely on a provider/platform capability, but the environment-specific proof has not been collected for this response.
- **Unavailable** — do not represent the capability as available today.

Never convert “code exists” into “customer is configured,” or “engineering control exists” into “certified.”

## 2. Security questionnaire response matrix

| Question area | Current response | Evidence / qualification |
| --- | --- | --- |
| Multi-tenant isolation | Implemented | Organization-scoped PostgreSQL RLS, membership functions, tenant-relation integrity controls. |
| Role-based access control | Implemented | Owner/admin/analyst/reviewer/viewer/stakeholder roles with fine-grained permission vocabulary and deny-by-default behavior. |
| Fine-grained permissions | Implemented structurally | Tenant/user permission overrides; explicit deny takes precedence; workspace deletion remains owner-only. |
| SAML / enterprise SSO | Configuration-dependent | Existing SSO path fails closed and requires configured domains/auth environment. A customer connection must be verified before answering “enabled.” |
| Domain verification | Architecture ready | Tenant-scoped DNS verification state exists; no domain is “verified” until the verification workflow succeeds. |
| SCIM | Unavailable | Connection state is modeled for future work; automatic provisioning/deprovisioning is not represented as available. |
| Service accounts | Architecture ready, disabled by default | Principal/scopes/credential-hash model exists; no self-serve issuance claim. |
| Session controls | Policy model exists; runtime evidence required | Session age/inactivity/reauth settings are modeled. Enforcement must be proven in the actual auth/runtime before claiming it. |
| Application audit trail | Implemented structurally | Tenant-scoped append-only audit table, service-role append path, mutation rejection. Mutation coverage must be verified for each sensitive workflow. |
| Authentication history | Audit vocabulary exists; workflow wiring/environment evidence required | Authentication events should be recorded where a tenant association is known; identity-provider logs remain a separate evidence source. |
| Data export | Implemented in existing product boundary; verify customer scope | Workspace export/owner controls already exist; enterprise audit actions track request/completion. |
| Data deletion | Implemented | Existing owner-only delayed deletion executor with safety window and non-identifying receipt; enterprise request table does not bypass it. |
| Customer-content model training | Disallowed by Foremention governance model | Database governance setting is constrained false. Provider-specific contractual/no-training assurances must be independently verified. |
| Benchmark use | Opt-in architecture | Default ineligible; eligibility requires consent timestamp and additional aggregation/anonymization governance. |
| Data residency | Unavailable as a guarantee | A readiness field exists, but no customer-selectable residency promise is made without end-to-end environment/provider proof and contract. |
| Encryption in transit | Evidence required per production provider/config | Do not answer from assumption; collect current Cloudflare/Supabase/provider evidence for the environment. |
| Encryption at rest | Evidence required per production provider/config | Provider capability or marketing documentation alone is not customer-environment evidence. |
| Backup / restore | Evidence required | Collect actual backup configuration and a dated restore-test result before answering affirmatively. |
| Disaster recovery | Program framework exists; exercise evidence required | RTO/RPO remain uncommitted until measured and approved. |
| Vulnerability management | Engineering process framework exists | Dependency/security checks and remediation workflow support readiness; no remediation SLA is invented here. |
| Penetration test | No evidence recovered | Answer “not currently evidenced” unless a current authorized test report exists. |
| SOC 2 | No | Not currently certified / no completed examination is claimed. |
| ISO 27001 | No | Not currently certified. |
| Contractual SLA | Unavailable by default | Only an executed customer agreement can establish service levels. |
| Security incident notification | Contract/legal dependent | Do not invent a notification period; determine obligations from law and executed agreement for the incident in scope. |
| Bug bounty | Not claimed | No bounty amount or program is represented by this package. |

## 3. Architecture overview

### Application boundary

Foremention is a web application delivered through the configured Cloudflare runtime. Authentication and PostgreSQL persistence use Supabase. Background orchestration uses Inngest. AI-provider collection is provider/configuration dependent. Application email and analytics providers are active only when the corresponding configuration and consent boundary applies.

### Authorization boundary

1. User authenticates through the configured Supabase Auth path.
2. Organization membership is resolved server/database side.
3. PostgreSQL RLS scopes tenant data.
4. Role defaults and permission overrides determine privileged actions.
5. Service-role credentials are reserved for trusted server/background operations.
6. Sensitive enterprise features stay disabled/unconfigured until deliberately enabled.

### Evidence boundary

Provider output is not automatically trusted as verified customer evidence. Foremention records provider/model/citation context, preserves human review states, and maintains an explicit Recommendation Record publication boundary.

## 4. Data-flow overview

Canonical data-flow:

`User / workspace input → Foremention application runtime → Supabase authentication + organization-scoped database → controlled collection job → configured AI provider → answer/citation/evidence records → human review → Recommendation Record / action → later comparable measurement`.

Supporting flows:

- `Browser request → Cloudflare runtime → Supabase` for authenticated product access.
- `Controlled background event → Inngest → Foremention server job → Supabase / configured provider` for bounded asynchronous work.
- `Application email event → configured email delivery path` when email is enabled.
- `Approved analytics event → configured analytics provider` under the documented minimization/consent boundary.
- `Security-sensitive mutation → service-side audit append → tenant-scoped audit_events` where the mutation path is wired.

For each customer review, attach an environment-specific diagram only after the active providers, regions, and data categories have been verified.

## 5. Subprocessor list and verification checklist

The public `/subprocessors` page is the maintained operational transparency source. At the recovered implementation state it describes:

| Provider | Purpose boundary | Activation boundary |
| --- | --- | --- |
| Cloudflare | Application hosting/edge/runtime/network handling and documented browser performance measurement | Core runtime |
| Supabase | Authentication, PostgreSQL persistence, RLS | Core |
| Inngest | Background workflow orchestration | Core when registered workflows run |
| Resend | Application email | Only when application email is enabled/configured |
| Groq | AI-provider collection | Only when selected/configured for the workspace/request |
| PostHog EU | Limited product analytics | Only under the implemented product analytics boundary |
| Microsoft Clarity | Experience analytics | Optional after browser consent |
| Contentsquare | Experience analytics | Optional after browser consent |
| Sentry | Code exists | Do not represent as active production processor until configuration/delivery is independently verified |

Before sending a contractual subprocessor annex, verify for each active provider:

- legal vendor name;
- service actually in use;
- data categories;
- processing purpose;
- applicable location/region if contractually relevant;
- provider subprocessors if required;
- transfer mechanism if required;
- provider terms/DPA version;
- retention/deletion controls;
- customer-notification mechanism for material changes if promised.

## 6. DPA readiness checklist

A Data Processing Addendum requires legal review and customer-specific facts. Do not claim a DPA is executed unless it is actually signed.

Checklist:

- identify controller/processor roles for the actual service relationship;
- identify subject matter, duration, nature, and purpose of processing;
- define personal-data categories and data-subject categories;
- attach verified security measures rather than generic assurances;
- attach the then-current subprocessor list;
- define subprocessor-change process if agreed;
- define deletion/return obligations and backup exceptions;
- define confidentiality/access obligations;
- define assistance boundaries for rights requests and security incidents;
- verify international-transfer mechanism(s) if applicable;
- verify provider DPAs/terms underlying Foremention&apos;s processing chain;
- determine audit/evidence rights;
- determine notification obligations with qualified counsel;
- ensure any residency commitment is supported end to end before insertion.

Unresolved items should remain marked `[LEGAL / CUSTOMER DECISION REQUIRED]` rather than guessed.

## 7. MSA readiness checklist

An MSA readiness package should separate commercial/legal negotiation from engineering facts.

Required review areas:

- contracting entity and jurisdiction — **do not invent**;
- service description and scope;
- fees/payment terms from the approved commercial package;
- acceptable-use boundaries;
- customer responsibilities;
- confidentiality;
- IP ownership and feedback terms;
- data protection / DPA incorporation;
- security obligations tied to evidence-backed controls;
- support and service levels, if any;
- warranty/disclaimer structure;
- liability/indemnity allocation;
- suspension/termination;
- export/deletion after termination;
- change control;
- governing law/dispute terms;
- order-of-precedence among Order Form, MSA, DPA, SLA and security exhibits.

All legal language must be reviewed by qualified counsel before signature.

## 8. SLA framework

Status: **framework only; no general contractual SLA is currently claimed**.

Populate only in a negotiated, approved agreement:

| Field | Value |
| --- | --- |
| Covered service | `[CONTRACT VALUE REQUIRED]` |
| Availability target | `[CONTRACT VALUE REQUIRED]` |
| Measurement window | `[CONTRACT VALUE REQUIRED]` |
| Exclusions | `[CONTRACT VALUE REQUIRED]` |
| Maintenance treatment | `[CONTRACT VALUE REQUIRED]` |
| Support hours | `[CONTRACT VALUE REQUIRED]` |
| Initial response target by severity | `[CONTRACT VALUE REQUIRED]` |
| Recovery objective | `[CONTRACT VALUE REQUIRED]` |
| Service-credit structure | `[CONTRACT VALUE REQUIRED]` |
| Claim procedure | `[CONTRACT VALUE REQUIRED]` |
| Maximum credits / sole remedy | `[CONTRACT VALUE REQUIRED]` |

Engineering telemetry can measure service behavior, but measured telemetry is not itself a contractual SLA.

## 9. Incident policy summary

The operating incident-response framework is maintained in `docs/billion-dollar-build/06-enterprise-security-governance.md`.

Procurement response should provide:

- severity framework;
- incident ownership/command structure;
- evidence preservation;
- containment/remediation workflow;
- affected-data/tenant assessment;
- communication decision process;
- legal/contractual notification determination;
- post-incident review/corrective-action process.

Do not state a fixed breach-notification time unless the applicable law or executed agreement creates that obligation for the customer/incident in scope.

## 10. Vendor-risk evidence index

| Evidence area | Repository / source | Live evidence required before questionnaire “yes”? |
| --- | --- | --- |
| Core RLS | `supabase/migrations/20260719000100_initial_schema.sql` and later RLS hardening | Repository proves design; production migration state should be verified for high-assurance review |
| Tenant relation integrity | `supabase/migrations/20260811044941_tenant_relation_integrity.sql` | Verify deployed migration state |
| Service-role restriction | service-only migrations and server REST boundary | Verify production secrets/bindings and access controls |
| Enterprise SSO fail-closed | `lib/enterprise-sso.ts` | Verify actual customer IdP/domain configuration |
| Enterprise permission model | `lib/enterprise-governance.ts` + enterprise governance migration | Verify migration deployed and mutation paths use intended permission checks |
| Audit trail | `audit_events`, append RPC, immutability triggers | Verify migration deployed and sensitive workflows are emitting events |
| Data deletion | GDPR deletion migration and product confirmation flow | Verify deployed migration + successful controlled acceptance test |
| Provider processing | `/subprocessors`, provider abstractions | Verify which providers are active for customer/environment |
| Backup | Infrastructure/provider console/API evidence | Yes |
| Restore test | Dated restore exercise artifact | Yes |
| DR test | Dated tabletop/technical exercise | Yes |
| Dependency security | CI/security workflow evidence | Verify current run/results |
| Production access | Cloud/provider access logs and role configuration | Yes |
| SOC 2 | Independent auditor report | Unavailable unless actually achieved |
| ISO 27001 | Accredited certificate/scope | Unavailable unless actually achieved |
| Pen test | Authorized current report / attestation | Unavailable unless actually performed |
| SLA | Executed agreement | Unavailable by default |
| Data residency | End-to-end region/provider/backup/support evidence + contract | Unavailable as a guarantee by default |

## 11. Architecture and security evidence request checklist

For a serious enterprise diligence request, assemble a dated evidence room containing only what is requested and safe to disclose:

- architecture overview;
- current data-flow diagram;
- current subprocessor list;
- RLS/tenant-isolation evidence;
- auth/SSO configuration evidence for that customer;
- sanitized audit-log sample;
- latest CI/security scan summary;
- dependency/SBOM/provenance evidence if available;
- backup configuration evidence;
- latest restore/DR exercise evidence;
- incident-response policy;
- responsible-disclosure policy;
- DPA/MSA/SLA documents only if reviewed/approved for use;
- certification or pen-test evidence only if actually current and applicable.

Do not expose secrets, service-role keys, raw customer evidence, unrelated customer identities, exploit details, or privileged infrastructure metadata merely to satisfy a questionnaire.

## 12. Questionnaire answer template

Use this structure for each customer question:

**Question:** `[verbatim customer question]`  
**Status:** `[Implemented | Configuration-dependent | Evidence required | Unavailable]`  
**Answer:** `[short factual answer]`  
**Scope:** `[product/environment/customer scope]`  
**Evidence:** `[repo path, dated test, provider evidence, signed document]`  
**Caveat / dependency:** `[if any]`  
**Owner:** `[internal owner]`  
**Last verified:** `[date]`

If evidence is stale or unavailable, say so. A truthful “not currently available” is preferable to creating procurement debt through an unsupported promise.
