# Foremention Corporate Legal, IP & Contract Operations Foundation

**Status:** Operational foundation / counsel handoff / truth-tracked control document  
**Repository snapshot inspected:** `main` at `08d7f398ae89d0d69af4530af5ecc6c752f1a6c6`  
**Prepared:** 2026-08-30  
**Scope:** Corporate foundation, IP chain of title, contract operations, procurement, public legal-document consistency, trademark operations, and open-source compliance.

> **Important:** This document is not legal advice, is not a contract, is not an executed agreement, and does not establish incorporation, ownership, tax, employment, privacy, or regulatory facts. Foremention must use qualified counsel and other licensed advisers for jurisdiction-specific legal decisions. Unknown facts remain `UNKNOWN` until supported by authoritative evidence.

---

## 1. Executive position

Foremention has a comparatively strong **engineering truth boundary** but does not yet have repo-verifiable evidence for the corporate facts needed to safely sign customers, employ people, or raise capital.

The current repository already does several things correctly:

- public `/terms`, `/privacy`, and `/subprocessors` routes exist;
- public language avoids claiming a legal entity or jurisdiction that has not been established;
- public security language distinguishes engineering controls from certifications;
- paid billing is deliberately fail-closed until real commercial/legal configuration exists;
- provider activation is configuration-dependent rather than inferred from adapter code;
- CI generates an SPDX JSON SBOM for verified `main` releases and attests release provenance;
- the product explicitly avoids outcome guarantees such as rankings, citations, traffic, leads, pipeline, or revenue.

Those controls should be preserved.

The material gaps are operational rather than cosmetic:

1. **Corporate identity and signing authority are unverified.**
2. **IP chain of title is unverified.** GitHub account/repository control is not evidence that a future company owns all code, designs, data, or marks.
3. **The public repository has no declared repository license in GitHub metadata and no root `LICENSE` was found in the inspected root listing.** This requires an intentional owner/counsel decision; do not infer a license from public visibility.
4. **Brand assets exist, but provenance/assignment evidence is not in the repository.**
5. **Contract architecture is referenced by product copy but no counsel-approved MSA/order-form/DPA packet was found in the inspected repository.**
6. **The public processor list is intentionally narrower than the adapters the code can support.** A contractual vendor register must distinguish `code-supported`, `configured`, `active for customer data`, and `contractually approved`.
7. **SBOM generation exists, but a complete license-obligation workflow, attribution file, and restricted-license gate are not yet evidenced.**

### Release gate

Do **not** treat Foremention as enterprise-contract-ready merely because the product is technically enterprise-capable. Before the first material paid enterprise signature, complete the P0 controls in Section 15.

---

## 2. Truth model

All legal/corporate operational records should use the following statuses.

| Status | Meaning |
| --- | --- |
| `VERIFIED — REPO` | Directly supported by inspected repository/configuration evidence. This proves only the scoped technical fact. |
| `VERIFIED — EXTERNAL` | Supported by an authoritative external record such as a government filing, signed agreement, registrar record, tax record, bank record, or counsel-confirmed document. |
| `UNKNOWN` | Not established by the inspected evidence. Never fill from assumption, founder memory alone, marketing copy, or a placeholder. |
| `DRAFT / TEMPLATE` | Operational draft only; not signed and not represented as counsel approved. |
| `COUNSEL REQUIRED` | A legal conclusion, jurisdictional decision, negotiated position, or legal-document approval is required. |
| `BLOCKED` | The downstream action must not proceed until the identified fact/control is established. |
| `NOT APPLICABLE` | Determined not applicable with a recorded rationale and, when legal in nature, appropriate adviser confirmation. |

### Evidence hierarchy

For legal/corporate facts, prefer evidence in this order:

1. official registry, certificate, government/tax record, signed board/shareholder instrument, registrar record, or equivalent authoritative source;
2. fully executed agreement or counsel-produced closing book;
3. authenticated vendor/account administration evidence;
4. approved internal register tied to source documents;
5. repository implementation evidence for technical facts;
6. marketing copy, product UI, drafts, tickets, and founder notes — **not authoritative evidence of legal facts**.

### Non-negotiable truth rules

- A GitHub owner/login is not a legal owner of copyright by itself.
- A domain used by production is not proof of registrant ownership.
- A filename containing `agreement`, `DPA`, `SLA`, or `policy` is not proof of execution or counsel approval.
- A security control is not a certification.
- A provider adapter is not proof that the provider is active for customer data.
- An SBOM is not a license-compliance conclusion.
- A product-history setting is not necessarily a destruction/retention promise.
- Never invent a governing law, venue, registered office, tax ID, company number, director, shareholder, beneficial owner, bank, insurance policy, SLA percentage, breach-notice deadline, or liability cap.

---

## 3. Repository evidence snapshot

This table records what the inspected repository can and cannot establish.

| Area | Evidence observed | Status | Operational conclusion |
| --- | --- | --- | --- |
| Repository | `injamhaqq/foremention`; public repository; default branch `main` | `VERIFIED — REPO` | Repository control exists. Legal copyright ownership remains separate. |
| Snapshot | `main` inspected at `08d7f398ae89d0d69af4530af5ecc6c752f1a6c6` | `VERIFIED — REPO` | Use this SHA when reproducing this audit. |
| Public Terms | `app/terms/page.tsx` | `VERIFIED — REPO` | Public beta terms exist; they are not evidence of counsel approval or an incorporated contracting party. |
| Public Privacy | `app/privacy/page.tsx` | `VERIFIED — REPO` | Operational privacy notice exists and contains factual processing claims that require continuing evidence. |
| Subprocessors | `app/subprocessors/page.tsx` | `VERIFIED — REPO` | Operational transparency list exists and contains activation boundaries. |
| Security policy | `SECURITY.md` | `VERIFIED — REPO` | Vulnerability reporting and no-guaranteed-response-time boundary exist. |
| Private-beta legal/commercial boundary | `docs/PRIVATE-BETA-OPERATING-POLICY.md` | `VERIFIED — REPO` | Explicitly prevents invention of legal entity, tax, jurisdiction, DPA, and certification facts. Preserve this posture. |
| Provider boundaries | `docs/integration-boundaries.md`, `README.md` | `VERIFIED — REPO` | Multiple adapters exist; active provider status must be proven per configuration/use. |
| Billing boundary | `README.md` | `VERIFIED — REPO` | Paid activation is fail-closed pending real Stripe/commercial configuration and approved entity/tax/customer-facing terms. |
| Dependency manifest | `package.json` | `VERIFIED — REPO` | Root package is `private: true`; direct dependency list is versioned. |
| Transitive lock | `pnpm-lock.yaml` | `VERIFIED — REPO` | A lockfile exists for transitive dependency inventory. |
| SBOM | `.github/workflows/ci.yml` | `VERIFIED — REPO` | `main` releases generate SPDX JSON SBOM and attestation evidence. |
| Dependency vulnerability audit | `.github/workflows/ci.yml` | `VERIFIED — REPO` | CI runs `pnpm audit --prod --audit-level=moderate`. This is security scanning, not license scanning. |
| Repository license | GitHub repository metadata: `license: null`; no root `LICENSE` in inspected root listing | `UNKNOWN / DECISION REQUIRED` | Public visibility does not substitute for an explicit licensing strategy. Owner/counsel decision required before adding a license or making reuse claims. |
| Brand assets | `public/brand/foremention-logo-white.svg`, `public/brand/foremention-mark-white.svg` | `VERIFIED — REPO` for existence; ownership `UNKNOWN` | Obtain creation/source/assignment evidence before asserting ownership or filing a design/logo mark. |
| Contributor governance | No `CONTRIBUTING`, `CODEOWNERS`, CLA, or DCO artifact was identified in the inspected root/search | `UNKNOWN` | Establish contributor intake before accepting outside code contributions. Re-check the full tree before implementation. |
| Incorporation / entity | No authoritative corporate record inspected | `UNKNOWN` | Do not name a legal entity in contracts/site until verified. |
| Cap table | No authoritative cap-table record inspected | `UNKNOWN` | Fundraising/hiring equity actions blocked until established externally. |
| IP assignments | No executed founder/employee/contractor assignment inspected | `UNKNOWN` | Chain of title remains a P0 legal-operations task. |
| Trademarks | No registration/filing evidence inspected | `UNKNOWN` | Do not use `®` or claim registration. |
| Customer contracts | Terms refer to signed order forms/enterprise agreements, but no executed customer contract was inspected | `UNKNOWN` | Build a controlled contract repository outside source code; never infer execution from templates. |

### Important consistency observation

The product supports or references adapters for OpenAI, Gemini, Anthropic, Perplexity, Groq, Cloudflare Workers AI, OpenRouter, ZenMux, OmniRouters, and configured gateways. The public Subprocessors page currently names only services supported by its active/configuration evidence and explicitly says additional AI providers may be supported without being active for every customer.

That distinction is correct and should become a formal vendor-state model:

`CANDIDATE → CODE-SUPPORTED → SECURITY/PRIVACY REVIEWED → CONTRACTUALLY APPROVED → CONFIGURED → ACTIVE FOR CUSTOMER/WORKSPACE → DISABLED/EXITED`

No provider should move to `ACTIVE FOR CUSTOMER/WORKSPACE` merely because an adapter exists.

---

# A. Corporate Checklist

## 4. Canonical corporate truth register

Create one external, access-controlled corporate register whose entries link to authoritative source documents. Do not place sensitive corporate IDs, banking details, tax IDs, identity documents, or cap-table details in this public repository.

| Corporate control | Current status | Acceptable evidence | Downstream gate |
| --- | --- | --- | --- |
| Legal entity name | `UNKNOWN` | Certificate/articles or authoritative registry record | Required before any agreement names Foremention as a legal party |
| Entity type | `UNKNOWN` | Incorporation/formation document | Required for contracts, tax, banking, fundraising |
| Jurisdiction of formation | `UNKNOWN` | Official formation record | Required before governing-law/tax/filing assumptions |
| Incorporation/formation date | `UNKNOWN` | Official formation record | Corporate records/data room |
| Company/registration number | `UNKNOWN` | Official registry | Contracts/invoices only when verified and appropriate |
| Registered office/address | `UNKNOWN` | Official filing/registered-agent record | Required before publishing contractual notice address |
| Registered agent, if applicable | `UNKNOWN` | Official filing/provider record | Jurisdiction-specific; counsel determines applicability |
| Directors/managers | `UNKNOWN` | Board/registry records | Governance/signing authority |
| Officers | `UNKNOWN` | Board resolutions/officer register | Operational authority |
| Founders in legal capacity | `UNKNOWN` | Formation/share/IP documents | Chain-of-title and capitalization |
| Shareholders/members | `UNKNOWN` | Share/member register and signed issuance records | Cap table/fundraising |
| Cap table | `UNKNOWN` | Counsel/company-approved cap table tied to source instruments | Fundraising, equity grants, ownership representations |
| Option/equity incentive pool | `UNKNOWN` | Board/shareholder-approved plan and grants | Hiring/equity compensation |
| SAFEs/notes/convertibles | `UNKNOWN` | Executed financing instruments | Fundraising/data room |
| Beneficial ownership | `UNKNOWN` | Applicable filing/register evidence | Banking/compliance/required filings |
| Tax registrations | `UNKNOWN` | Tax authority confirmations | Billing/payroll/tax compliance |
| Sales/VAT/GST registrations | `UNKNOWN` | Applicable tax registrations | Customer invoicing; applicability depends on jurisdictions |
| Employer/payroll registrations | `UNKNOWN` | Applicable government/payroll records | Hiring employees |
| Banking relationship | `UNKNOWN` | Bank account record in verified entity name | Customer receipts/payroll/vendor payments |
| Payment processor contracting entity | `UNKNOWN` | Stripe/account records and approved entity config | Self-serve paid activation |
| Accounting system / ledger | `UNKNOWN` | Authenticated accounting records and chart of accounts | Financial statements/tax/fundraising |
| Accountant/tax adviser | `UNKNOWN` | Engagement record | Tax calendar and filings |
| Corporate counsel | `UNKNOWN` | Engagement record | Contracts, IP, financing, employment, privacy decisions |
| Required annual/periodic filings | `UNKNOWN` | Jurisdiction-specific legal/accounting calendar | Cannot define accurately until entity/jurisdiction is verified |
| Insurance | `UNKNOWN` | Policy/binder | Do not claim coverage; obtain only based on actual customer/company need |
| Signature authority matrix | `UNKNOWN` | Board/company-approved delegation | No enterprise agreement should be signed without verified authority |

### Corporate evidence packet

Once an entity exists, maintain a secure corporate folder containing at minimum, as applicable:

- formation certificate/articles/constitution;
- bylaws/operating agreement or equivalent;
- initial and subsequent board/shareholder/member approvals;
- director/officer registers;
- share/member issuance instruments;
- current cap table tied to underlying documents;
- financing instruments and side letters;
- beneficial-ownership records/filing confirmations where applicable;
- tax registrations and filing calendar;
- bank and payment-processor entity verification;
- material insurance policies;
- material contracts;
- founder, employee, and contractor IP assignment evidence;
- trademark/domain records;
- counsel/accountant contact and engagement metadata.

### Corporate fact publication rule

A corporate fact may enter the website, invoice, order form, DPA, security questionnaire, investor deck, or sales response only if:

1. a source document exists;
2. an internal owner has verified it;
3. the exact approved representation is recorded;
4. the source has not expired or been superseded; and
5. any required counsel/accounting review is complete.

---

# B. IP Ownership

## 5. IP chain-of-title audit

### 5.1 Repository and source code

**Observed:** the repository is hosted under the GitHub account `injamhaqq` and is publicly visible.

**Do not infer:** that the account holder, a founder, or a future company necessarily owns all copyright or has the right to assign every contribution.

Required controls:

- establish who authored the code and when;
- identify all pre-incorporation work;
- identify any employer, school, client, accelerator, agency, contractor, or collaborator relationship that could create competing IP claims;
- have counsel prepare/approve any founder pre-incorporation IP assignment into the verified company;
- record excluded/pre-existing IP where appropriate;
- require future employees/contractors to sign applicable confidentiality/invention/work-product documents before or at the legally appropriate time;
- preserve signed assignment evidence in the corporate legal repository, not the public code repository.

**Status:** `UNKNOWN — P0`.

### 5.2 Founder IP assignment

Before fundraising or material enterprise contracting, counsel should determine what rights must be assigned from each founder/creator to the verified entity, covering as appropriate:

- source code and scripts;
- product architecture and documentation;
- brand name, logos, visual system, copy, and design files;
- domain and social-account rights;
- datasets, schemas, evaluation sets, benchmarks, and internal research;
- customer-discovery materials where legally transferable;
- inventions, know-how, trade secrets, prompts, workflows, and deployment/configuration artifacts;
- rights to enforce past infringement where legally appropriate.

Do not sign a generic assignment without counsel checking jurisdiction, prior obligations, excluded inventions/materials, moral-rights issues where relevant, and consideration/formality requirements.

**Status:** `UNKNOWN — COUNSEL REQUIRED — P0`.

### 5.3 Employees and contractors

For every worker, maintain an IP/confidentiality status record before granting repository, production, customer-data, or brand-asset access.

Minimum operational record:

| Field | Required |
| --- | --- |
| Legal name / contracting party | Yes, externally controlled |
| Relationship | Employee / contractor / agency / adviser |
| Governing employment/contract jurisdiction | Counsel-reviewed |
| Agreement version | Yes |
| Signed date | Yes |
| Effective date | Yes |
| Confidentiality obligation | Verified |
| Work-product/invention assignment | Counsel-confirmed |
| Prior inventions/materials schedule | Included when appropriate |
| OSS/third-party-material restrictions | Included |
| Security/data-handling obligations | Included |
| Return/deletion on exit | Included |
| Repository/system access start/end | Logged |

Do not assume a contractor's invoice or GitHub commit automatically transfers copyright.

### 5.4 External contributors

No formal CLA/DCO/contribution-governance artifact was identified in the inspected repository.

Until a deliberate contribution model exists:

- do not solicit material external contributions casually;
- require an explicit review before accepting third-party pull requests;
- establish whether Foremention will use a CLA, DCO/sign-off model, contributor terms, or a closed-contribution policy;
- confirm the contributor has authority to contribute;
- reject copied code or assets with unclear provenance;
- preserve contribution metadata.

The legal form should be selected with counsel; engineering should enforce the chosen rule in PR workflow.

### 5.5 Brand assets

The inspected repository contains:

- `public/brand/foremention-logo-white.svg`
- `public/brand/foremention-mark-white.svg`

Existence is verified; authorship, source files, commissioning terms, font rights, and assignment are not established by those files alone.

Create a brand provenance register:

| Asset | Creator/source | Creation date | Source file | Third-party inputs/fonts | Assignment/license evidence | Entity owner | Trademark status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Foremention word/logo artwork | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| Foremention standalone mark | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |

Do not file a logo trademark until provenance and ownership are clean enough for counsel to support the application.

### 5.6 Domain and social handles

The repository uses `foremention.com` as the production/canonical domain. That technical use does not establish the registrar account, registrant, or legal owner.

External controls:

- verify registrar and registrant;
- place the domain in the correct entity/account structure when counsel/operations approve;
- require MFA and recovery controls;
- record renewal date and auto-renew status;
- document DNS administrators;
- maintain a transfer/exit process;
- inventory important social handles and ownership/recovery email.

**Status:** technical use `VERIFIED — REPO`; legal/registrar ownership `UNKNOWN`.

### 5.7 Datasets, evaluation sets, and research material

For every dataset or benchmark, record:

- origin/source;
- whether customer, public, licensed, synthetic, or internally generated;
- collection date and method;
- applicable source/API/site terms;
- personal/confidential data classification;
- allowed purposes;
- retention/deletion requirements;
- redistribution rights;
- model-training/evaluation rights if relevant;
- citation/attribution requirements;
- customer-specific contractual restrictions.

A public webpage or public AI answer is not automatically unrestricted intellectual property. Existing Foremention product language already recognizes this boundary and it should remain enforced.

### 5.8 AI/model/provider terms register

Maintain a current terms register for every provider state, including Cloudflare, Supabase, Inngest, Resend, Stripe when enabled, analytics systems, and every AI/model/gateway actually used.

Required fields:

- vendor;
- product/API;
- account owner and contracting entity;
- status (`candidate`, `code-supported`, `reviewed`, `configured`, `active`, `disabled`);
- terms URL/version/effective date captured externally;
- DPA/privacy terms status;
- customer-content/data-use terms;
- provider training/retention settings and contractual rights — only when verified;
- data location/transfer mechanism — only when verified;
- subprocessor commitments;
- model-specific restrictions;
- output/content rights and indemnity terms if any;
- usage-policy restrictions;
- rate/cost terms;
- termination/export/deletion implications;
- last review date and owner.

Provider terms change over time. The register must therefore be versioned and periodically revalidated; do not hard-code a legal conclusion into product copy without a source and owner.

---

# C. Contract Operations

## 6. Contract system architecture

The following are **template/checklist specifications**, not executable legal agreements. Counsel should convert approved commercial positions into actual contract templates for the verified entity and target jurisdictions.

Every template should have:

- document ID;
- document type;
- version;
- approval status;
- counsel approver/date where required;
- approved entity/territory/use case;
- fallback positions;
- prohibited edits;
- clause owner;
- linked privacy/security/product evidence;
- superseded version pointer.

Never store signed customer agreements in a public repository.

### 6.1 SaaS Agreement / MSA checklist

**Purpose:** master commercial/legal terms for paid SaaS customers.

Minimum topics for counsel to draft/review:

- verified legal parties and addresses;
- definitions and service scope;
- account/access rules and customer responsibilities;
- subscription/license/access rights;
- acceptable-use restrictions;
- order-form mechanics and precedence;
- fees, invoicing, taxes, currency, late payment, and approved refund/cancellation posture;
- customer data rights and limited processing permission;
- Foremention/background IP, customer IP, feedback, and third-party materials;
- confidentiality;
- privacy/security and DPA relationship;
- support and change management;
- AI/provider/evidence limitations consistent with product truth;
- warranties and disclaimers;
- indemnities, if any;
- liability exclusions/caps — **no default number may be invented**;
- suspension and termination;
- data export/return/deletion consequences;
- term, renewal, and notice windows;
- publicity/reference rights only with actual approval;
- assignment/change of control;
- force majeure;
- notices;
- governing law/forum — **`UNKNOWN`, counsel required**;
- signature and authority.

**Counsel-required decisions:** governing law, liability, indemnity, warranties, statutory rights, consumer/business applicability, taxes, export/sanctions language if applicable, privacy allocation, dispute mechanism.

### 6.2 Order Form checklist

Every order form should contain only verified facts:

- customer legal name;
- Foremention contracting legal entity;
- billing/service contacts;
- product/package and workspace/usage scope;
- service start date;
- initial term and renewal structure;
- price, currency, invoice cadence, payment terms;
- approved overage/usage rules if any;
- referenced MSA version;
- referenced DPA/security/SLA versions where applicable;
- customer-specific integrations/data locations only when verified;
- implementation/pilot milestones if sold;
- special terms/deviations;
- signature blocks and authority.

No order form should silently create an SLA, certification, data-residency promise, unlimited usage, or unimplemented feature commitment.

### 6.3 DPA checklist

**Purpose:** allocate data-processing obligations for the actual customer relationship.

Counsel should determine applicability and roles for each arrangement. The template architecture should cover, when applicable:

- parties and relationship to MSA/order form;
- processing subject matter, duration, nature, and purposes;
- categories of data subjects and personal data;
- controller/processor or other role allocation based on facts;
- documented instructions;
- confidentiality/access control;
- technical and organizational measures tied to actual controls;
- subprocessor authorization/change process;
- assistance with data-subject requests;
- security incident cooperation/notice terms — no invented deadline;
- DPIA/regulator assistance where applicable;
- deletion/return and backup-cycle boundaries;
- audit/evidence process;
- international-transfer mechanism only when actually required and established;
- government/law-enforcement request handling where applicable;
- precedence and liability relationship to the MSA.

Do not promise an SCC, UK transfer addendum, regional hosting location, fixed deletion interval, or audit certification unless the actual relationship supports it.

### 6.4 NDA checklist

- verified parties;
- permitted purpose;
- confidential-information definition;
- exclusions;
- permitted recipients and need-to-know restrictions;
- use/protection obligations;
- compelled disclosure process;
- return/destruction subject to lawful archival/backup boundaries;
- term and survival;
- no implied IP license;
- residuals, remedies, governing law, and venue only if counsel approves.

### 6.5 Pilot / Design-Partner Agreement checklist

A pilot should prevent the sales process from accidentally creating production-grade promises.

Include:

- parties;
- beta/pilot status;
- exact scope: brands/workspaces/questions/providers/frequency/users;
- start/end dates;
- implementation responsibilities;
- success criteria and measurement boundary;
- fee/free status and any conversion terms;
- data-processing/privacy terms;
- confidentiality;
- feedback/research permissions;
- IP ownership;
- publicity/reference permission — opt-in only unless counsel approves otherwise;
- support boundaries;
- evidence/AI variability limitations;
- no implied SLA/certification/roadmap commitment;
- termination and data handling;
- path to paid order form if successful.

### 6.6 Contractor Agreement checklist

Counsel should adapt to worker location and classification rules.

- parties and status;
- services/deliverables;
- fees/expenses/taxes;
- term/termination;
- confidentiality;
- invention/work-product assignment to the verified entity where legally effective;
- prior inventions/pre-existing materials schedule;
- prohibition/approval process for third-party code/assets;
- OSS policy;
- security/data-access obligations;
- least-privilege system access;
- return/deletion of company/customer materials;
- representations about authority to perform and contribute;
- subcontracting approval;
- applicable privacy terms;
- dispute/governing terms determined by counsel.

### 6.7 Employee IP & Confidentiality checklist

Counsel/local HR advisers must adapt this to employment law.

- confidentiality;
- lawful invention/work-product assignment provisions;
- prior inventions/excluded materials;
- third-party/open-source obligations;
- company systems/security requirements;
- customer confidentiality/data handling;
- acceptable use;
- return of property/data;
- post-employment confidentiality/rights as legally permitted;
- acknowledgment of policies;
- signatures at the legally appropriate time.

Do not copy a US-style invention assignment into another jurisdiction without review.

### 6.8 Partner Agreement checklist

- parties and relationship;
- roles/scope;
- approved lead/deal process;
- no authority to bind Foremention;
- commercial economics;
- customer ownership/attribution rules;
- confidentiality;
- privacy/data sharing;
- approved brand/mark use;
- IP ownership;
- anti-bribery/compliance provisions as appropriate;
- warranties/indemnity/liability determined by counsel;
- term/termination;
- transition of active opportunities/customers.

### 6.9 Referral Agreement checklist

- qualified referral definition;
- referral registration and attribution window;
- excluded/pre-existing accounts;
- commission amount/formula only after approved commercially;
- payment trigger and timing;
- refunds/churn/clawbacks if applicable;
- taxes;
- prohibited representations;
- no agency/authority;
- privacy/contact-data handling;
- anti-bribery/compliance;
- brand use;
- term/termination.

### 6.10 Security Addendum checklist

Every security promise must map to evidence.

Potential topics:

- access control and tenant isolation;
- authentication/session controls;
- encryption in transit/at rest only where verified;
- secret management;
- logging/auditability;
- secure development/release controls;
- vulnerability/dependency management;
- incident response;
- backup/recovery/BCP/DR only at proven levels;
- subprocessors;
- personnel access/security obligations;
- penetration testing/certification evidence only if real;
- audit/customer assurance process;
- data deletion/return boundaries;
- material control changes.

Do not convert architecture aspirations into contractual warranties.

### 6.11 SLA Schedule checklist

The repository deliberately does not promise a contractual SLA today. Preserve that until real service data and support capacity justify one.

If an SLA is later approved, counsel/engineering/operations should jointly define:

- covered service;
- availability formula and measurement source;
- exclusions;
- maintenance rules;
- severity definitions;
- support channels;
- response/restore targets backed by staffing evidence;
- service credits/remedy;
- claim process;
- force majeure/third-party boundaries;
- customer dependencies;
- reporting.

**Never invent `99.9%`, `24/7`, response times, recovery objectives, or service credits.**

---

## 7. Contract approval and deviation control

Maintain a contract playbook with three states per clause:

- **GREEN:** pre-approved standard language/position;
- **YELLOW:** approved fallback requiring designated business/legal approval;
- **RED:** legal/executive approval required; may be non-negotiable.

Track every negotiated deviation that changes:

- liability/indemnity;
- security promises;
- incident timing;
- data location/transfer;
- subprocessor notice/approval;
- IP/data rights;
- confidentiality;
- SLA/support;
- payment/refund/termination;
- auto-renewal;
- governing law/venue;
- insurance;
- audit rights;
- publicity;
- roadmap/custom-development commitments.

No salesperson or operator should make a side-channel promise that is absent from the signed contract and product capability.

---

# D. Procurement Workflow

## 8. Canonical enterprise procurement flow

**Required sequence:**

`Opportunity → Security Review → Legal → DPA → Order Form → Approval → Signature → Provisioning`

A stage may be marked not applicable only with a recorded reason; provisioning never proves that prior legal steps occurred.

| Stage | Primary purpose | Required inputs | Exit artifact | Hard blockers |
| --- | --- | --- | --- | --- |
| Opportunity | Confirm commercial scope and buyer | Customer identity, use case, data/integrations, package hypothesis | Qualified opportunity record | Unknown customer/unsafe use case |
| Security Review | Answer only from evidence | Security policy, architecture evidence, subprocessor state, control register | Approved questionnaire/security packet + deviations | Unsupported certification/control/SLA request |
| Legal | Establish contracting terms | Verified Foremention entity, customer entity, approved MSA/NDA | Negotiated legal baseline | No contracting entity or authority |
| DPA | Establish privacy terms when applicable | Processing map, active subprocessors, security controls, transfer facts | Approved DPA/version or N/A decision | Unknown processing facts or unsupported transfer/location promise |
| Order Form | Encode commercial scope | Package, price, term, usage, implementation, document versions | Final order form | Unapproved pricing/feature/term |
| Approval | Internal authority check | Deviation summary, economics, legal/security approvals | Approval record | Missing signer authority or red-line approvals |
| Signature | Execute final immutable version | Final PDFs/e-sign envelope and verified signatories | Executed agreement packet | Unsigned/partial/outdated version |
| Provisioning | Activate exactly purchased scope | Executed agreement, customer/workspace mapping, entitlement configuration | Provisioning record linked to agreement | No executed authority, unsafe configuration, unsupported promise |

### 8.1 Procurement truth packet

For each enterprise deal, maintain a single deal packet:

- opportunity ID;
- customer legal entity;
- contracting Foremention entity;
- security questionnaire version and evidence links;
- legal documents and versions;
- DPA/subprocessor commitments;
- order-form commercial terms;
- approvals and approvers;
- executed versions and signature timestamps;
- provisioning scope;
- special obligations converted into operational tasks;
- renewal/notice dates;
- owner.

### 8.2 Signature authority

**Current status: `UNKNOWN`.**

Before signing any material contract, create an externally controlled authority matrix specifying who can approve/sign:

- NDAs;
- pilots;
- standard order forms;
- non-standard MSAs;
- DPAs/security addenda;
- vendor agreements;
- employment/contractor agreements;
- financing/equity instruments;
- banking/tax instructions.

The matrix must derive from the verified entity's governance documents/approvals. A GitHub administrator or product operator is not automatically a corporate signatory.

### 8.3 Contract repository metadata

For every signed customer/vendor agreement record:

- internal agreement ID;
- counterparty legal name;
- document types and versions;
- effective/signature dates;
- initial term;
- renewal mechanism;
- termination/notice windows;
- commercial value/currency where appropriate;
- active products/workspaces;
- DPA/security/SLA versions;
- liability/indemnity deviations;
- data residency/transfer commitments;
- subprocessor notice commitments;
- insurance obligations;
- audit obligations;
- custom development/roadmap commitments;
- publicity/reference rights;
- signatories;
- contract owner;
- renewal owner;
- source document location;
- superseded/terminated status.

Create reminders from contract metadata; do not rely on founder memory.

---

# E. Terms / Privacy Consistency Audit

## 9. Current public-document posture

### 9.1 Terms — strengths to preserve

`app/terms/page.tsx` currently:

- describes Foremention as evidence/workflow software;
- states AI answers are variable/probabilistic;
- disclaims guaranteed publisher acceptance, placement, indexing, recommendation, citation, rank, traffic, leads, pipeline, and revenue;
- says current self-serve signup does not itself activate a paid plan or charge a card;
- says signed order forms/written enterprise agreements control conflicting subjects;
- does not invent a legal entity, tax jurisdiction, or governing law;
- does not promise uninterrupted/error-free service.

These are useful truth controls.

### 9.2 Terms — issues requiring counsel/company resolution

- The terms say “Foremention and its licensors retain rights” while the legal entity and IP chain of title remain unverified. Treat this as product/brand language, not proof of legal title; counsel should approve the final contracting-party/ownership language once the entity and assignments are real.
- Paid contracting cannot safely scale until the legal party, governing-law strategy, tax posture, payment terms, liability/indemnity positions, and versioned enterprise agreement architecture are approved.
- Clickwrap/browsewrap acceptance mechanics, version evidence, and account-creation assent should be reviewed before relying on public terms as the primary contract.

### 9.3 Privacy — claims requiring evidence

`app/privacy/page.tsx` includes factual claims that must remain tied to implementation/configuration evidence, including:

- Foremention does not sell personal information;
- Cloudflare Web Analytics behavior;
- limited PostHog EU configuration and excluded capture categories;
- optional Microsoft Clarity/Contentsquare after explicit browser acceptance;
- Google Analytics and Google Tag Manager are not loaded;
- role-based access, encrypted transport, server-side secret handling, and row-level controls;
- retention/deletion boundaries;
- access/correction/export/restriction/deletion request handling subject to applicable law/contracts.

A privacy notice is not a place for aspirational controls. If product configuration changes, the notice and consent/subprocessor system must change with it.

### 9.4 Subprocessors — strengths and control gap

The public list appropriately states that:

- not every listed service is active for every workspace;
- not every service receives every data category;
- the list is not a representation of a universal DPA, transfer mechanism, data location, certification, or enterprise contract;
- Sentry code presence alone does not establish active production processing;
- additional AI providers are active only when configured/used.

The remaining operational gap is a **customer-contractual subprocessor register** that records, per provider and customer class, the actual contracting entity, DPA terms, transfers/locations if verified, notice obligations, and activation state.

### 9.5 Security claims

`components/enterprise-readiness.tsx` explicitly says engineering controls are not compliance certifications and disclaims SOC 2/ISO 27001 certification, automatic SCIM, a contractual SLA, and unestablished legal-entity/jurisdiction facts.

Preserve this control. Any future certification badge or compliance statement requires documented scope, report/certificate, dates, entity, services covered, and approved public wording.

---

## 10. Public legal-claim registry

Create a versioned registry for every material claim in Terms, Privacy, Subprocessors, Security, trust pages, sales decks, security questionnaires, and order forms.

| Field | Description |
| --- | --- |
| Claim ID | Stable identifier |
| Exact claim | Text or normalized claim |
| Surface | URL/document/questionnaire |
| Claim type | Corporate / privacy / security / processor / billing / IP / SLA / compliance |
| Evidence source | Repository/config/vendor contract/official record |
| Evidence date | Last verification |
| Owner | Person accountable |
| Status | Verified / conditional / stale / prohibited |
| Customer scope | All / plan / region / customer-specific |
| Expiry/review date | Revalidation trigger |
| Approved wording | Exact external language |

### Stop-ship claim categories

Do not publish or sign unsupported claims about:

- legal entity name/type/address/company number;
- jurisdiction/governing law;
- directors/shareholders/ownership;
- trademark registration;
- SOC 2, ISO 27001, HIPAA, PCI or other certification/compliance status;
- “GDPR compliant” or equivalent blanket legal conclusion without counsel-defined scope;
- encryption/storage architecture not actually verified;
- data location/residency;
- subprocessor identity/activity;
- provider training/non-training practices;
- retention/deletion deadlines;
- breach-notification deadlines;
- uptime/recovery/support targets;
- insurance;
- tax treatment;
- customer references/publicity rights;
- guaranteed recommendations, citations, traffic, leads, pipeline, or revenue.

---

# F. Trademark / Category Protection

## 11. Trademark operating checklist

No trademark registration was verified in this audit. Therefore:

- trademark filing status: `UNKNOWN`;
- registration status: `UNKNOWN`;
- do not use `®` unless a registration for the relevant mark/jurisdiction is actually verified;
- any use of `™` should be deliberate and reviewed in the context where it is used.

### 11.1 Foremention word mark

Operational sequence:

1. establish the verified legal owner/applicant;
2. document current use of `Foremention` and relevant first-use evidence without inventing legal dates;
3. conduct professional clearance/search appropriate to target markets;
4. identify actual goods/services and commercially relevant territories;
5. have trademark counsel determine filing strategy/class descriptions;
6. file through the correct owner;
7. retain filing/registration records;
8. maintain renewal/declaration deadlines;
9. monitor confusing uses where commercially justified;
10. record licenses/assignments if ownership changes.

### 11.2 Logo / visual assets

Before filing or strongly asserting ownership:

- verify authorship and commissioning history;
- verify all embedded fonts/components/assets;
- obtain assignment/license documentation;
- retain editable source files and creation records;
- confirm the mark matches the version actually used in commerce;
- avoid materially changing a registered design without considering filing consequences.

### 11.3 Product names

Do not file every internal feature name. Consider protection only where a name is:

- customer-facing;
- durable;
- strategically differentiated;
- likely to accumulate goodwill;
- worth the clearance, filing, maintenance, and enforcement cost.

Run the same clearance/ownership process before material investment.

### 11.4 Category terminology — “Recommendation Intelligence”

Foremention uses “Recommendation Intelligence” as category language. Whether any category phrase is protectable, descriptive, generic, available, or worth attempting to register is a legal/trademark question that depends on actual use and jurisdiction.

Operational rule:

- use category language accurately for positioning;
- do not claim exclusive legal ownership;
- do not describe it as registered unless verified;
- have trademark counsel evaluate protectability before filing or threatening enforcement;
- focus protection strategy first on distinctive source identifiers such as the `Foremention` name/mark, subject to clearance.

### 11.5 Domains and handles

Maintain a brand protection register for:

- primary domain;
- defensive domains worth keeping;
- key social handles;
- registrar/account owner;
- entity ownership;
- renewal dates;
- MFA/recovery method;
- transfer authority;
- trademark relationship.

---

# G. Open Source Compliance

## 12. Current OSS posture

### Verified engineering controls

- root `package.json` is `private: true`;
- `pnpm-lock.yaml` exists for pinned dependency resolution;
- CI installs with `--frozen-lockfile`;
- CI runs a production dependency vulnerability audit;
- release CI generates an SPDX JSON SBOM;
- verified releases receive provenance/SBOM attestations.

These are strong supply-chain foundations.

### Material gaps

- GitHub repository metadata currently reports no repository license (`license: null`), and no root `LICENSE` was present in the inspected root listing;
- no complete OSS license-policy file was identified;
- no `THIRD_PARTY_NOTICES`/attribution artifact was identified;
- no dedicated dependency license scanner/gate was identified in the inspected CI;
- no evidence was inspected showing legal review of every transitive license, vendored asset, copied snippet, generated asset, or model/data license.

Do **not** add a repository license casually. The correct outbound licensing decision depends first on verified ownership/chain of title and company strategy.

---

## 13. OSS compliance pipeline

### 13.1 Inventory

For every release, inventory:

- direct npm/pnpm dependencies;
- transitive dependencies;
- GitHub Actions and pinned action versions;
- vendored/copied source code;
- CSS/JS snippets;
- fonts/icons/images/media;
- Docker/base images if later used;
- databases/datasets/model artifacts;
- CLI/build-time dependencies that are redistributed;
- browser/client bundles;
- server/runtime bundles;
- generated code whose source terms matter.

Use the existing SPDX SBOM as an input, not the final legal conclusion.

### 13.2 License classification routing

The following is an **internal review routing heuristic, not legal advice**.

| Route | Examples | Action |
| --- | --- | --- |
| Routine obligations review | MIT, ISC, BSD-family, Apache-2.0 | Verify notices/attribution/conditions and compatibility with actual distribution/use. |
| Engineering + counsel review | MPL, LGPL, EPL, CDDL and similar reciprocal/file/library licenses | Determine linking/modification/distribution obligations for the actual architecture. |
| Mandatory legal escalation before adoption/distribution | AGPL, SSPL, Commons Clause, BUSL/source-available/custom terms, “non-commercial” restrictions, unknown/no-license packages | Do not assume compatibility; obtain counsel decision or replace. |
| Asset/data/model-specific review | fonts, icons, stock media, datasets, model weights, generated-content terms | Track separately from software package licenses. |

Never implement a simplistic “GPL = forbidden” rule. Obligations depend on the exact license, version, modification, linking/network use, and distribution model.

### 13.3 CI control target

Add a future CI/license-compliance job that:

1. derives the dependency set from the lockfile/SBOM;
2. detects license identifiers and unknown/custom licenses;
3. compares against an approved policy;
4. fails on unknown/prohibited/unreviewed high-risk cases;
5. produces an attribution candidate file;
6. archives the license report with release evidence;
7. requires manual counsel/engineering approval for exceptions.

Do not auto-classify legal compatibility without human review.

### 13.4 Third-party notices

If required by actual dependencies/assets, maintain a generated/reviewed `THIRD_PARTY_NOTICES` or equivalent artifact containing required notices/attributions. Counsel should confirm which obligations apply to the shipped product.

### 13.5 Repository outbound-license decision

Because the repository is public but has no declared license, create a formal decision record before adding one:

- verified IP owner;
- business objective: proprietary source-available visibility vs open-source contribution vs other;
- inbound contribution model;
- patent/trademark considerations;
- compatibility with third-party code;
- effect on hosted SaaS and redistribution;
- chosen license or deliberate no-license posture;
- counsel approval;
- effective date/version.

The decision should not be retroactively described as always having applied unless legally supported.

---

## 14. Provider, data, and third-party asset compliance register

Use one cross-functional register so OSS review is not isolated from privacy/IP obligations.

| Field | Purpose |
| --- | --- |
| Third party | Vendor/project/source |
| Type | SaaS / AI provider / OSS package / asset / dataset / model / payment / analytics |
| Version/service | Exact release or contracted product |
| Use | What Foremention does with it |
| Runtime/customer-data access | Yes/no/conditional |
| License/terms | Exact source/version |
| DPA/privacy review | Status |
| IP/output rights | Status |
| Attribution obligations | Status |
| Reciprocal/source obligations | Status |
| Data-location/transfer facts | Only verified values |
| Security review | Status |
| Commercial/cost terms | Status |
| Owner | Internal accountable person |
| Approved date | Evidence |
| Next review | Date/trigger |
| Exit plan | Replacement/export/deletion plan |

---

# Company Readiness Gates

## 15. P0 before first material enterprise signature

All of the following should be complete or explicitly waived by authorized counsel/company leadership with a documented rationale:

- [ ] Verified legal entity name/type/jurisdiction.
- [ ] Verified registered address/required company identifiers.
- [ ] Verified signature authority.
- [ ] Founder/pre-incorporation IP chain of title completed.
- [ ] Employee/contractor IP/confidentiality process ready before access/hiring.
- [ ] Brand/logo provenance documented.
- [ ] Domain ownership/control documented.
- [ ] Counsel-approved MSA baseline.
- [ ] Counsel-approved order form baseline.
- [ ] DPA process/template appropriate to actual processing and target customers.
- [ ] NDA baseline.
- [ ] Pilot/design-partner agreement baseline.
- [ ] Security addendum response process tied to evidence.
- [ ] No contractual SLA unless real measurement/support capacity supports it.
- [ ] Public Terms/Privacy/Subprocessors reviewed against actual entity and production configuration.
- [ ] Active subprocessor/vendor contractual register current.
- [ ] No unsupported certification/compliance claims.
- [ ] Tax/billing entity/configuration approved before charging customers.
- [ ] Repository outbound-license strategy decided after ownership review.
- [ ] Release SBOM retained and license-obligation review operational.
- [ ] Restricted/unknown third-party licenses escalated.
- [ ] Contract repository and renewal/obligation tracking established.

## 16. P0 before hiring an employee

- [ ] Verified employing entity.
- [ ] Worker location and employment jurisdiction recorded.
- [ ] Local employment/payroll/tax requirements reviewed by qualified advisers.
- [ ] Approved employment agreement/offer process.
- [ ] Counsel-approved confidentiality/IP/invention terms appropriate to jurisdiction.
- [ ] Prior-inventions/materials process.
- [ ] Payroll/employer registrations where required.
- [ ] Equity documents only if a valid plan/authorization exists.
- [ ] Security/access onboarding and offboarding.
- [ ] Policies appropriate to actual company stage and jurisdiction.

## 17. P0 before engaging a contractor with product access

- [ ] Verified contracting entity.
- [ ] Written contractor agreement.
- [ ] Classification reviewed where material.
- [ ] Confidentiality and work-product/IP rights addressed.
- [ ] Pre-existing materials/third-party code disclosure.
- [ ] OSS policy acknowledgement.
- [ ] Least-privilege access.
- [ ] Customer-data access separately approved if needed.
- [ ] Exit/return/deletion requirements.

## 18. P0 before institutional fundraising / diligence

Prepare a secure data room; do not place sensitive records in the public repo.

- [ ] Formation/governance documents.
- [ ] Current cap table tied to source instruments.
- [ ] Board/shareholder/member approvals.
- [ ] Financing instruments/side letters.
- [ ] Option/equity plan and grants.
- [ ] Founder/employee/contractor IP assignment evidence.
- [ ] Trademark/domain records.
- [ ] Material customer/vendor contracts.
- [ ] Privacy/security policies and material incidents/disclosures.
- [ ] OSS/SBOM/license compliance evidence.
- [ ] Financial statements/ledger.
- [ ] Tax filings/registrations.
- [ ] Material employment/contractor matters.
- [ ] Litigation/disputes/claims register, if any, with counsel.
- [ ] Insurance evidence, if any.

Do not state “clean cap table”, “all IP assigned”, “no litigation”, “tax compliant”, or similar diligence conclusions unless the records and advisers support them.

---

## 19. Prioritized implementation backlog

### P0 — block paid enterprise / hiring / financing where applicable

1. **Verify corporate identity and jurisdiction.**
   - owner: Founder + corporate counsel;
   - output: authoritative corporate fact register;
   - current: `UNKNOWN`.
2. **Complete IP chain-of-title review and assignments.**
   - founder/pre-incorporation, contractors, employees, brand assets, domain;
   - current: `UNKNOWN`.
3. **Resolve public-repository outbound licensing posture.**
   - no license should be added until ownership/business/legal decision is made;
   - current: `DECISION REQUIRED`.
4. **Create counsel-approved contract baseline.**
   - MSA, order form, DPA process, NDA, pilot, contractor, employment IP/confidentiality;
   - current: templates not verified as executed/approved.
5. **Establish signature authority.**
   - current: `UNKNOWN`.
6. **Build vendor/provider legal register.**
   - distinguish code-supported/configured/active/contractually approved;
   - include AI provider/data-use terms.
7. **Run Terms/Privacy/Subprocessors claim review against production.**
   - preserve current conservative language;
   - investigate every factual analytics/provider/security claim before paid launch.
8. **Add OSS license-obligation workflow.**
   - retain existing SBOM/provenance;
   - add license scan/manual escalation/attribution process.
9. **Verify tax/billing entity before paid checkout.**
   - keep existing fail-closed billing gate until real.

### P1 — enterprise scale

- contract repository/CLM metadata and renewal alerts;
- clause playbook and deviation approvals;
- standardized security questionnaire evidence library;
- customer-specific subprocessor commitment tracking;
- trademark clearance/filing strategy;
- domain/social asset register;
- corporate filing calendar after jurisdiction is known;
- worker onboarding/offboarding legal packet;
- board/consent/document numbering discipline;
- vendor renewal/terms-change reviews;
- customer obligation register connected to operations.

### P2 — scale automation

- automated contract-obligation reminders;
- automated processor-change impact analysis;
- automated public-claim staleness checks;
- automated OSS license-report diff per release;
- trademark watch/renewal workflow when commercially justified;
- diligence-room index generator;
- enterprise security/legal evidence export generated from approved records rather than free-form answers.

---

## 20. Counsel decision log schema

Never bury legal decisions in chat or a one-off email.

| Field | Description |
| --- | --- |
| Decision ID | Stable ID |
| Topic | Corporate / IP / contract / privacy / employment / trademark / OSS / tax interface |
| Question | Narrow decision requested |
| Relevant entity/jurisdiction | Verified or `UNKNOWN` |
| Product/customer context | Why decision is needed |
| Evidence reviewed | Links/IDs |
| Counsel/adviser | Name/firm in secure register |
| Date | Decision date |
| Decision | Approved operational summary; avoid publishing privileged detail |
| Approved language/template version | Exact controlled artifact |
| Conditions | Scope/limitations |
| Expiry/revisit trigger | Law/product/vendor/business change |
| Implemented by | Owner |
| Verification | Evidence that implementation matches decision |

Keep privileged legal advice in the appropriate secure legal system; this schema can store the operational result without exposing privileged analysis.

---

## 21. Corporate evidence register schema

| Field | Description |
| --- | --- |
| Evidence ID | Stable ID |
| Fact/control | What it proves |
| Status | Verified / unknown / expired / superseded |
| Source type | Registry / signed agreement / board record / vendor account / repo evidence |
| Issuer | Source authority |
| Entity | Applicable entity |
| Jurisdiction | If applicable |
| Effective date | If applicable |
| Expiration/review date | If applicable |
| Secure source location | Link/reference, not public secret |
| Public-safe statement | Exact approved external wording |
| Owner | Accountable person |
| Last verified | Timestamp |

---

## 22. Contract record schema

| Field | Description |
| --- | --- |
| Agreement ID | Stable ID |
| Counterparty | Verified legal entity |
| Foremention entity | Verified contracting entity |
| Agreement type | MSA / order / DPA / NDA / pilot / vendor / employment / contractor / partner / referral |
| Version | Controlled template/version |
| Status | Draft / negotiation / approved / sent / partially signed / executed / terminated / expired |
| Effective date | From executed document |
| Term / renewal | Exact terms |
| Notice deadline | Derived from exact terms |
| Monetary terms | Secure field as appropriate |
| Security/privacy obligations | Structured deviations |
| SLA obligations | Structured; none if no SLA |
| IP/data deviations | Structured |
| Approvals | Internal approvals |
| Signatories | Verified signers |
| Source document | Secure location |
| Operational tasks | Provisioning/notices/reviews |
| Owner | Commercial/legal owner |

A draft must never be rendered in the product as “signed”, “accepted”, or “active”.

---

## 23. Legal-safe product architecture principles

Foremention should encode legal truth into product operations without trying to automate legal judgment.

### Build/enforce

- version IDs on Terms/Privacy/DPA/security documents;
- customer assent/signature evidence where applicable;
- immutable link from entitlement/provisioning to the commercial authorization that created it;
- customer-specific processor commitments;
- contract obligation and renewal reminders;
- signature authority/approval checks in back-office workflow;
- public claim registry with evidence expiration;
- vendor activation states;
- data deletion/export operations that match public/contractual language;
- audit logs for administrative and contract-related state changes;
- secure document access boundaries.

### Do not automate as fact

- legal entity selection;
- governing law;
- controller/processor determination;
- employment classification;
- beneficial ownership;
- tax nexus/registration obligations;
- trademark availability;
- license compatibility;
- indemnity/liability acceptability;
- legal breach-notice requirements.

Software can route and evidence those decisions; qualified people must make them.

---

## 24. Red-team scenarios

Before declaring this foundation operational, test these cases:

1. **Sales asks for a company registration number.** System returns `UNKNOWN / request authoritative evidence`, not a guessed number.
2. **Customer asks if Foremention is SOC 2 certified.** Response states the verified status and does not convert CI controls into certification.
3. **A new AI adapter is merged.** It remains `CODE-SUPPORTED`; it does not automatically appear as an active subprocessor or process customer data.
4. **Customer signs a special 24-hour subprocessor notice clause.** That obligation becomes a customer-specific operational task before provider activation.
5. **A contractor opens a PR containing copied code.** Contribution is blocked pending provenance/license review.
6. **A dependency introduces AGPL/custom source-available terms.** CI/legal workflow escalates rather than silently shipping.
7. **A founder wants to add an MIT license to the public repository.** Change is blocked until IP ownership and outbound-license strategy are approved.
8. **Marketing wants to write “GDPR compliant”.** Claim is blocked unless counsel defines and approves the exact scoped statement.
9. **Customer requests 99.9% SLA.** No percentage is promised until engineering evidence, support capacity, economics, and counsel-approved SLA exist.
10. **Investor asks whether all IP is assigned.** Answer is derived from executed assignment evidence, not Git history.
11. **A new logo is uploaded.** Trademark/provenance register requires creator/source/license/assignment before ownership claims.
12. **An order form is signed by an operator.** Provisioning blocks unless that signer has verified authority.
13. **The privacy notice says an analytics tool is opt-in but configuration becomes default-on.** Release is blocked until behavior/copy/consent are reconciled.
14. **A provider changes its data-use terms.** Vendor review reopens before materially affected customer processing continues when required.
15. **A customer requests deletion.** Operational response distinguishes live-data deletion, documented backup lifecycle, contractual/legal holds, and actual product capability.

---

## 25. Definition of done

This corporate foundation is not “done” when templates exist. It is done when evidence and operations make false legal/commercial claims difficult.

Minimum completion standard:

- corporate facts are externally verified and versioned;
- signatories have documented authority;
- the company can prove chain of title to core IP;
- worker/contributor IP controls exist before new contributions;
- contracts have counsel-approved baselines and version control;
- procurement cannot reach provisioning without the required approvals/signature;
- public Terms/Privacy/Subprocessors match actual production behavior;
- every material security/privacy claim has evidence and an owner;
- trademark/domain/brand provenance is recorded;
- repository outbound licensing is an intentional approved decision;
- release SBOM is retained and license obligations are reviewed;
- high-risk/unknown third-party terms are blocked or escalated;
- customer-specific legal/security obligations are converted into operational tasks;
- financing diligence facts come from source documents rather than founder memory.

Until those conditions are met, Foremention should continue the repository's existing conservative stance: **technical capability does not equal legal/commercial authority, and unknown legal facts remain unknown.**

---

## 26. Evidence references used for this audit

Repository paths inspected or relied upon:

- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `app/subprocessors/page.tsx`
- `app/sitemap.ts`
- `components/enterprise-readiness.tsx`
- `SECURITY.md`
- `docs/PRIVATE-BETA-OPERATING-POLICY.md`
- `docs/integration-boundaries.md`
- `README.md`
- `package.json`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `public/brand/foremention-logo-white.svg`
- `public/brand/foremention-mark-white.svg`
- GitHub repository metadata for `injamhaqq/foremention`

### Explicitly not established by this audit

This audit does **not** establish or claim:

- that a Foremention legal entity exists;
- where such an entity is or should be incorporated;
- who its directors, shareholders, officers, or beneficial owners are;
- its registered address, company number, tax IDs, bank accounts, or filings;
- that any customer/vendor/worker agreement has been executed;
- that any attorney has approved the public Terms or Privacy notice;
- that any trademark has been searched, filed, or registered;
- that the founder/company owns every repository or brand asset;
- that any particular privacy law applies or has been fully satisfied;
- that every dependency/license obligation has been legally reviewed;
- that any certification, contractual SLA, insurance coverage, or regulatory status exists.

Those facts must come from the appropriate authoritative records and advisers.
