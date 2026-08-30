# Foremention International Readiness

**Status:** international-expansion operating and architecture readiness record.  
**Recovered base:** `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` on 2026-08-30.  
**Scope:** market-entry gates, localization architecture, multilingual buyer-question provenance, regional measurement, data governance/residency, international billing, regional benchmarks, and expansion sequencing.  
**Product constitution:** `CLAUDE.md` remains authoritative for locked product/evidence/security boundaries.  
**Legal boundary:** this document is an engineering/operating readiness framework. It is not legal, tax, accounting, immigration, payment-regulatory, or privacy-law advice.

This document intentionally does **not** translate the product, name a second country, claim international demand, claim GDPR/UK GDPR/other compliance, promise regional data residency, invent tax treatment, or turn a future market hypothesis into a launch commitment.

---

## 0. Truth vocabulary

Use these labels throughout international planning:

- **VERIFIED CURRENT** — directly supported by the current repository/product operating boundary.
- **UNKNOWN** — the repository does not contain enough verified evidence to make the claim.
- **OPERATING POLICY** — a rule adopted to govern future decisions; not evidence that an outcome exists.
- **TARGET** — a desired future state or threshold; never report it as an actual.
- **FUTURE-GATED** — architecture that may be needed later but should remain unbuilt or disabled until the named gate is met.
- **LEGAL REVIEW REQUIRED** — a question that must be resolved for the actual contracting entity, customer, processor configuration, and target jurisdiction before a customer-facing promise is made.

The default rule is simple: **unknown stays unknown**.

---

# A. Reality recovery — is international demand real?

## 1. Executive conclusion

**UNKNOWN — verified international customer demand is not established by the current repository.**

The current codebase proves meaningful *technical preparation* for measurement across locale/market contexts, but it does not prove that customers in any second country or language are asking Foremention to localize, contract, invoice, support, or host data regionally.

Therefore the correct present strategy is:

1. preserve the English-first product focus;
2. retain locale/market in measurement identity;
3. collect real market/language demand evidence through the customer-research/commercial systems;
4. remove architecture traps that would make later expansion dangerous;
5. do **not** build broad UI translation, multi-region storage, local payment rails, or market-specific legal copy until a market passes the entry gates in this document.

## 2. Current evidence inventory

| Area | Verified state on recovered `main` | Readiness judgment |
| --- | --- | --- |
| Public/product language | `app/layout.tsx` fixes the current document language to `lang="en"`; current product copy is English-first | **VERIFIED CURRENT / intentionally focused** |
| Design-partner demand capture | `design_partner_applications` stores email, company, role, category, buyer questions, problem, plan interest, status, and source; it does **not** capture country, target market, preferred language, residency requirement, tax jurisdiction, or local-payment need | **VERIFIED CURRENT / insufficient to rank international demand** |
| Buyer-question locale | Prompt locale already exists; later measurement records preserve locale | **VERIFIED CURRENT / useful foundation** |
| Measurement market | `market` is stored on prompts, prompt versions/run selections where present, and measurement schedules | **VERIFIED CURRENT / useful foundation** |
| Recurring measurement timezone | An IANA timezone is stored and runtime-validated | **VERIFIED CURRENT / partial** |
| Comparable measurement | Exact-comparison logic withholds movement unless question fingerprint, provider, model, methodology, locale, and market match | **VERIFIED CURRENT / strong foundation** |
| Provider request shape | `ProviderPrompt` has optional `locale` | **VERIFIED CURRENT / interface-ready** |
| Provider language/market capability registry | No canonical per-provider language, country, search-geography, regional-availability, or quality certification registry is established | **UNKNOWN / not ready to promise** |
| UI localization framework | No canonical translation catalog/router/locale negotiation architecture is established | **FUTURE-GATED** |
| Date display | Some UI formatting is explicitly `en-US`; measurement schedule date labels are rendered in UTC instead of the schedule timezone | **VERIFIED CURRENT / partial international readiness** |
| Currency presentation | No canonical product-wide currency/price-book abstraction is established | **FUTURE-GATED** |
| Billing | Current self-serve billing uses configured Stripe recurring Price IDs for Core/Signal and intentionally fails closed when real billing configuration is absent | **VERIFIED CURRENT / single-contracting-setup posture** |
| Tax/VAT/GST | Current private-beta policy explicitly requires real tax/entity/order-form facts before paid activation; no broad international tax engine is claimed | **UNKNOWN / LEGAL REVIEW REQUIRED** |
| Processor transparency | `/subprocessors` names operational providers while explicitly refusing to claim DPAs, transfer mechanisms, data locations, certifications, or contractual terms that are not verified | **VERIFIED CURRENT / correct truth boundary** |
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
- whether a request is for translated UI versus multilingual measurement;
- whether local invoicing/tax/payment requirements are blockers;
- whether data residency is a contractual blocker;
- whether support hours or local-language support are required.

**OPERATING POLICY:** do not infer those attributes from email domain, IP address, company website, names, browser locale, or any other weak proxy. Ask explicitly when the research/commercial workflow needs the information.

The dedicated customer-research/commercial systems should eventually make these fields measurable without turning the public form into a long immigration/customs questionnaire. Recommended internal demand fields are defined in Section 6.

### 3.2 Timezone is stored, but wall-clock semantics are not yet complete

`lib/measurement-schedules.ts` validates the supplied IANA timezone but advances weekly/biweekly/monthly recurrences using UTC date arithmetic. `components/measurement-schedule-control.tsx` also formats displayed schedule dates using hard-coded `en-US` and `UTC`.

This means Foremention should **not** claim that a schedule preserves a specific local wall-clock time across daylight-saving transitions. The issue is not a reason to build global localization now, but it is a concrete scheduling-hardening item before a customer contract depends on local-time execution semantics.

### 3.3 Locale metadata is not the same as proven multilingual quality

`ProviderPrompt.locale` and measurement `locale`/`market` fields are provenance. They do **not** prove that:

- every configured provider supports that language equally;
- web-search/retrieval uses the intended country;
- returned sources are language-appropriate;
- the model used is stable/available in that jurisdiction;
- recommendation extraction performs equally across scripts/languages;
- provider safety or regional restrictions are equivalent;
- a translated question is semantically equivalent to the original.

Those claims require evaluation evidence.

---

# B. Market Expansion Framework

## 4. Market-entry rule

**OPERATING POLICY:** Foremention enters a new market because verified customer value justifies the complexity—not because a country is large, fashionable, nearby, English-speaking, or easy to list in a dropdown.

A "market" is not automatically a country. For Foremention it may be a combination of:

`commercial geography × buyer language × provider environment × contracting/tax environment × residency/support expectations`

Two customers in the same country may therefore require different launch work; two countries may be operationally similar enough to share a market configuration.

## 5. 100-point market scorecard

Score each candidate from 0–5 for every dimension, attach dated evidence, and calculate weighted points. A score without a source is **UNKNOWN**, not zero and not five.

| Criterion | Weight | What counts as evidence |
| --- | ---: | --- |
| Customer demand | 25 | Qualified inbound/outbound discovery, accepted pilot request, existing-customer expansion request, lost-deal reason, signed/contracted demand |
| Revenue potential | 15 | Verified budget conversations, accepted commercial terms, realistic reachable-account set, expansion value; never market-size theater alone |
| Provider coverage | 12 | Real provider/model availability, retrieval/search behavior, country/language support, stable configuration, cost/rate-limit viability |
| Language/evaluation quality | 10 | Golden-set results, extraction accuracy, citation/evidence quality, semantic consistency, reviewer confidence |
| Legal/privacy complexity | 10 | Counsel-reviewed contracting/privacy/transfer/tax requirements for the actual company setup |
| Support burden | 7 | Timezone coverage, language needs, implementation burden, SLA/procurement expectations, customer-success complexity |
| Competitive landscape | 5 | Whether buyer pain is already well served, differentiation, switching/friction, local incumbents and adjacent categories |
| Payment/billing | 6 | Stripe/payment availability, invoicing expectations, supported billing currency, tax handling, payment-method blockers |
| Data residency/processor constraints | 7 | Storage/processing-region requirements, cross-border restrictions, procurement requirements, processor availability |
| Localization cost | 3 | UI/content/legal/support translation, QA, RTL/text expansion, local docs, maintenance burden |
| **Total** | **100** | |

### Score interpretation

These bands are **OPERATING POLICY**, not forecasts:

- **80–100:** candidate can proceed to formal launch-readiness review if all hard gates pass.
- **65–79:** run targeted discovery/evaluation; do not market as supported broadly yet.
- **<65:** remain opportunistic/founder-served only or defer.
- **UNKNOWN-heavy score:** collect evidence; do not manufacture precision.

## 6. Hard gates that override the score

A market does not launch even with a high aggregate score if any required gate is unresolved.

### Demand gate

At least one of the following must be true as an explicit **TARGET** chosen by leadership for that launch:

- a contracted/contract-ready anchor customer has a real requirement for that market; or
- multiple qualified accounts independently request the same market capability and the commercial owner judges the opportunity repeatable.

Do not hard-code a universal logo count into product code. Keep the threshold in the market-entry decision record because enterprise market expansion can be justified by one high-value anchor while SMB expansion may require many signals.

### Product-quality gate

- representative buyer-question evaluation set exists;
- selected provider/model can execute it reliably;
- citation/evidence extraction has been tested in the target language/market;
- human reviewers can assess output quality;
- unsupported/refusal/error behavior is understood;
- no cross-language trend is marketed as directly comparable without methodology support.

### Commercial gate

- contracting entity is known;
- supported billing currency and invoice treatment are known;
- tax/VAT/GST handling has been reviewed for the actual sale;
- payment collection path is operationally verified;
- refund/cancellation/order-form terms are appropriate for the setup.

**LEGAL REVIEW REQUIRED.**

### Privacy/data-governance gate

- actual storage and processing locations are documented from providers/configuration;
- subprocessors for that customer are known;
- any required DPA/transfer terms are reviewed;
- residency promises, if any, are technically enforceable and contractually accurate;
- customer deletion/export obligations remain satisfiable in the chosen architecture.

**LEGAL REVIEW REQUIRED.**

### Support gate

- onboarding/customer-success owner is identified;
- required working-hour overlap is acceptable;
- language expectation is explicit;
- escalation path is documented;
- support cost does not silently erase margin.

---

# C. Demand Evidence System

## 7. What to capture before translating anything

**FUTURE-GATED instrumentation, not a mandate to expand the public form immediately.**

The customer-research/commercial source of truth should be able to record:

- `operating_country` — where the account operates from, if relevant;
- `target_measurement_markets[]` — markets the customer wants to measure;
- `buyer_question_languages[]` — languages used by buyers;
- `ui_language_requirement` — none / nice-to-have / required;
- `support_language_requirement`;
- `billing_currency_requirement`;
- `invoice_tax_requirement` or structured blocker notes;
- `data_residency_requirement` — none / preferred / contractual / unknown;
- `required_storage_region` when contractually specified;
- `required_processor_constraints`;
- `market_blocker_type` — product quality / provider availability / billing / legal / privacy / support / localization / other;
- `evidence_source` — interview, opportunity, customer request, lost deal, renewal, procurement questionnaire, support request;
- `observed_at` and owner.

**OPERATING POLICY:** these are customer/company demand fields, not product telemetry to infer silently from a browser.

## 8. Demand signal hierarchy

Rank signals by evidence strength:

1. **Contracted requirement** — signed customer requirement or approved order-form scope.
2. **Paid/accepted pilot requirement** — customer has committed budget/terms contingent on capability.
3. **Existing customer expansion request** — current retained customer asks for new market/language.
4. **Qualified opportunity blocker** — real deal cannot advance without capability.
5. **Repeated discovery request** — multiple ICP-fit prospects independently report the same need.
6. **Unqualified inbound interest** — useful directional signal only.
7. **Search volume/social chatter/competitor presence** — contextual evidence, never customer demand by itself.

Market entry should be led by levels 1–5, not by level 7.

---

# D. Localization Architecture

## 9. Current posture

**VERIFIED CURRENT:** Foremention is English-first. Keep it that way until demand says otherwise.

**OPERATING POLICY:** internationalization readiness and localization are separate work:

- **Internationalization readiness:** structure product code/data so new locales do not corrupt measurement truth.
- **Localization:** translate/adapt UI, content, support, legal copy, emails, and commercial experience for a specific market.

Foremention should improve the first gradually and trigger the second only for an evidence-backed market.

## 10. Future locale context

When a second UI locale becomes real, use one explicit request/user context rather than scattered browser defaults:

```text
ui_locale
content_language
timezone
measurement_market
measurement_language
currency_display
numbering_system (only if needed)
text_direction
```

Keep these concepts separate. A German-speaking user may measure the US market, use EUR for company reporting, and work in Europe/Berlin time. One `locale` string cannot safely represent all of that.

## 11. Formatting rules

### Dates and times

- Store durable timestamps as UTC instants.
- Store user/workspace schedule timezone separately as an IANA timezone.
- Render dates/times through a centralized formatter using the viewer/workspace locale and relevant timezone.
- Never format customer-visible schedule dates with hard-coded UTC unless the UI explicitly labels them as UTC.
- If a recurrence is defined as a local wall-clock time, compute recurrence in that timezone and test daylight-saving transitions.

### Numbers

- Store numeric values as numbers/decimals, never locale-formatted strings.
- Render separators/percentages through `Intl.NumberFormat` or the chosen centralized equivalent.
- Keep measurement percentages/data independent of UI formatting.

### Currency

- Store amount and ISO 4217 currency code together.
- Never infer billing currency from browser locale.
- Never convert historical contracted/billed amounts for financial truth without retaining original amount/currency and a separately sourced FX rate/date if reporting conversion is needed.

### Text expansion

Before adding a second UI language:

- remove fixed-width controls that assume short English labels;
- allow navigation/buttons/tables to tolerate roughly 30–50% expansion where practical;
- avoid embedding copy into images;
- keep responsive layouts usable when labels wrap;
- test long organization/category/question names separately from translated UI expansion.

This is a design stress-test, not a commitment to any language.

### RTL

**FUTURE-GATED:** do not build or claim RTL support until a validated market requires it.

When required:

- set `dir` from locale context;
- prefer logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`, etc.);
- mirror directional icons only when semantically correct;
- test charts/tables/source relationships deliberately rather than blindly flipping the whole UI;
- include real target-script QA and keyboard/accessibility review.

## 12. Translation architecture when the gate is met

Use message keys/catalogs instead of translating source files ad hoc.

Required properties:

- source locale and catalog version;
- stable message keys;
- translator/provenance metadata outside runtime bundles where appropriate;
- parameterized/pluralized messages;
- no concatenated English fragments;
- fallback behavior that is visible to QA;
- legal/contract copy isolated from product-copy translation workflows;
- no machine-translated legal commitment published without appropriate review.

**OPERATING POLICY:** AI may assist draft translation, but a translated production experience is a product artifact that needs QA and, where material, human review.

---

# E. Multilingual Buyer Questions

## 13. Principle

A buyer question is measurement input, not just UI text. Translation can change intent, category language, product terminology, geography, and therefore model behavior.

Foremention must preserve the original question and every derived localized version rather than overwriting one string.

## 14. Future question-language model

The current prompt/run locale fields are a useful base. When multilingual demand is validated, extend the domain with a versioned concept similar to:

```text
question_family_id
question_version_id
original_text
original_language          # BCP 47 language tag where useful
localized_text
localized_language
measurement_market
translation_method         # original | human | customer | machine_assisted
translation_provider
translation_model
translation_prompt_version
translated_at
translated_by / approved_by
semantic_equivalence       # unreviewed | equivalent | materially_changed | rejected
review_notes
```

Do not add every field before the product needs it. The non-negotiable future property is provenance: **the original question must remain recoverable and a localized version must be distinguishable from it.**

## 15. Semantic comparability rules

### Longitudinal comparison

Default to **not comparable** when any of the following changes:

- question text/version/fingerprint;
- buyer-question language;
- market/geographic targeting;
- provider;
- exact model/version when material;
- methodology;
- retrieval/search configuration;
- locale when it changes provider behavior;
- other measurement-environment fields identified by evaluation.

The existing exact-comparison rule already protects question fingerprint, provider, model, methodology, locale, and market. Future multilingual work should tighten that contract, not bypass it.

### Translation equivalence

Even if a reviewer marks translations semantically equivalent, do **not** automatically put English and translated observations on one longitudinal trend line. Treat cross-language equivalence as a separate analysis question unless an evaluation methodology explicitly validates it.

### Cross-language research

Cross-language results may be compared descriptively when the report clearly labels:

- language;
- market;
- provider/model;
- methodology;
- sample/query set;
- observation window;
- limitations.

Do not label that analysis as exact before/after movement.

## 16. Multilingual evaluation set

Before a language becomes supported, build a privacy-safe golden set that includes:

- category discovery questions;
- direct comparison questions;
- alternatives/replacement questions;
- feature/use-case questions;
- pricing/value questions where appropriate;
- ambiguous queries;
- branded/unbranded questions;
- locally natural terminology, not literal translation only;
- diacritics/script/punctuation edge cases;
- mixed-language/code-switched cases only when actual customers need them.

Evaluate at least:

- provider request success;
- output language adherence;
- recommendation/entity extraction accuracy;
- competitor-name normalization;
- citation URL extraction;
- source-language appropriateness;
- evidence retrievability;
- evidence-state classification;
- recommendation/action quality;
- reviewer agreement;
- false-comparability risk.

Quality must be measured by language/provider/model combination. "Provider supports language X" is not an evaluation result.

---

# F. Regional Measurement

## 17. Canonical measurement context

When geography/language can affect output, a Recommendation Record/observation should be interpretable from an immutable context tuple such as:

```text
organization
workspace/brand
question_version/fingerprint
question_language
locale
market
country/region targeting (when real)
provider
provider mode / retrieval mode
model + version/snapshot
methodology version
relevant tool/search configuration
observation timestamp
```

The current product already preserves several of these dimensions. Future expansion should normalize missing ones only when provider/evaluation evidence shows they materially affect outputs.

## 18. Market versus country versus region

Do not overload one free-text `market` forever.

When real multi-market use appears, distinguish:

- `market_key` — Foremention/customer business concept, e.g. a configured sales/measurement market;
- `country_code` — ISO 3166-1 alpha-2 when a country is explicitly relevant;
- `region_code` — only when subnational targeting matters and a stable scheme is chosen;
- `language_tag` — BCP 47;
- `provider_geo` — the actual provider/search geographic parameter or observed provider environment, when the provider supports one.

**FUTURE-GATED:** do not migrate existing `market = global` rows merely to look international. Historical defaults must remain truthfully interpretable.

## 19. Provider-availability registry

Before market #2 launches, create a versioned provider capability registry **only for providers/markets actually under evaluation**.

Fields should include:

```text
provider
model
market/country
language
api_available
search/retrieval_available
geo_targeting_mode
known_restrictions
citation_behavior
evaluated_at
evaluation_set_version
quality_status
cost/rate-limit notes
evidence_links
```

Statuses should be evidence states, for example:

- `not_evaluated`
- `evaluating`
- `supported_for_pilot`
- `supported`
- `degraded`
- `unsupported`

Never map "API call succeeded once" to `supported`.

## 20. Comparison boundary

**OPERATING POLICY:** comparison identity is fail-closed.

If Foremention cannot prove that two regional measurements are genuinely comparable, it should display separate observations and explain the mismatch rather than manufacture a delta.

Reasons to withhold should be machine-readable and reportable, including:

- language changed;
- market changed;
- provider/model changed;
- retrieval geography changed;
- methodology changed;
- question version changed;
- review missing;
- provider capability status degraded/unknown.

---

# G. Global Data Governance + Residency

## 21. Current truth boundary

**VERIFIED CURRENT:** the public subprocessor page correctly says its provider list is operational transparency, not a claim that a DPA, transfer mechanism, data location, certification, or enterprise contract exists for every customer.

**VERIFIED CURRENT:** no canonical customer-selectable regional residency promise exists.

Preserve both boundaries.

## 22. Separate four concepts

Never use "data residency" as a vague sales phrase. Track separately:

1. **Storage location** — where durable customer records/backups are stored.
2. **Processing location** — where application/provider processing may occur.
3. **Edge/transit location** — where requests may traverse or be served.
4. **Contractual residency commitment** — the exact locations/conditions Foremention promises to a customer.

A regional database does not automatically mean all processing is regional. An edge network does not automatically violate a residency requirement. The contract and real provider architecture determine the answer.

## 23. Future customer data-governance profile

When enterprise demand requires it, maintain an organization/customer governance profile:

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
delete/export requirements
dpa_status
security_addendum_status
legal_review_reference
effective_at
```

Do not put legal conclusions into booleans generated by application code. The profile should reference reviewed customer/contract decisions.

## 24. Processor register

The customer-facing `/subprocessors` page can remain concise. Internally, future regional contracting requires a more rigorous processor register containing:

- provider/service;
- purpose;
- data categories;
- customer-data path;
- active/configuration-dependent status;
- storage locations if verified;
- processing locations if verified;
- subprocessor chain/source of truth;
- DPA status;
- transfer mechanism/status when legally relevant;
- customer notice/approval requirement;
- last verification date;
- owner;
- evidence URL/document.

**LEGAL REVIEW REQUIRED** for transfer/legal-mechanism fields.

## 25. Regional storage architecture trigger

Do **not** build multi-region tenant routing merely because enterprise buyers sometimes ask about residency.

Build it when all are true:

- a qualified/contracted customer requires it;
- the requirement is commercially meaningful;
- provider architecture can satisfy it end-to-end;
- operational backup/restore/deletion/audit procedures work per region;
- cross-region support/admin access is defined;
- engineering understands failure/recovery and tenant-migration behavior;
- gross-margin and operational cost are acceptable.

If triggered, prefer explicit tenant placement:

`organization -> home_region -> regional control/data plane`

and fail closed against accidental cross-region writes. Avoid hidden best-effort routing.

## 26. Residency acceptance tests

Before claiming a residency option:

- create tenant in target region;
- prove durable DB/storage placement;
- prove application writes stay in intended region;
- inventory provider calls that leave the region;
- verify backups and restore location;
- verify export/delete path;
- verify logs/analytics/error monitoring boundaries;
- verify support/admin access model;
- verify disaster-recovery behavior;
- verify the exact customer-facing statement against counsel-reviewed contract language.

A marketing page is the final step, not the first.

---

# H. International Billing

## 27. Current state

**VERIFIED CURRENT:** Core/Signal self-serve checkout is configuration-driven through Stripe recurring Price IDs. Browser success redirects do not grant entitlements; verified asynchronous billing events control lifecycle state. Billing remains unavailable when configuration is incomplete.

**VERIFIED CURRENT:** the private-beta operating policy requires approved entity, tax, order-form/terms, refund/cancellation, and production validation before real paid activation.

This is the correct foundation for international expansion: fail closed rather than guessing.

## 28. Future price-book model

Do not use one `package -> price_id` mapping once multiple currencies/terms are real.

When demand requires it, move to a server-authoritative price book concept:

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

The browser may select among server-approved offers but must never submit arbitrary amount, currency, tax treatment, Price ID, organization ID, or billing customer ID.

## 29. Billing currency rules

- Keep original invoice/contract currency immutable.
- Do not convert historical revenue into a reporting currency without separately storing/reporting the FX method/date/source.
- Do not infer currency from IP/browser locale.
- A public currency display is not proof the company can legally invoice/collect in that market.
- A Stripe-supported currency/payment method is not proof Foremention’s contracting entity/tax setup is ready to sell there.

## 30. Tax / VAT / GST readiness

**LEGAL/TAX REVIEW REQUIRED.**

Before a market-specific paid launch, determine for the real contracting entity and customer type:

- registration/collection obligations;
- tax-inclusive versus tax-exclusive pricing requirements;
- customer tax-ID handling;
- invoice fields/numbering requirements;
- reverse-charge/self-assessment or similar treatment where applicable;
- evidence needed for customer/business location;
- refund/credit-note handling;
- accounting/reconciliation ownership.

Foremention should integrate a tax capability only after the actual requirements are known. Do not build speculative country logic into application code.

## 31. Local payment methods

Treat local payment support as a commercial conversion feature with operational cost.

Build only when:

- qualified opportunities are blocked by payment method;
- the provider supports the method for the actual business/entity;
- settlement/refund/dispute/reconciliation behavior is understood;
- fraud/chargeback risk is acceptable;
- finance can reconcile it.

Enterprise invoicing/manual contracts may remain the right path long before self-serve local payment methods are justified.

---

# I. Regional Benchmarks

## 32. Benchmark principle

A regional benchmark is a statistical product, not a filtered dashboard.

**FUTURE-GATED:** Foremention must not publish or expose cross-customer benchmark comparisons until sample size, consent/contract basis, privacy, anonymization, methodology, language, market, provider environment, and statistical interpretation are defensible.

## 33. Benchmark eligibility contract

A benchmark cohort must define at least:

```text
benchmark_version
metric_definition
market
language
provider
model/model_family policy
methodology_version
observation_window
customer/cohort eligibility
sample_n
minimum_publishable_n
anonymization/privacy rule
consent/contract rule
outlier policy
missing-data policy
confidence/uncertainty method
created_at
```

`minimum_publishable_n` must be deliberately approved for the data/metric and privacy risk. Do not hard-code an arbitrary universal `n` and call it statistically safe.

## 34. Required comparison conditions

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

If compatibility is partial, label the analysis exploratory and withhold rank/percentile claims that imply precision.

## 35. Privacy rules

Before any cross-customer benchmark:

- obtain an appropriate contractual/consent basis;
- exclude directly identifying customer content from cohort outputs unless explicitly permitted;
- suppress small or uniquely identifying cells;
- prevent reverse identification through dimensions/filters;
- separate internal aggregate research from customer-visible benchmark rights;
- version cohort membership and deletion behavior;
- ensure a customer deletion/contract change can be handled according to the agreed policy.

**LEGAL REVIEW REQUIRED** for the applicable basis and customer contract wording.

## 36. Statistical QA

Every published benchmark should report enough context to prevent false certainty:

- `n`;
- time window;
- cohort definition;
- provider/model/methodology constraints;
- missingness/exclusions;
- uncertainty interval or distribution where meaningful;
- whether the metric is descriptive or causal (Foremention should normally remain descriptive).

Never turn a sparse benchmark into a market-leader claim.

---

# J. Expansion Sequence — Market #2, #3, #4

## 37. Rule: slots, not countries

There is not enough verified demand in the recovered repository to name country #2, #3, or #4 responsibly.

Therefore **Market #2/#3/#4 are decision slots, not predetermined countries.** Each market is chosen only after the scorecard and hard gates are populated with real evidence.

## 38. Before Market #2

Goal: prove Foremention can support one adjacent market without losing primary-market PMF focus.

Required before launch:

- market-demand fields exist in the customer-research/commercial source of truth;
- candidate market has evidence-backed demand and commercial owner;
- provider/model evaluation completed for the market/language actually requested;
- locale/market provenance remains in Recommendation Records and comparison identity;
- schedule timezone/display semantics are hardened if local-time execution is part of the customer promise;
- contracting/tax/billing path reviewed;
- processor locations/data-governance requirements reviewed;
- support owner and working-hour expectation documented;
- launch scope explicitly says what is **not** localized/supported.

**Preferred complexity profile for Market #2 — OPERATING POLICY:** choose the highest-demand market that reuses the existing English UI and product operating model when evidence is otherwise comparable. This is not a rule to choose a particular English-speaking country; demand wins.

What not to build before Market #2 unless required by the winning account:

- broad UI translation;
- multi-region storage;
- multiple local payment methods;
- regional benchmark product;
- country-specific product forks.

## 39. Before Market #3

Goal: prove expansion is repeatable rather than founder exception-handling.

In addition to Market #2 gates:

- Market #2 has real activation/retention/commercial evidence, not just signup volume;
- market onboarding/support playbook is reusable;
- provider evaluation harness can add a new market without bespoke scripts;
- market capability registry exists and is versioned;
- customer-data processor/governance review is repeatable;
- finance can report revenue/cost in original currencies without mixing them;
- any market-specific terms or invoicing process have owners;
- expansion has not degraded reliability or primary-market support.

Market #3 should ideally add **one new complexity dimension at a time**. Examples: new contracting/tax environment *or* materially different provider geography *or* new billing currency—not all plus a new UI language plus residency at once unless a contract justifies the cost.

## 40. Before Market #4

Goal: earn the right to take on a structurally different market.

Market #4 may be the first justified language/localization or residency leap, but only if demand dictates it.

If it requires a new product language:

- translation catalog/runtime exists;
- locale routing/fallback is tested;
- text expansion/accessibility QA passes;
- multilingual golden set passes defined quality thresholds;
- question translation provenance is implemented;
- cross-language comparability remains fail-closed;
- local-language support ownership is defined;
- legal/product/support copy review pipeline exists.

If it requires residency:

- regional tenant-placement architecture is implemented;
- end-to-end location tests pass;
- backup/restore/delete/export/audit semantics are verified;
- processor and support access paths are documented;
- customer-facing residency statement exactly matches real architecture and contract.

If Market #4 requires both a language leap and residency leap, require executive review of opportunity value, implementation cost, support cost, gross-margin impact, and strategic focus before committing.

---

# K. International Readiness Backlog

## 41. Do now — no speculative market build

These items improve truth without pretending demand exists:

1. Keep `locale` + `market` in exact measurement/comparison identity.
2. Keep UI/product English-first.
3. Route international-demand discovery into the customer-research/commercial source of truth rather than infer geography.
4. Treat provider multilingual/regional quality as unevaluated until a versioned test proves it.
5. Preserve public processor/data-location truth boundaries.
6. Keep billing fail-closed until real entity/tax/price configuration exists.
7. Record the timezone wall-clock/display limitation as a scheduling hardening item.
8. Keep benchmark capability future-gated.

## 42. Build when a Market #2 candidate emerges

- demand fields/report;
- market scorecard decision record;
- target-market provider capability evaluation;
- golden question/evidence set;
- regional measurement-context normalization where required;
- schedule timezone semantics fix if promised;
- contracting/privacy/tax/residency checklist;
- support/cost model.

## 43. Build when first translated UI is justified

- locale resolver and translation catalogs;
- centralized date/number/currency formatters;
- locale-aware metadata/SEO only for real localized public pages;
- translated product/system email workflow;
- translation QA/provenance;
- text-expansion and target-script accessibility suite;
- RTL only if the target language needs it.

## 44. Build when first residency commitment is justified

- tenant `home_region`/regional placement model;
- regional database/storage/control-plane strategy;
- cross-region write protections;
- region-aware backups/restores/deletion/export;
- regional observability and admin/support controls;
- residency acceptance test;
- contract wording reviewed against verified architecture.

## 45. Build when cross-customer benchmarks are justified

- consent/contract policy;
- anonymized cohort builder;
- minimum-cell suppression;
- versioned benchmark definitions;
- statistical QA/uncertainty reporting;
- market/language/provider/methodology comparability gates;
- deletion/recomputation policy.

---

# L. Decision Records

## 46. International market decision template

Create one record per candidate market:

```markdown
# Market decision — <market key>

Status: researching | pilot-only | approved | deferred | retired
Decision date:
Owner:

## Demand evidence
- source:
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

## 47. International capability truth table

Maintain a living table once more than one market exists:

| Capability | Primary market | Market #2 | Market #3 | Market #4 |
| --- | --- | --- | --- | --- |
| UI language | English | UNKNOWN | UNKNOWN | UNKNOWN |
| Buyer-question language | English-first / locale metadata supported | UNKNOWN | UNKNOWN | UNKNOWN |
| Provider/model quality | evaluate per configured provider/model | UNKNOWN | UNKNOWN | UNKNOWN |
| Search/retrieval geography | provider-specific / not globally promised | UNKNOWN | UNKNOWN | UNKNOWN |
| Billing currency | configured Stripe Price truth only | UNKNOWN | UNKNOWN | UNKNOWN |
| Tax treatment | requires actual setup | UNKNOWN | UNKNOWN | UNKNOWN |
| Data residency | no customer-selectable promise | UNKNOWN | UNKNOWN | UNKNOWN |
| Support language/hours | current operating setup | UNKNOWN | UNKNOWN | UNKNOWN |
| Benchmark eligibility | not launched | UNKNOWN | UNKNOWN | UNKNOWN |

Never replace `UNKNOWN` with a flag icon or green check because a vendor marketing page says it "supports" a country.

---

# M. QA + Release Gates

## 48. Internationalization regression tests when relevant

A market/language feature should add focused automated tests for:

- locale parsing and fallback;
- timezone validity;
- DST/local-wall-clock scheduling semantics when promised;
- date/number/currency formatting;
- long-string/text-expansion layout;
- language tag/market validation;
- question provenance persistence;
- run snapshot preservation;
- comparison-withheld behavior when language/market differs;
- provider capability status gating;
- region/tenant isolation if residency exists;
- billing price-book server authority;
- benchmark cohort suppression/privacy rules.

## 49. Manual acceptance

For every launched locale/market:

- real target-language reviewer;
- real target-market buyer-question set;
- desktop/mobile/reflow/accessibility checks;
- provider answer/citation/evidence inspection;
- refusal/error/partial-result handling;
- local timezone display;
- invoice/payment journey if enabled;
- privacy/subprocessor copy review;
- support escalation rehearsal;
- exact customer-facing capability statement review.

## 50. Release claim rule

No market is "supported" merely because:

- the site can be visited there;
- Stripe accepts a card there;
- a model can answer in the language;
- a database vendor has a region there;
- a translation was generated;
- one provider call succeeded;
- one prospect asked for it.

A supported market has an explicit launch decision, product-quality evidence, commercial/legal path, data-governance answer, support owner, and truthful published scope.

---

# N. Recommended Current Decision

## 51. Decision as of recovered `main`

**OPERATING POLICY — stay focused on the existing English-first beachhead while improving evidence collection for future market selection.**

**UNKNOWN:** market #2.  
**UNKNOWN:** market #3.  
**UNKNOWN:** market #4.  
**UNKNOWN:** first translated UI language.  
**UNKNOWN:** first additional billing currency.  
**UNKNOWN:** first customer-selectable data-residency region.

The product is **partially international-ready at the measurement-provenance layer** because locale/market/timezone context exists and exact comparisons already fail closed across locale/market changes. It is **not internationally commercialized** because market demand, provider quality by region/language, legal/tax setup, residency, support, and localization are not proven.

That is the correct state for the present company stage.

## 52. No runtime changes in this Chat 18 pass

This branch intentionally adds the readiness operating document only.

Reason:

- broad localization would be premature;
- international demand is not yet measurable enough to select a market;
- multi-currency/residency work depends on real commercial/legal requirements;
- concurrent customer-research/commercial work is the appropriate place to capture demand evidence rather than duplicating schemas here;
- existing locale/market comparability foundations are already useful and should not be rewritten without a concrete failing requirement.

The only current implementation issue elevated by this audit is the timezone wall-clock/display limitation described above. Fix it as a focused scheduling correctness change when local-time semantics are specified and tested; do not hide it behind an "international" marketing claim.

---

## 53. Definition of ready for the next international decision

Foremention is ready to choose Market #2 when it can answer, with cited evidence rather than intuition:

1. Which qualified customers are asking for this market?
2. What revenue/retention opportunity is attached to the request?
3. Which exact providers/models work there and how well?
4. Which buyer-question language and retrieval geography are required?
5. Can Foremention preserve comparison integrity?
6. What must change in product/support?
7. What are the real contracting, tax, invoice, payment, privacy, processor, and residency requirements?
8. Can those requirements be satisfied without unsafe claims or tenant/data leakage?
9. What does the market cost to launch and support?
10. What evidence would cause Foremention to defer or exit?

Until those answers exist, the strategically correct international feature is **discipline**.