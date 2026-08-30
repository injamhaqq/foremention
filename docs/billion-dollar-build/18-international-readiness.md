# Foremention International Readiness

**Status:** International-expansion operating and architecture readiness record.

**Initial audit base:** `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` on 2026-08-30.

**Branch sync base:** `main` at `08d7f398ae89d0d69af4530af5ecc6c752f1a6c6` before PR creation.

**Scope:** Market-entry gates, localization architecture, multilingual buyer-question provenance, regional measurement, data governance/residency, international billing, regional benchmarks, and expansion sequencing.

**Product constitution:** `CLAUDE.md` remains authoritative for locked product, evidence, security, and release boundaries.

**Legal boundary:** This is an engineering and operating readiness framework, not legal, tax, accounting, payment-regulatory, or privacy-law advice.

This document intentionally does **not** translate the product, name a second country, claim international demand, claim GDPR/UK GDPR/other compliance, promise regional data residency, invent tax treatment, or turn a future market hypothesis into a launch commitment.

---

## 0. Truth vocabulary

Use these labels throughout international planning:

- **VERIFIED CURRENT** — directly supported by the current repository, product, or named operating source of truth.
- **UNKNOWN** — there is not enough verified evidence to make the claim.
- **OPERATING POLICY** — a rule adopted to govern future decisions; not evidence that an outcome already exists.
- **TARGET** — a desired future state or threshold; never report it as an actual.
- **FUTURE-GATED** — architecture that may be needed later but should remain unbuilt or disabled until a named trigger is met.
- **LEGAL REVIEW REQUIRED** — a question that must be resolved for the actual contracting entity, customer, processor configuration, and target jurisdiction before a customer-facing promise is made.

The default rule is simple: **unknown stays unknown**.

---

# A. Reality recovery — is international demand real?

## 1. Executive conclusion

**UNKNOWN — verified international customer demand is not established by the current repository.**

The current codebase proves meaningful technical preparation for measurement across locale and market contexts, but it does not prove that customers in any second country or language are asking Foremention to localize, contract, invoice, support, or host data regionally.

Therefore the correct present strategy is:

1. preserve the English-first product focus;
2. retain locale and market in measurement identity;
3. collect real market and language demand evidence through customer-research and commercial systems;
4. remove architecture traps that would make later expansion dangerous;
5. do **not** build broad UI translation, multi-region storage, local payment rails, or market-specific legal copy until a market passes the gates in this document.

## 2. Current evidence inventory

| Area | Verified state on recovered `main` | Readiness judgment |
| --- | --- | --- |
| Public/product language | `app/layout.tsx` fixes the current document language to `lang="en"`; current product copy is English-first | **VERIFIED CURRENT / intentionally focused** |
| Design-partner demand capture | `design_partner_applications` stores email, company, role, category, buyer questions, problem, plan interest, status, and source; it does not capture country, target market, preferred language, residency requirement, tax jurisdiction, or local-payment need | **VERIFIED CURRENT / insufficient to rank international demand** |
| Buyer-question locale | Prompt locale exists and later measurement records preserve locale | **VERIFIED CURRENT / useful foundation** |
| Measurement market | `market` exists on recurring measurement and relevant prompt/run snapshots | **VERIFIED CURRENT / useful foundation** |
| Recurring measurement timezone | An IANA timezone is stored and runtime-validated | **VERIFIED CURRENT / partial** |
| Comparable measurement | Exact comparison withholds movement unless question fingerprint, provider, model, methodology, locale, and market match | **VERIFIED CURRENT / strong foundation** |
| Provider request shape | `ProviderPrompt` has optional `locale` | **VERIFIED CURRENT / interface-ready** |
| Provider language/market capability registry | No canonical per-provider language, country, search-geography, regional-availability, or quality registry is established | **UNKNOWN / not ready to promise** |
| UI localization framework | No canonical translation catalog, locale router, or locale negotiation architecture is established | **FUTURE-GATED** |
| Date display | Some UI formatting is explicitly `en-US`; measurement schedule labels render in UTC rather than the schedule timezone | **VERIFIED CURRENT / partial international readiness** |
| Currency presentation | No canonical product-wide currency or price-book abstraction is established | **FUTURE-GATED** |
| Billing | Self-serve billing uses configured Stripe recurring Price IDs for Core/Signal and fails closed when configuration is absent | **VERIFIED CURRENT / single-contracting-setup posture** |
| Tax/VAT/GST | Private-beta policy requires real tax/entity/order-form facts before paid activation; no broad international tax engine is claimed | **UNKNOWN / LEGAL REVIEW REQUIRED** |
| Processor transparency | `/subprocessors` names operational providers while explicitly refusing to claim unverified DPAs, transfer mechanisms, data locations, certifications, or contractual terms | **VERIFIED CURRENT / correct truth boundary** |
| Regional storage/residency | No customer-selectable regional residency commitment or organization `home_region` contract is established | **FUTURE-GATED** |
| International benchmarks | No verified privacy-safe cross-customer regional benchmark product is established | **FUTURE-GATED** |

### Evidence sources reviewed

- `app/layout.tsx`
- `supabase/migrations/20260829000200_design_partner_applications.sql`
- `supabase/migrations/20260829000100_retention_loop_v1.sql`
- `lib/measurement-schedules.ts`
- `lib/jobs/measurement-schedule-dispatcher.ts`
- `lib/retention-loop.ts`
- `lib/providers/types.ts`
- `lib/providers/index.ts`
- `components/measurement-schedule-control.tsx`
- `lib/stripe-billing.ts`
- `app/privacy/page.tsx`
- `app/subprocessors/page.tsx`
- `docs/PRIVATE-BETA-OPERATING-POLICY.md`
- `README.md`

## 3. Important current limitations

### 3.1 International-demand observability is incomplete

**VERIFIED CURRENT:** current design-partner intake cannot answer:

- which countries prospects operate in;
- which markets they want measured;
- which languages their buyer questions use;
- whether they need translated UI or only multilingual measurement;
- whether local invoicing, tax, or payment requirements are blockers;
- whether data residency is a contractual blocker;
- whether support hours or local-language support are required.

**OPERATING POLICY:** do not infer those attributes from email domain, IP address, company website, names, browser locale, or another weak proxy. Ask explicitly when the customer-research or commercial workflow needs the information.

### 3.2 Timezone is stored, but wall-clock semantics are incomplete

`lib/measurement-schedules.ts` validates the supplied IANA timezone but advances weekly, biweekly, and monthly recurrences using UTC date arithmetic. `components/measurement-schedule-control.tsx` formats displayed schedule dates with hard-coded `en-US` and `UTC`.

Foremention therefore should **not** claim that a recurring schedule preserves a specified local wall-clock time across daylight-saving transitions. Fix this only when local-time execution semantics are explicitly required and testable.

### 3.3 Locale metadata is not proven multilingual quality

`ProviderPrompt.locale` and measurement `locale`/`market` fields are provenance. They do not prove that:

- every configured provider supports that language equally;
- search or retrieval uses the intended country;
- returned sources are language-appropriate;
- the selected model is stable or available in that jurisdiction;
- extraction performs equally across scripts and languages;
- regional provider restrictions are equivalent;
- a translated question is semantically equivalent to its original.

Those claims require evaluation evidence.

---

# B. Market Expansion Framework

## 4. Market-entry rule

**OPERATING POLICY:** Foremention enters a new market because verified customer value justifies the complexity, not because a country is large, fashionable, nearby, English-speaking, or easy to add to a dropdown.

For Foremention, a market may be a combination of:

`commercial geography × buyer language × provider environment × contracting/tax environment × residency/support expectations`

A market is therefore not automatically identical to a country.

## 5. 100-point market scorecard

Score each candidate from 0–5 on every dimension, attach dated evidence, and convert the score to weighted points. A score without a source is **UNKNOWN**, not zero and not five.

| Criterion | Weight | What counts as evidence |
| --- | ---: | --- |
| Customer demand | 25 | Qualified discovery, accepted pilot request, existing-customer expansion request, lost-deal reason, signed or contracted demand |
| Revenue potential | 15 | Verified budget conversations, accepted commercial terms, reachable-account evidence, expansion value; not TAM theater alone |
| Provider coverage | 12 | Real provider/model availability, retrieval/search behavior, country/language support, stable configuration, cost and rate-limit viability |
| Language/evaluation quality | 10 | Golden-set results, extraction accuracy, citation/evidence quality, semantic consistency, reviewer confidence |
| Legal/privacy complexity | 10 | Counsel-reviewed contracting, privacy, transfer, and tax requirements for the actual company setup |
| Support burden | 7 | Timezone coverage, language need, onboarding burden, SLA/procurement expectations, customer-success complexity |
| Competitive landscape | 5 | Existing alternatives, differentiation, switching friction, local incumbents, adjacent categories |
| Payment/billing | 6 | Payment availability, invoicing expectations, billing currency, tax handling, payment-method blockers |
| Data residency/processor constraints | 7 | Storage/processing-region requirements, cross-border restrictions, procurement requirements, processor availability |
| Localization cost | 3 | UI/content/legal/support translation, QA, RTL/text expansion, local documentation, maintenance burden |
| **Total** | **100** | |

### Score interpretation

These bands are **OPERATING POLICY**, not forecasts:

- **80–100:** candidate may proceed to formal launch-readiness review if all hard gates pass.
- **65–79:** run targeted discovery and evaluation; do not market the market as broadly supported.
- **Below 65:** remain opportunistic/founder-served or defer.
- **UNKNOWN-heavy:** gather evidence; do not manufacture precision.

## 6. Hard gates that override the score

A market does not launch, even with a high aggregate score, when a required hard gate is unresolved.

### Demand gate

At least one evidence-backed demand condition chosen by leadership must be true, for example:

- a contracted or contract-ready anchor customer has a real requirement for the market; or
- multiple qualified accounts independently request the same capability and the commercial owner judges the opportunity repeatable.

Do not hard-code a universal logo count into application code. Enterprise expansion can be justified by one valuable anchor; lower-value motions may require many independent signals.

### Product-quality gate

- a representative buyer-question evaluation set exists;
- the selected provider/model can execute it reliably;
- citation and evidence extraction have been tested in the target language and market;
- qualified human reviewers can assess output quality;
- refusal, error, and partial-result behavior are understood;
- cross-language movement is not marketed as directly comparable without a validated methodology.

### Commercial gate

- the contracting entity is known;
- supported billing currency and invoice treatment are known;
- tax/VAT/GST handling has been reviewed for the actual sale;
- payment collection is operationally verified;
- refund, cancellation, and order-form terms are appropriate.

**LEGAL REVIEW REQUIRED.**

### Privacy/data-governance gate

- actual storage and processing locations are documented from real configuration/provider evidence;
- subprocessors for that customer are known;
- required DPA/transfer terms are reviewed;
- any residency promise is technically enforceable and contractually accurate;
- deletion and export obligations remain satisfiable.

**LEGAL REVIEW REQUIRED.**

### Support gate

- onboarding/customer-success ownership is explicit;
- required working-hour overlap is acceptable;
- language expectations are explicit;
- escalation is documented;
- support cost does not silently destroy contribution margin.

---

# C. Demand Evidence System

## 7. What to capture before translating anything

**FUTURE-GATED instrumentation, not a mandate to lengthen the public form immediately.**

The customer-research/commercial source of truth should eventually be able to record:

- `operating_country` — where the account operates, when relevant;
- `target_measurement_markets[]` — markets the customer wants measured;
- `buyer_question_languages[]` — languages used by buyers;
- `ui_language_requirement` — none / nice-to-have / required;
- `support_language_requirement`;
- `billing_currency_requirement`;
- `invoice_tax_requirement` or structured blocker notes;
- `data_residency_requirement` — none / preferred / contractual / unknown;
- `required_storage_region` when contractually specified;
- `required_processor_constraints`;
- `market_blocker_type` — product quality / provider / billing / legal / privacy / support / localization / other;
- `evidence_source` — interview / opportunity / customer request / lost deal / renewal / procurement / support;
- `observed_at` and owner.

**OPERATING POLICY:** these are customer/company demand fields, not attributes to infer silently from a browser.

## 8. Demand signal hierarchy

Rank signals by evidence strength:

1. **Contracted requirement** — signed customer requirement or approved order-form scope.
2. **Paid/accepted pilot requirement** — budget or terms are committed contingent on the capability.
3. **Existing-customer expansion request** — a retained customer asks for the market/language.
4. **Qualified-opportunity blocker** — a real opportunity cannot advance without the capability.
5. **Repeated discovery request** — multiple ICP-fit prospects independently report the same need.
6. **Unqualified inbound interest** — directional only.
7. **Search volume, social chatter, or competitor presence** — contextual only, not customer demand by itself.

Market entry should be led by levels 1–5, not level 7.

---

# D. Localization Architecture

## 9. Current posture

**VERIFIED CURRENT:** Foremention is English-first. Keep it that way until demand says otherwise.

Internationalization readiness and localization are different:

- **Internationalization readiness:** structure code and data so future locales do not corrupt product or measurement truth.
- **Localization:** translate/adapt UI, content, support, legal copy, emails, and commercial experience for a specific market.

Improve the first gradually. Trigger the second only for an evidence-backed market.

## 10. Future locale context

When a second UI locale becomes real, use one explicit request/user context instead of scattered browser defaults:

```text
ui_locale
content_language
timezone
measurement_market
measurement_language
currency_display
numbering_system
text_direction
```

Keep these concepts separate. A German-speaking user may measure the US market, report internally in EUR, and work in `Europe/Berlin`. A single `locale` field cannot safely represent all of that.

## 11. Date and time rules

- Store durable timestamps as UTC instants.
- Store schedule timezone separately using an IANA identifier.
- Render customer-facing dates/times through a centralized formatter using the relevant locale and timezone.
- Do not render customer-visible schedule dates in hard-coded UTC unless the UI explicitly labels them as UTC.
- When recurrence means a local wall-clock time, compute it in that timezone and test DST transitions.
- Keep observation time distinct from user display timezone.

## 12. Number and currency formatting

- Store numeric values as numeric values, never localized strings.
- Render separators and percentages through `Intl.NumberFormat` or a centralized equivalent.
- Store monetary amount together with ISO 4217 currency code.
- Never infer billing currency from browser locale or IP.
- Preserve the original billed/contracted amount and currency.
- If financial reporting converts currencies, retain the FX source, effective date, and conversion method separately.

## 13. Text expansion

Before adding a second UI language:

- remove fixed-width controls that assume short English labels;
- let buttons, navigation, and tables tolerate roughly 30–50% expansion where practical;
- avoid embedding translatable copy in raster images;
- preserve responsive behavior when labels wrap;
- test long organization, category, competitor, and buyer-question names separately from translated UI expansion.

This is a design stress test, not a commitment to a language.

## 14. RTL

**FUTURE-GATED:** do not build or claim RTL support until a validated market requires it.

When required:

- derive `dir` from locale context;
- prefer logical CSS properties such as `margin-inline`, `padding-inline`, and `inset-inline`;
- mirror directional icons only when semantically correct;
- test charts, tables, source relationships, and flows deliberately rather than blindly flipping layouts;
- include target-script, keyboard, screen-reader, and responsive QA.

## 15. Translation architecture when the gate is met

Use stable message keys/catalogs rather than translating source files ad hoc.

Required properties:

- source locale and catalog version;
- stable message keys;
- parameterized and pluralized messages;
- no concatenated English fragments that translators cannot reorder;
- visible fallback behavior for QA;
- translation provenance and review ownership;
- legal/contract copy isolated from ordinary product-copy translation;
- no machine-translated contractual commitment published without appropriate review.

AI may assist draft translation. It does not make production localization automatically correct.

---

# E. Multilingual Buyer Questions

## 16. Principle

A buyer question is measurement input, not merely UI text. Translation can alter intent, category terminology, geography, product terminology, and therefore model behavior.

Preserve the original question and every derived localized version. Do not overwrite one canonical string with its translation.

## 17. Future question-language provenance

The current locale/run snapshot model is a useful base. When multilingual demand is validated, extend the domain with a versioned concept similar to:

```text
question_family_id
question_version_id
original_text
original_language
localized_text
localized_language
measurement_market
translation_method
translation_provider
translation_model
translation_prompt_version
translated_at
translated_by
approved_by
semantic_equivalence
review_notes
```

Suggested `translation_method` values:

- `original`
- `customer_supplied`
- `human`
- `machine_assisted`

Suggested `semantic_equivalence` states:

- `unreviewed`
- `equivalent`
- `materially_changed`
- `rejected`

Do not add every field before demand exists. The non-negotiable future property is provenance: the original input must remain recoverable and a localized derivative must be distinguishable from it.

## 18. Semantic comparability rules

Default to **not comparable** when any material measurement identity changes, including:

- question text/version/fingerprint;
- buyer-question language;
- measurement market/geographic targeting;
- provider;
- exact model/version when material;
- methodology;
- retrieval/search configuration;
- locale when it changes provider behavior;
- other environment fields identified by evaluation.

The existing exact-comparison rule already protects question fingerprint, provider, model, methodology, locale, and market. Future multilingual work should strengthen that contract, not bypass it.

Even when a reviewer marks two translations semantically equivalent, do **not** automatically place different-language observations on one longitudinal trend line. Cross-language equivalence is a separate analytical claim that requires its own evaluation method.

## 19. Cross-language research reporting

Cross-language observations may be compared descriptively only when the report identifies:

- language;
- market;
- provider and model;
- methodology;
- question set;
- observation window;
- evidence/review status;
- relevant limitations.

Do not label such analysis as exact before/after movement unless the methodology actually supports that interpretation.

## 20. Multilingual evaluation set

Before a language becomes supported, create a privacy-safe golden set covering:

- category discovery;
- direct comparisons;
- alternatives/replacements;
- feature/use-case questions;
- pricing/value questions where relevant;
- ambiguous questions;
- branded and unbranded questions;
- locally natural terminology, not literal translation alone;
- diacritics, script, and punctuation edge cases;
- mixed-language/code-switched cases only when real customer use requires them.

Evaluate at minimum:

- provider request success;
- output-language adherence;
- recommendation/entity extraction accuracy;
- competitor-name normalization;
- citation URL extraction;
- source-language appropriateness;
- evidence retrievability;
- evidence-state classification;
- recommendation/action quality;
- reviewer agreement;
- false-comparability risk.

Quality is measured by language × market × provider × model. "Supports language X" on a vendor page is not Foremention quality evidence.

---

# F. Regional Measurement

## 21. Canonical measurement context

When geography or language can affect output, a Recommendation Record/observation should be interpretable from an immutable context tuple such as:

```text
organization
workspace_or_brand
question_version_or_fingerprint
question_language
locale
market
country_or_region_targeting
provider
provider_mode_or_retrieval_mode
model_and_version
methodology_version
relevant_search_or_tool_configuration
observation_timestamp
```

The current product already preserves several of these dimensions. Add missing dimensions only when provider/evaluation evidence shows that they materially affect the observation.

## 22. Market versus country versus region

Do not overload one free-text `market` indefinitely.

When real multi-market use appears, distinguish:

- `market_key` — a Foremention/customer business concept;
- `country_code` — ISO 3166-1 alpha-2 when a country is explicitly relevant;
- `region_code` — only when subnational targeting matters and a stable scheme is selected;
- `language_tag` — BCP 47;
- `provider_geo` — the actual provider/search geographic parameter or observed environment, when supported.

**FUTURE-GATED:** do not migrate historical `market = global` rows merely to make the schema look international. Historical defaults must remain truthfully interpretable.

## 23. Provider availability and quality registry

Before Market #2 launches, create a versioned capability registry only for providers, models, languages, and markets actually under evaluation.

Suggested fields:

```text
provider
model
market_or_country
language
api_available
search_or_retrieval_available
geo_targeting_mode
known_restrictions
citation_behavior
evaluated_at
evaluation_set_version
quality_status
cost_and_rate_limit_notes
evidence_links
```

Suggested evidence states:

- `not_evaluated`
- `evaluating`
- `supported_for_pilot`
- `supported`
- `degraded`
- `unsupported`

Never map "the API call succeeded once" to `supported`.

## 24. Comparison boundary

**OPERATING POLICY:** comparison identity is fail-closed.

If Foremention cannot prove that two regional measurements are genuinely comparable, show separate observations and explain the mismatch instead of manufacturing a delta.

Machine-readable withholding reasons should eventually include:

- `language_changed`
- `market_changed`
- `provider_changed`
- `model_changed`
- `retrieval_geography_changed`
- `methodology_changed`
- `question_version_changed`
- `review_missing`
- `provider_capability_unknown`
- `provider_capability_degraded`

---

# G. Global Data Governance + Residency

## 25. Current truth boundary

**VERIFIED CURRENT:** the public subprocessor page correctly treats its list as operational transparency, not proof that a DPA, transfer mechanism, data location, certification, or enterprise contract exists for every customer.

**VERIFIED CURRENT:** no canonical customer-selectable regional residency promise exists.

Preserve both boundaries.

## 26. Separate four concepts

Never use "data residency" as vague sales language. Track separately:

1. **Storage location** — where durable customer records and backups are stored.
2. **Processing location** — where application/provider processing occurs.
3. **Edge/transit location** — where requests may transit or be served.
4. **Contractual residency commitment** — the exact locations and conditions Foremention promises to a customer.

A regional database does not automatically make every processor regional. An edge network does not by itself answer a contractual residency question. Real architecture plus contract language determines the truth.

## 27. Future customer data-governance profile

When enterprise demand requires it, maintain an organization/customer governance profile similar to:

```text
data_governance_profile_id
organization_id
contracting_entity
home_storage_region
allowed_processing_regions
residency_requirement
cross_border_transfer_restrictions
restricted_processors
approved_processors
retention_policy_reference
delete_export_requirements
dpa_status
security_addendum_status
legal_review_reference
effective_at
```

Do not convert legal conclusions into application booleans inferred by software. The profile should reference reviewed customer and contract decisions.

## 28. Internal processor register

The public `/subprocessors` page can remain concise. Regional contracting eventually needs a richer internal processor register containing:

- provider/service;
- purpose;
- data categories;
- customer-data path;
- active/configuration-dependent status;
- storage locations when verified;
- processing locations when verified;
- subprocessor-chain source of truth;
- DPA status;
- transfer mechanism/status when legally relevant;
- customer notice or authorization requirements;
- last verification date;
- owner;
- evidence/document reference.

**LEGAL REVIEW REQUIRED** for legal-transfer conclusions and customer contractual language.

## 29. Regional storage trigger

Do **not** build multi-region tenant routing merely because enterprise buyers sometimes ask about residency.

Build it when all are true:

- a qualified or contracted customer requires it;
- the opportunity is commercially meaningful;
- provider architecture can satisfy the requirement end-to-end;
- backup, restore, deletion, export, and audit operations work per region;
- cross-region support/admin access is defined;
- engineering understands failure, recovery, and tenant-migration behavior;
- operational and gross-margin costs are acceptable.

When triggered, prefer explicit placement:

`organization -> home_region -> regional control/data plane`

and fail closed against accidental cross-region writes.

## 30. Residency acceptance tests

Before claiming a residency option:

- create a tenant in the target region;
- prove durable database/storage placement;
- prove application writes stay in the intended region;
- inventory provider calls that leave the region;
- verify backup and restore location;
- verify export and deletion behavior;
- verify logs, analytics, and error-monitoring boundaries;
- verify support/admin access controls;
- verify disaster-recovery behavior;
- verify the exact customer-facing statement against counsel-reviewed contract language.

Marketing is the final step, not the first.

---

# H. International Billing

## 31. Current state

**VERIFIED CURRENT:** Core/Signal checkout is configuration-driven through Stripe recurring Price IDs. Browser success redirects do not grant entitlements; verified asynchronous billing events control lifecycle state. Billing stays unavailable when configuration is incomplete.

**VERIFIED CURRENT:** private-beta policy requires approved entity, tax, order-form/terms, refund/cancellation, and production validation before real paid activation.

This is the correct foundation for international expansion: fail closed rather than guess.

## 32. Future price-book model

Do not retain one `package -> price_id` mapping after multiple currencies, entities, or market terms become real.

When demand requires it, move to a server-authoritative price-book concept such as:

```text
package_key
billing_provider
price_external_id
currency
interval
market_scope
contracting_entity
tax_behavior
active_from
active_until
status
```

The browser may select from server-approved offers. It must never author arbitrary amounts, currencies, tax treatment, Price IDs, organization IDs, or billing-customer IDs.

## 33. Billing currency rules

- Preserve original invoice and contract currency.
- Do not convert historical financial truth without retaining the original amount/currency and a separately sourced FX rate/date/method.
- Do not infer currency from IP or browser locale.
- A localized currency display does not prove Foremention can legally invoice/collect in that market.
- A payment provider supporting a currency does not prove Foremention's contracting entity and tax setup are ready to sell there.

## 34. Tax, VAT, and GST readiness

**LEGAL/TAX REVIEW REQUIRED.**

Before a market-specific paid launch, determine for the actual contracting entity and customer type:

- registration and collection obligations;
- tax-inclusive versus tax-exclusive pricing requirements;
- customer tax-ID handling;
- invoice fields and numbering requirements;
- applicable reverse-charge, self-assessment, or similar treatment;
- evidence needed for customer/business location;
- refund and credit-note handling;
- accounting and reconciliation ownership.

Do not build speculative country logic into product code before the actual requirement is known.

## 35. Local payment methods

Treat local payment support as a commercial conversion capability with ongoing operations cost.

Build only when:

- qualified opportunities are blocked by the payment method;
- the provider supports the method for the actual business/entity;
- settlement, refunds, disputes, and reconciliation are understood;
- fraud and chargeback risk are acceptable;
- finance can reconcile it.

Enterprise invoicing/manual contracts may remain the correct path long before self-serve local methods are justified.

---

# I. Regional Benchmarks

## 36. Benchmark principle

A regional benchmark is a statistical product, not a filtered dashboard.

**FUTURE-GATED:** do not publish or expose cross-customer regional benchmarks until sample size, contractual/consent basis, privacy, anonymization, methodology, language, market, provider environment, and interpretation are defensible.

## 37. Benchmark eligibility contract

A cohort should define at least:

```text
benchmark_version
metric_definition
market
language
provider
model_or_model_family_policy
methodology_version
observation_window
customer_and_cohort_eligibility
sample_n
minimum_publishable_n
anonymization_rule
consent_or_contract_rule
outlier_policy
missing_data_policy
uncertainty_method
created_at
```

`minimum_publishable_n` must be deliberately approved for the specific data, metric, and privacy risk. Do not hard-code an arbitrary universal sample threshold and label it statistically safe.

## 38. Required comparison conditions

Only compare benchmark records when the methodology says the following are compatible:

- sample definition;
- market;
- language;
- provider environment;
- model/version policy;
- question family/intent;
- observation window;
- evidence/review status;
- metric definition.

If compatibility is partial, label the result exploratory and withhold ranks/percentiles that imply unsupported precision.

## 39. Privacy rules

Before cross-customer benchmarking:

- establish an appropriate contractual or consent basis;
- exclude directly identifying customer content unless explicitly permitted;
- suppress small or uniquely identifying cells;
- prevent reverse identification through filters and dimensions;
- distinguish internal aggregate research from customer-visible benchmark rights;
- version cohort membership and deletion behavior;
- ensure customer deletion/contract changes can be handled under the agreed policy.

**LEGAL REVIEW REQUIRED** for the applicable basis and customer contract wording.

## 40. Statistical QA

Every published benchmark should expose enough context to prevent false certainty:

- `n`;
- observation window;
- cohort definition;
- provider/model/methodology constraints;
- exclusions and missingness;
- uncertainty interval or distribution when meaningful;
- whether the metric is descriptive or causal.

Foremention should normally remain descriptive. Never turn a sparse benchmark into a market-leader claim.

---

# J. Expansion Sequence — Market #2, #3, #4

## 41. Slots, not countries

There is not enough verified demand in the recovered repository to name country #2, #3, or #4 responsibly.

**Market #2, #3, and #4 are decision slots, not predetermined countries.** Each is selected only after the scorecard and hard gates are populated with real evidence.

## 42. Before Market #2

Goal: prove Foremention can support one adjacent market without losing primary-market PMF focus.

Required before launch:

- market-demand fields/reporting exist in the customer-research or commercial source of truth;
- candidate market has evidence-backed demand and an accountable commercial owner;
- provider/model evaluation is completed for the actual market and language requested;
- locale/market provenance remains part of Recommendation Records and comparison identity;
- schedule timezone/display semantics are hardened if local-time execution is part of the promise;
- contracting, tax, invoice, and billing path are reviewed;
- processor locations and data-governance requirements are reviewed;
- support ownership and working-hour expectations are documented;
- launch scope explicitly says what is **not** localized or supported.

**Preferred complexity profile — OPERATING POLICY:** among otherwise attractive opportunities, prefer the highest-demand market that can reuse the existing English UI and operating model. This does not preselect an English-speaking country; verified demand still wins.

Do not build before Market #2 unless the winning opportunity requires it:

- broad UI translation;
- multi-region storage;
- many local payment methods;
- regional benchmarks;
- country-specific product forks.

## 43. Before Market #3

Goal: prove expansion is repeatable rather than founder exception-handling.

In addition to Market #2 gates:

- Market #2 has real activation, retention, and commercial evidence, not signup volume alone;
- market onboarding/support playbook is reusable;
- provider evaluation can add a market without bespoke one-off scripts;
- capability registry exists and is versioned;
- customer-data processor/governance review is repeatable;
- finance can report original-currency revenue and costs without mixing currencies;
- market-specific terms/invoicing work has clear ownership;
- expansion has not degraded primary-market support or reliability.

Prefer adding **one major new complexity dimension at a time**. For example, add a new contracting/tax environment, materially different provider geography, or new billing currency rather than adding all of those plus a new UI language and residency commitment in one step unless the commercial case is exceptional.

## 44. Before Market #4

Goal: earn the right to enter a structurally different market.

Market #4 may be the first justified localization or residency leap, but only if demand dictates it.

If a new product language is required:

- translation catalogs/runtime exist;
- locale routing and fallback are tested;
- text expansion and accessibility QA pass;
- multilingual golden sets meet approved quality thresholds;
- question translation provenance is implemented;
- cross-language comparability remains fail-closed;
- local-language support ownership is defined;
- legal/product/support translation review process exists.

If residency is required:

- regional tenant placement exists;
- end-to-end location tests pass;
- backup/restore/delete/export/audit semantics are verified;
- processor and support access paths are documented;
- customer-facing residency language exactly matches architecture and contract.

If one market requires both a language leap and a residency leap, require explicit executive review of opportunity value, implementation cost, support cost, gross-margin impact, and strategic focus before commitment.

---

# K. International Readiness Backlog

## 45. Do now — no speculative market build

These actions improve truth without pretending demand exists:

1. Keep `locale` and `market` in exact measurement/comparison identity.
2. Keep UI/product English-first.
3. Route international-demand discovery into customer-research/commercial systems rather than infer geography.
4. Treat provider multilingual/regional quality as unevaluated until a versioned test proves it.
5. Preserve public processor and data-location truth boundaries.
6. Keep billing fail-closed until real entity, tax, and price configuration exists.
7. Record the timezone wall-clock/display limitation as a scheduling correctness item.
8. Keep benchmark capability future-gated.

## 46. Build when a Market #2 candidate emerges

- demand fields and market report;
- market scorecard decision record;
- target-market provider capability evaluation;
- golden buyer-question/evidence set;
- regional measurement-context normalization where materially required;
- schedule timezone semantics fix if local-time execution is promised;
- contracting/privacy/tax/residency checklist;
- support and cost model.

## 47. Build when the first translated UI is justified

- locale resolver and translation catalogs;
- centralized date, time, number, and currency formatters;
- locale-aware metadata/SEO only for real localized public pages;
- translated product/system email workflow;
- translation QA and provenance;
- text-expansion and target-script accessibility suite;
- RTL only if the target language needs it.

## 48. Build when the first residency commitment is justified

- tenant `home_region`/regional placement model;
- regional database/storage/control-plane strategy;
- cross-region write protection;
- region-aware backup, restore, deletion, and export;
- regional observability and admin/support controls;
- residency acceptance tests;
- contract language reviewed against verified architecture.

## 49. Build when cross-customer benchmarks are justified

- consent/contract policy;
- anonymized cohort builder;
- minimum-cell suppression;
- versioned benchmark definitions;
- statistical QA and uncertainty reporting;
- market/language/provider/methodology comparability gates;
- deletion and recomputation policy.

---

# L. Decision Records

## 50. International market decision template

Create one record per candidate market:

```markdown
# Market decision — <market key>

Status: researching | pilot-only | approved | deferred | retired
Decision date:
Owner:

## Demand evidence
- sources:
- qualified accounts:
- contracted requirement:
- expansion requests:
- lost-deal evidence:

## Scorecard
- customer demand:
- revenue potential:
- provider coverage:
- language quality:
- legal/privacy complexity:
- support burden:
- competitive landscape:
- payment/billing:
- data residency:
- localization cost:
- total:

## Hard gates
- product quality:
- billing/tax:
- legal/privacy:
- residency/processors:
- support:

## Explicit launch scope
Supported:
Not supported:

## Required changes
- product:
- data/model:
- provider:
- billing:
- privacy/legal:
- support:

## Economics
Known direct costs:
Unknowns:

## Decision
Proceed / pilot only / defer.
Reason:
Review date:
```

## 51. International capability truth table

Maintain a living table only after more than one market exists:

| Capability | Primary market | Market #2 | Market #3 | Market #4 |
| --- | --- | --- | --- | --- |
| UI language | English | UNKNOWN | UNKNOWN | UNKNOWN |
| Buyer-question language | English-first / locale metadata supported | UNKNOWN | UNKNOWN | UNKNOWN |
| Provider/model quality | Evaluate per configured provider/model | UNKNOWN | UNKNOWN | UNKNOWN |
| Search/retrieval geography | Provider-specific / not globally promised | UNKNOWN | UNKNOWN | UNKNOWN |
| Billing currency | Configured billing-provider price truth only | UNKNOWN | UNKNOWN | UNKNOWN |
| Tax treatment | Requires actual setup | UNKNOWN | UNKNOWN | UNKNOWN |
| Data residency | No customer-selectable promise | UNKNOWN | UNKNOWN | UNKNOWN |
| Support language/hours | Current operating setup | UNKNOWN | UNKNOWN | UNKNOWN |
| Benchmark eligibility | Not launched | UNKNOWN | UNKNOWN | UNKNOWN |

Never replace `UNKNOWN` with a flag icon or green check because a vendor marketing page says it supports a country.

---

# M. QA + Release Gates

## 52. Internationalization regression tests when relevant

A market/language feature should add focused automated tests for:

- locale parsing and fallback;
- timezone validation;
- DST/local-wall-clock scheduling when promised;
- date, number, and currency formatting;
- long-string/text-expansion layout;
- language-tag and market validation;
- buyer-question provenance persistence;
- run snapshot preservation;
- comparison withholding when language/market differs;
- provider capability status gating;
- tenant/region isolation if residency exists;
- billing price-book server authority;
- benchmark cohort suppression and privacy rules.

## 53. Manual acceptance

For every launched locale or market:

- use a qualified target-language reviewer when a new language is involved;
- use a real target-market buyer-question set;
- test desktop, mobile, reflow, keyboard, and accessibility behavior;
- inspect provider answers, citations, evidence, and limitations;
- test refusal, error, and partial-result handling;
- verify local-time display when promised;
- verify invoice/payment journey when enabled;
- review privacy and subprocessor statements;
- rehearse support escalation;
- review the exact customer-facing capability statement.

## 54. Release claim rule

No market is "supported" merely because:

- the website is reachable there;
- a payment provider accepts a card there;
- a model can answer in the language;
- a database vendor offers a region there;
- a translation was generated;
- one provider call succeeded;
- one prospect asked for it.

A supported market has an explicit launch decision, product-quality evidence, commercial/legal path, data-governance answer, support owner, and truthful published scope.

---

# N. Recommended Current Decision

## 55. Decision as of recovered `main`

**OPERATING POLICY — stay focused on the existing English-first beachhead while improving evidence collection for future market selection.**

- **UNKNOWN:** Market #2.
- **UNKNOWN:** Market #3.
- **UNKNOWN:** Market #4.
- **UNKNOWN:** first translated UI language.
- **UNKNOWN:** first additional billing currency.
- **UNKNOWN:** first customer-selectable data-residency region.

The product is **partially international-ready at the measurement-provenance layer** because locale, market, and timezone context exist and exact comparisons already fail closed across locale/market changes. It is **not internationally commercialized** because market demand, provider quality by region/language, legal/tax setup, residency, support, and localization are not proven.

That is the correct state for the present company stage.

## 56. No runtime changes in this Chat 18 pass

This branch intentionally adds the readiness operating document only.

Reasons:

- broad localization would be premature;
- international demand is not yet measurable enough to select a market;
- multi-currency and residency work depend on real commercial/legal requirements;
- concurrent customer-research/commercial work is the appropriate place to capture demand evidence rather than duplicating schemas here;
- existing locale/market comparability foundations are already useful and should not be rewritten without a concrete failing requirement.

The only implementation issue elevated by this audit is the timezone wall-clock/display limitation described above. Fix it as a focused scheduling correctness change when local-time semantics are specified and tested; do not hide it behind an "international" marketing claim.

## 57. Definition of ready for the next international decision

Foremention is ready to choose Market #2 when it can answer, with cited evidence rather than intuition:

1. Which qualified customers are asking for this market?
2. What revenue or retention opportunity is attached to the request?
3. Which exact providers/models work there and how well?
4. Which buyer-question language and retrieval geography are required?
5. Can Foremention preserve comparison integrity?
6. What must change in product and support?
7. What are the real contracting, tax, invoice, payment, privacy, processor, and residency requirements?
8. Can those requirements be satisfied without unsafe claims or tenant/data leakage?
9. What does the market cost to launch and support?
10. What evidence would cause Foremention to defer or exit?

Until those answers exist, the strategically correct international feature is **discipline**.
