# Foremention International Readiness

**Status:** international expansion operating and architecture readiness record  
**Recovered `main`:** `08d7f398ae89d0d69af4530af5ecc6c752f1a6c6` on 2026-08-30  
**Scope:** market-entry gates, localization architecture, multilingual buyer-question provenance, regional measurement, data governance/residency, international billing, regional benchmarks, and expansion sequencing  
**Legal boundary:** this is an engineering and operating framework, not legal, tax, accounting, privacy-law, payments-regulatory, or incorporation advice.

This document intentionally does **not** translate the product, select a second country, claim international demand, claim GDPR/UK GDPR/other regulatory compliance, promise data residency, invent tax treatment, or treat vendor availability as proof Foremention can sell or operate in a jurisdiction.

---

## 0. Truth vocabulary

International planning must distinguish:

- **VERIFIED CURRENT** — directly supported by the recovered repository state.
- **UNKNOWN** — the repository does not contain enough evidence to make the claim.
- **OPERATING POLICY** — a rule adopted for future decisions; not evidence that an outcome exists.
- **EXPERIMENT** — bounded work designed to create evidence.
- **TARGET** — a desired future threshold or state; never an actual.
- **FUTURE-GATED** — architecture that should remain unbuilt or disabled until a stated trigger is satisfied.
- **LEGAL REVIEW REQUIRED** — a conclusion that must be checked for the real company, customer, processor configuration, contract, and jurisdiction before a customer-facing promise is made.

**Default rule:** unknown stays unknown.

---

# A. Reality recovery — is international demand real?

## 1. Executive conclusion

**UNKNOWN — the recovered repository does not establish verified customer demand for a second country, market, or product language.**

That is not the same as saying international demand does not exist. Demand may live in conversations, CRM records, customer calls, procurement requests, or opportunities outside this repository. The repository alone cannot prove it.

The correct present strategy is therefore:

1. preserve the existing English-first product focus;
2. keep locale, market, and timezone provenance where the product already records it;
3. make market/language demand measurable in customer-research and commercial systems;
4. fail closed on cross-market and cross-language comparisons until comparison identity explicitly includes every material regional dimension;
5. evaluate provider/model quality in a target language/market before calling it supported;
6. do not build broad UI translation, multi-region storage, country-specific tax code, local payment rails, or benchmark products before a real market passes the gates in this document.

## 2. Verified current-state inventory

| Area | Recovered repository state | Readiness judgment |
| --- | --- | --- |
| Product language | Root HTML is `lang="en"`; current product and public experience are English-first | **VERIFIED CURRENT / focused** |
| Design-partner demand capture | Intake stores company, role, category, buyer questions, problem, plan interest, status, and source; it does not capture target country/market, preferred language, billing currency need, residency requirement, or local-payment blocker | **VERIFIED CURRENT / insufficient to rank international demand** |
| Measurement locale | Recurring measurement input supports `locale`; provider prompt contracts can carry optional `locale` | **VERIFIED CURRENT / useful provenance seam** |
| Measurement market | Recurring measurement input supports `market`; scheduled run prompt selections persist locale/market values | **VERIFIED CURRENT / useful provenance seam** |
| Timezone | Recurring measurement stores and validates an IANA timezone | **VERIFIED CURRENT / partial** |
| Recurrence semantics | `nextScheduleAt` validates a timezone but advances weekly/biweekly/monthly recurrence using UTC date arithmetic | **VERIFIED CURRENT / do not promise preserved local wall-clock semantics across DST yet** |
| Exact comparison | Exact slot identity currently uses prompt key, normalized persisted question text, provider, and exact model; callers separately enforce review/methodology boundaries | **VERIFIED CURRENT / strong baseline, but not yet region-safe** |
| Locale/market comparison gate | Locale and market are **not currently part of the exact comparator identity** | **VERIFIED CURRENT GAP / must be hardened before regional or multilingual trend claims** |
| Provider regional/language certification | No canonical evidence-backed registry proves provider/model quality by language/market/geography | **UNKNOWN / not ready to promise** |
| UI localization framework | No canonical translation catalog/locale-routing architecture is required by current demand | **FUTURE-GATED** |
| Multi-currency price book | Current Stripe self-serve mapping is package → configured recurring Price ID for Core/Signal | **VERIFIED CURRENT / no general multi-currency architecture claimed** |
| International tax | No broad VAT/GST/tax engine is established by this audit | **UNKNOWN / LEGAL + TAX REVIEW REQUIRED** |
| Customer-selectable residency | No verified customer-selectable regional storage/residency commitment is established by this audit | **FUTURE-GATED** |
| Regional benchmarks | No defensible cross-customer regional benchmark product is established by this audit | **FUTURE-GATED** |

### Evidence reviewed

Primary implementation seams reviewed for this pass:

- `app/layout.tsx`
- `supabase/migrations/20260829000200_design_partner_applications.sql`
- `lib/measurement-schedules.ts`
- `lib/jobs/measurement-schedule-dispatcher.ts`
- `lib/providers/types.ts`
- `lib/intelligence-comparability.ts`
- `lib/run-pair-comparability.ts`
- `lib/safe-intelligence.ts`
- `tests/exact-question-comparability.test.mjs`
- `lib/billing.ts`
- `lib/stripe-billing.ts`
- relevant Supabase migrations and existing privacy/trust documentation

## 3. Critical truth gap: provenance exists, comparison protection is incomplete

Foremention already has a useful foundation: locale and market can be carried by recurring measurement and persisted into scheduled run prompt selections.

However, the current exact question comparator identifies a slot using:

```text
prompt_key
normalized prompt_text
provider
model
```

The comparison caller separately requires reviewed terminal runs and matching methodology. It does **not** currently include locale or market in the final exact slot identity.

Therefore:

**OPERATING POLICY:** until locale/market/geography are incorporated into the canonical comparison identity and covered by tests, Foremention must not claim that a change in market or language is automatically blocked by the existing comparator.

Before Market #2 or any multilingual longitudinal report, upgrade the comparison contract so any material change in language, market, country targeting, provider geography, retrieval mode, or equivalent environment dimension causes a clear `not comparable` result.

## 4. International-demand observability gap

The current design-partner intake cannot answer:

- which markets prospects need measured;
- which buyer languages matter;
- whether translated UI is required or only multilingual measurement;
- whether local-language support is required;
- whether billing currency/payment method is a blocker;
- whether invoice/tax treatment is a blocker;
- whether regional storage/residency is preferred or contractual;
- whether a processor location is disallowed;
- whether timezone/SLA coverage changes delivery cost.

**OPERATING POLICY:** do not infer these facts from IP, browser locale, email domain, personal name, or company-domain heuristics. Capture them explicitly when they matter to a real opportunity.

---

# B. Market Expansion Framework

## 5. What counts as a market

For Foremention, a market is not automatically one country.

A practical market definition may combine:

```text
commercial geography
× buyer language
× provider/model environment
× retrieval/search geography
× contracting/tax requirements
× residency/processor requirements
× support expectations
```

Two countries may share one operating configuration. Two customers in the same country may require materially different privacy, procurement, language, or residency treatment.

## 6. Market-entry principle

**OPERATING POLICY:** enter a market because verified customer value justifies the complexity, not because a country is large, fashionable, English-speaking, nearby, or easy to add to a dropdown.

No market becomes "supported" from one vendor capability page, one successful API request, one translated screen, or one prospect comment.

## 7. 100-point market scorecard

Score each candidate 0–5 per dimension and attach dated evidence. Convert each score into weighted points. An unsupported score is **UNKNOWN**, not an optimistic number.

| Criterion | Weight | Evidence that can support the score |
| --- | ---: | --- |
| Customer demand | 25 | contracted requirement, accepted pilot, existing-customer expansion request, qualified opportunity blocker, repeated ICP-fit discovery signal |
| Revenue potential | 15 | verified budget, accepted commercial range, reachable account set, expansion value, credible ACV/margin—not top-down TAM alone |
| Provider coverage | 12 | provider/model availability, retrieval/search behavior, geo controls, stability, rate limits, cost, observed citations |
| Language quality | 10 | golden-set results, evidence accuracy, extraction accuracy, reviewer agreement, failure/refusal behavior |
| Legal/privacy complexity | 10 | counsel-reviewed requirements for the real contracting entity/customer/data flow |
| Support burden | 7 | timezone overlap, language requirement, implementation load, SLA/escalation expectations |
| Competitive landscape | 5 | local alternatives, switching friction, category maturity, Foremention differentiation |
| Payment/billing | 6 | invoicing path, currency, payment method, settlement/refund constraints, provider support |
| Data residency/processors | 7 | storage/processing restrictions, processor limits, regional availability, procurement requirements |
| Localization cost | 3 | product/content/legal/support translation, QA, RTL/text expansion, maintenance burden |
| **Total** | **100** | |

### Score interpretation

These bands are **OPERATING POLICY**, not forecasts:

- **80–100:** eligible for formal launch-readiness review only if every hard gate passes.
- **65–79:** continue focused discovery/evaluation or pilot-only support; do not market broad support.
- **Below 65:** defer or serve only as an explicit exception if strategically justified.
- **UNKNOWN-heavy:** gather evidence; do not manufacture precision.

## 8. Hard gates that override the score

### 8.1 Demand gate

A candidate must have meaningful real demand, for example:

- a contracted/contract-ready anchor account requiring it; or
- multiple qualified ICP-fit accounts independently requesting the same capability; or
- a retained customer expansion requirement with credible commercial value.

Do not hard-code one universal logo count. One enterprise anchor can justify work that would require many low-value requests in another segment.

### 8.2 Product-quality gate

Before launch:

- a representative market/language buyer-question evaluation set exists;
- selected provider/model configurations execute reliably;
- citations/retrieval/evidence are assessed for the target environment;
- entity/recommendation extraction is evaluated;
- human reviewers can judge output quality in the target language;
- failure, refusal, timeout, unsupported, and partial-result behavior is understood;
- comparison rules fail closed for non-equivalent environments.

### 8.3 Commercial gate

Before paid launch:

- contracting entity is known;
- quote/order-form path is known;
- billing currency is intentionally supported;
- invoice requirements are known;
- payment collection path is operationally verified;
- refund/cancellation treatment is defined;
- tax/VAT/GST handling is reviewed for the actual transaction.

**LEGAL/TAX REVIEW REQUIRED.**

### 8.4 Privacy/data-governance gate

Before promising the market:

- actual customer-data storage locations are documented;
- actual processor/subprocessor paths are documented;
- material processing locations are understood where required;
- cross-border restrictions are reviewed;
- any DPA/transfer/residency commitment is reviewed and technically enforceable;
- export/delete/retention obligations remain achievable.

**LEGAL REVIEW REQUIRED.**

### 8.5 Support gate

Before launch:

- onboarding owner exists;
- support language expectation is explicit;
- required working-hour overlap is acceptable;
- incident/escalation path is documented;
- implementation/support cost does not silently destroy gross margin.

---

# C. Demand Evidence System

## 9. Future demand fields

Do not overload the public form now. Add these to the customer-research/commercial source of truth only when the research workflow needs them:

```text
operating_country
requested_measurement_markets[]
buyer_question_languages[]
ui_language_requirement        # none | nice_to_have | required
support_language_requirement
billing_currency_requirement
local_payment_requirement
invoice_or_tax_blocker
data_residency_requirement     # none | preferred | contractual | unknown
required_storage_region
processor_constraints[]
support_timezone_requirement
market_blocker_type
evidence_source
evidence_reference
observed_at
owner
```

These are account/opportunity facts, not browser telemetry.

## 10. Demand-signal hierarchy

Strongest to weakest:

1. **Contracted requirement** — signed or approved commercial scope.
2. **Accepted paid pilot requirement** — budget/terms committed contingent on capability.
3. **Retained-customer expansion request** — active customer asks for new market/language.
4. **Qualified opportunity blocker** — real deal cannot progress without capability.
5. **Repeated ICP-fit discovery signal** — independent prospects report the same need.
6. **Unqualified inbound request** — directional only.
7. **Competitor presence/search volume/social chatter** — context, not customer demand.

Market entry should be led by levels 1–5.

## 11. Required evidence record

Every market-candidate decision should retain:

- source of demand;
- date observed;
- opportunity/customer owner;
- requested market and buyer language;
- capability required;
- commercial value or `UNKNOWN`;
- blocker severity;
- proposed experiment;
- result;
- decision and reviewer.

This prevents "we heard Europe wants this" from becoming company fact.

---

# D. Localization Architecture

## 12. Internationalization is not localization

- **Internationalization readiness** means code/data can represent multiple locales correctly without corrupting product truth.
- **Localization** means adapting product UI, content, support, legal text, emails, and commercial experience for a real target market.

Foremention should improve readiness only where inexpensive and truth-preserving; localization remains demand-gated.

## 13. Separate the contexts

Do not compress every global concern into one `locale` field.

Future context should distinguish:

```text
ui_locale
content_language
timezone
measurement_market
measurement_language
provider_geography
billing_currency
numbering_system          # only if needed
text_direction
```

Example: a German-speaking operator may use an English UI, work in `Europe/Berlin`, measure US English buyer questions, and report company finance in EUR. Those are independent dimensions.

## 14. Locale and language standards

When the second locale is justified:

- use BCP 47 language tags for language/locale where appropriate;
- keep user-interface locale separate from measurement language;
- define an explicit fallback chain;
- never silently convert an unsupported measurement language to English;
- persist source language for translated buyer questions;
- make locale fallback visible to QA/diagnostics.

## 15. Date and time rules

- Store durable timestamps as UTC instants.
- Store schedule timezone separately as an IANA timezone.
- Render customer-visible dates/times through one centralized formatter.
- Use the viewer/workspace locale for display only; do not let display formatting change stored truth.
- Label UTC explicitly when a view is intentionally UTC.
- If a schedule promises "10:00 local time", compute recurrence in the named timezone and test daylight-saving transitions.
- Do not claim preserved local wall-clock recurrence from the current UTC date-arithmetic implementation.

## 16. Number formatting

- Store numeric values numerically, never as locale-formatted strings.
- Render decimal/grouping/percentage formats through `Intl.NumberFormat` or a centralized equivalent.
- Keep measurement math independent from display locale.
- Do not parse localized display strings back into authoritative measurement values.

## 17. Currency formatting

- Store monetary amount with ISO 4217 currency code.
- Separate billing currency from UI locale.
- Never infer billing currency from IP or browser locale.
- Keep original contracted/invoiced currency immutable.
- If management reporting converts currencies, retain original amount/currency plus separately sourced FX rate, source, and effective date.

## 18. Text expansion

Before a translated UI ships:

- remove critical fixed-width assumptions;
- allow navigation, buttons, tabs, and tables to wrap where appropriate;
- stress-test roughly 30–50% text expansion where practical;
- avoid copy embedded in images;
- test long organization/category/question names separately from translation expansion;
- validate mobile/reflow layouts.

The percentage is a layout stress-test, not a claim about any specific language.

## 19. RTL

**FUTURE-GATED:** do not build or advertise RTL before a validated market requires it.

When required:

- derive `dir` from locale context;
- prefer logical CSS properties;
- mirror icons only when semantic direction requires it;
- deliberately test diagrams, timelines, tables, charts, breadcrumbs, and source relationships;
- test target-script font fallback, keyboard use, focus order, and accessibility;
- use real target-language QA.

## 20. Translation architecture when justified

Use message catalogs, not ad hoc copied components.

Required properties:

- stable message keys;
- source locale and catalog version;
- parameter/plural handling;
- no concatenated English fragments;
- explicit fallback behavior;
- translation provenance/owner outside runtime bundles where appropriate;
- product copy separated from legal/contract copy;
- system email and export localization treated as product surfaces, not afterthoughts;
- machine-assisted translations reviewed before production where meaning matters.

Do not machine-translate legal commitments and publish them as authoritative without appropriate review.

---

# E. Multilingual Buyer Questions

## 21. Principle

A buyer question is measurement input, not decorative copy.

Translation can change:

- commercial intent;
- local category terminology;
- product references;
- geography;
- ambiguity;
- model behavior;
- retrieval behavior;
- cited-source distribution.

Never overwrite an original buyer question with a translated string.

## 22. Future multilingual question model

When demand requires it, introduce a versioned relationship such as:

```text
question_family_id
question_version_id
original_text
original_language
localized_text
localized_language
measurement_market
translation_method          # original | customer | human | machine_assisted
translation_provider
translation_model
translation_prompt_version
translated_at
translated_by
approved_by
semantic_equivalence        # unreviewed | equivalent | materially_changed | rejected
review_notes
```

Not every field needs to be built immediately. The non-negotiable properties are:

1. original text remains recoverable;
2. localized text is a distinct version;
3. translation method/provenance is knowable;
4. semantic-equivalence status is explicit;
5. measurement records identify which exact version was executed.

## 23. Translation provenance

For a translated question, retain:

- source language;
- target language;
- source version/fingerprint;
- translated text/version/fingerprint;
- translator/method;
- machine model/prompt version if applicable;
- approval status;
- review notes;
- effective time.

Changing a translation creates a new measurement input version. Do not rewrite historical runs.

## 24. Semantic comparability

Default to **not comparable** when a material measurement identity changes, including:

- question text/version/fingerprint;
- buyer-question language;
- market/geographic targeting;
- provider;
- exact model/version when material;
- methodology;
- retrieval/search configuration;
- provider geography;
- locale when it changes provider behavior;
- other environment fields identified by evaluation.

### Current implementation boundary

Current exact comparison already protects persisted question text, provider, and exact model, with review/methodology gates enforced by callers. It does **not yet** prove equality of locale or market.

Therefore the Market #2 readiness backlog must extend the canonical comparison identity to include the regional/language dimensions that can affect output, with explicit reason codes for withheld comparisons.

### Cross-language equivalence

Even if a bilingual reviewer marks two translations semantically equivalent, do not automatically place different-language observations on one longitudinal trend line.

"Semantically equivalent questions" and "measurement environments that produce directly comparable observations" are different claims.

## 25. Language-specific evidence

A multilingual observation should preserve enough context to answer:

- what language was asked;
- what market/geography was intended;
- what provider/model ran;
- what retrieval/search mode was used;
- what language the answer used;
- what language/market the cited evidence came from;
- whether evidence was retrievable and human-reviewable;
- what limitations were observed.

Do not discard non-target-language sources automatically; classify them. A useful answer in one market may legitimately cite global English documentation. The report should make that visible rather than pretending all evidence is local.

## 26. Multilingual evaluation set

Before declaring a buyer-question language supported, build a privacy-safe golden set covering:

- category discovery;
- direct comparison;
- alternatives/replacement;
- feature/use-case questions;
- pricing/value questions where relevant;
- ambiguous wording;
- branded and unbranded questions;
- locally natural terminology, not literal translation only;
- diacritics/script/punctuation edge cases;
- code-switching only where real customer behavior requires it.

Measure by **language × market × provider × model**:

- request success;
- output-language adherence;
- recommendation/entity extraction accuracy;
- competitor normalization;
- citation extraction;
- source-language appropriateness;
- evidence retrievability;
- evidence-state accuracy;
- recommendation/action quality;
- reviewer agreement;
- failure/refusal behavior;
- false-comparability risk.

"The model knows French" is not an evaluation result.

---

# F. Regional Measurement

## 27. Canonical measurement context

When geography/language can affect output, a Recommendation Record/observation should be interpretable from a context tuple such as:

```text
organization
workspace/brand
question_version/fingerprint
question_language
locale
market
country/region targeting        # when real
provider
provider mode/retrieval mode
provider geography              # when controlled/observable
model + version/snapshot
methodology version
relevant tool/search configuration
observation timestamp
review state
```

Do not add dimensions merely for architectural elegance. Add them when provider behavior, evaluation, customer requirements, or comparison truth makes them material.

## 28. Market vs country vs region

Do not overload one free-text `market` forever.

When real multi-market demand appears, separate:

- `market_key` — Foremention/customer business concept;
- `country_code` — ISO 3166-1 alpha-2 when country is relevant;
- `region_code` — only when subnational targeting matters and a stable scheme is chosen;
- `language_tag` — BCP 47;
- `provider_geo` — actual provider/search geography parameter or observed environment when supported.

Do not rewrite historical `global` values to look more international. Historical provenance must remain interpretable.

## 29. Provider capability registry

Before Market #2 launches, create a versioned capability registry only for provider/model/market combinations under real evaluation.

Suggested fields:

```text
provider
model
market_key
country_code
language_tag
api_available
search_or_retrieval_available
geo_targeting_mode
known_restrictions
citation_behavior
evaluated_at
evaluation_set_version
quality_status
cost_notes
rate_limit_notes
evidence_reference
```

Suggested evidence states:

- `not_evaluated`
- `evaluating`
- `supported_for_pilot`
- `supported`
- `degraded`
- `unsupported`

A single successful call cannot produce `supported`.

## 30. Regional comparison contract

**OPERATING POLICY:** regional comparability is fail-closed.

Before regional/multilingual trend reporting is enabled, the exact comparison layer must reject a pair when any required identity field differs or is missing.

Minimum reason codes should include:

```text
question_changed
language_changed
market_changed
provider_changed
model_changed
methodology_changed
retrieval_mode_changed
provider_geo_changed
review_missing
regional_provenance_missing
provider_capability_unknown
```

Individual observations may remain valid evidence even when a cross-run delta is withheld.

## 31. Required implementation hardening before regional trend claims

**FUTURE-GATED / Market #2 hard gate:** extend the canonical exact-comparison path, not a new parallel comparator.

Required work:

1. define canonical language/market fields used for comparison;
2. persist them on the immutable run/answer measurement snapshot used by customer-facing comparisons;
3. include them in exact slot identity;
4. include provider geography/retrieval mode when materially controllable;
5. make missing provenance fail closed;
6. add unit tests for language change, market change, missing regional provenance, and unchanged regional identity;
7. ensure every customer-facing comparison surface uses the same final gate;
8. update UI copy to explain why a comparison was withheld.

Do this when a real market candidate exists, so the schema reflects actual provider behavior rather than guessed abstractions.

---

# G. Global Data Governance + Data Residency

## 32. Separate four concepts

Never use "data residency" as an undifferentiated sales phrase.

Track separately:

1. **Storage location** — where durable customer data/backups are stored.
2. **Processing location** — where application/provider processing may occur.
3. **Edge/transit location** — where requests may traverse or be served.
4. **Contractual residency commitment** — exactly what Foremention promises to a customer.

A regional database does not prove every processor stays in-region. An edge network does not by itself establish the legal effect of a cross-border transfer. Actual architecture and reviewed contractual requirements govern the answer.

## 33. Current claim boundary

**OPERATING POLICY:** until verified otherwise for a real customer configuration:

- do not claim customer-selectable residency;
- do not claim data stays within a named country/region;
- do not claim a transfer mechanism exists solely because a vendor offers one;
- do not claim GDPR, UK GDPR, or other regulatory compliance from implementation artifacts alone;
- do not translate privacy/legal language into a guarantee not reviewed for the relevant jurisdiction.

A migration or internal feature named after a regulation is not proof of legal compliance.

## 34. Future customer data-governance profile

When enterprise demand requires it, maintain a reviewed profile such as:

```text
data_governance_profile_id
organization_id
contracting_entity
home_storage_region
allowed_processing_regions
residency_requirement
cross_border_transfer_restrictions
restricted_processors[]
approved_processors[]
retention_policy_reference
delete_export_requirements
dpa_status
security_addendum_status
legal_review_reference
effective_at
```

Do not encode legal conclusions as application-generated booleans. Reference reviewed customer/contract decisions.

## 35. Processor register

For regional contracting, maintain an internal evidence-backed register including:

- provider/service;
- purpose;
- data categories;
- customer-data path;
- always-on vs configuration-dependent status;
- verified storage locations where known;
- verified processing locations where known;
- subprocessor-chain source;
- contract/DPA status;
- transfer-mechanism status when legally relevant;
- customer notice/approval requirement;
- last verification date;
- owner;
- evidence document/link.

**LEGAL REVIEW REQUIRED** for legal-mechanism conclusions.

## 36. Regional storage trigger

Do **not** build multi-region tenant routing because enterprise buyers sometimes ask about residency.

Build it only when:

- a qualified/contracted customer actually requires it;
- opportunity value justifies the engineering/operating cost;
- database/storage/providers can satisfy the requirement end to end;
- backup/restore/delete/export behavior works per region;
- observability/logging boundaries are understood;
- admin/support access is defined;
- disaster recovery is defined;
- tenant migration behavior is understood;
- gross-margin impact is acceptable;
- customer-facing wording can be made technically and contractually exact.

## 37. Future regional placement model

If triggered, prefer explicit placement:

```text
organization
  -> data_governance_profile
  -> home_region
  -> regional data/control plane
```

Required principles:

- tenant placement is server-authoritative;
- cross-region writes fail closed;
- background jobs respect tenant region;
- region is included in audit/diagnostic context;
- migration between regions is explicit, reviewed, and auditable;
- exports/deletions operate against the correct region;
- no hidden "best effort" residency routing.

## 38. Residency acceptance test

Before making any customer-facing residency claim:

- create test tenant in target region;
- prove durable database/storage placement;
- prove normal application writes stay on the intended data plane;
- inventory provider calls that can leave the region;
- verify backups and restore location;
- verify logs, analytics, error monitoring, email, and integration paths;
- verify export/delete/retention behavior;
- verify admin/support access;
- verify disaster-recovery behavior;
- verify failure does not silently route data elsewhere;
- compare the exact marketing/order-form statement with reviewed contract language.

Marketing is the final step, not the first.

---

# H. International Billing

## 39. Current billing posture

**VERIFIED CURRENT:** self-serve Core/Signal checkout is driven by server-side configured Stripe recurring Price IDs and fails closed when required Stripe configuration is missing. Verified asynchronous billing events drive lifecycle state rather than trusting a browser success redirect.

This is a useful truth boundary.

It is **not** yet a general international price-book/tax architecture.

## 40. Future price-book model

When more than one real currency/term combination exists, replace one package → one Price ID assumptions with a server-authoritative price book:

```text
package_key
billing_provider
external_price_id
currency
interval
market_scope
contracting_entity
tax_behavior
active_from
active_until
status
```

The browser may select from server-approved offers. It must never authoritatively submit arbitrary amount, currency, tax behavior, organization ID, external customer ID, or Price ID.

## 41. Currency rules

- Retain original contract/invoice amount and currency.
- Do not rewrite historical amounts when display/reporting currency changes.
- Do not infer currency from IP/browser locale.
- Do not treat a displayed currency as proof Foremention can legally invoice in it.
- Do not treat a payment provider supporting a currency as proof the contracting entity is ready to sell there.
- If finance uses FX conversion, retain the source/method/date separately.

## 42. Tax, VAT, GST, invoices

**LEGAL/TAX REVIEW REQUIRED.**

For the real contracting entity/customer/market, determine before paid launch:

- registration/collection obligations;
- B2B/B2C differences if relevant;
- tax-inclusive vs tax-exclusive pricing requirements;
- customer tax-ID handling;
- invoice fields and numbering;
- place-of-supply/location evidence requirements;
- reverse-charge/self-assessment treatment where applicable;
- exemptions where applicable;
- credit note/refund handling;
- accounting/reconciliation ownership;
- record-retention requirements.

Do not implement speculative country tax rules before the actual requirements are known.

## 43. Local payment limitations

Treat local payment methods as a conversion feature with financial/operational cost.

Build one only when:

- qualified opportunities are blocked without it;
- the payment provider supports it for the actual business setup;
- settlement timing/currency is acceptable;
- refunds/disputes/chargebacks are understood;
- fraud risk is acceptable;
- finance can reconcile it;
- support can handle failures.

Enterprise invoicing/manual contracts may remain the correct path long before local self-serve payment methods are justified.

---

# I. Regional Benchmarks

## 44. Principle

A regional benchmark is a statistical product, not a dashboard filter.

**FUTURE-GATED:** do not expose cross-customer regional benchmarks until sample size, permission, anonymization, methodology, language, market, provider environment, and statistical interpretation are defensible.

## 45. Benchmark eligibility contract

Every benchmark version must define at least:

```text
benchmark_version
metric_definition
market
language
provider
model_or_model_family_policy
methodology_version
question_family_or_intent_policy
observation_window
customer_cohort_eligibility
sample_n
minimum_publishable_n
permission_or_contract_rule
anonymization_rule
small_cell_suppression_rule
outlier_policy
missing_data_policy
uncertainty_method
created_at
```

`minimum_publishable_n` must be deliberately approved for the metric and privacy risk. Do not choose one universal number and call every cohort safe.

## 46. Required benchmark comparability

Only compare cohorts when the benchmark methodology says these are compatible:

- sample definition;
- market;
- language;
- provider environment;
- model/version policy;
- question family/intent;
- observation window;
- evidence/review status;
- metric definition.

If compatibility is partial, label the analysis exploratory and withhold rank/percentile claims that imply unsupported precision.

## 47. Permission, anonymization, and privacy

Before any cross-customer benchmark:

- establish the appropriate contractual/consent basis;
- define whether data can be used only internally, for aggregate research, or in customer-visible benchmarks;
- exclude directly identifying customer content unless explicitly permitted;
- suppress small/uniquely identifying cells;
- prevent reverse identification through filters/combinations;
- version cohort membership;
- define deletion/recomputation behavior;
- ensure a customer contract change or deletion request can be honored under the agreed policy.

**LEGAL REVIEW REQUIRED** for the applicable basis and customer wording.

## 48. Statistical QA

Every published benchmark should expose enough context to avoid false certainty:

- sample `n`;
- observation window;
- cohort definition;
- provider/model/methodology constraints;
- missingness/exclusions;
- uncertainty interval or distribution where meaningful;
- descriptive vs causal interpretation.

Foremention should normally treat these metrics as descriptive unless a stronger causal design genuinely supports more.

Never turn a sparse cohort into a market-leader claim.

---

# J. Expansion Sequence — Market #2, #3, #4

## 49. Rule: decision slots, not predetermined countries

There is not enough verified demand in the recovered repository to responsibly name country/market #2, #3, or #4.

Therefore:

- **Market #2 = UNKNOWN**
- **Market #3 = UNKNOWN**
- **Market #4 = UNKNOWN**

They are decision slots chosen from evidence, not roadmap promises.

## 50. Before Market #2

**Goal:** prove Foremention can support one adjacent market without distracting from the primary beachhead.

Required before broad launch:

- market-demand fields are captured in the customer-research/commercial source of truth;
- candidate has evidence-backed demand and accountable commercial owner;
- scorecard is populated with sources;
- provider/model evaluation passes for the actual requested language/market;
- locale/market/language provenance is preserved in immutable measurement snapshots;
- canonical comparison identity is hardened to fail closed on regional/language mismatch;
- regional comparison tests pass;
- schedule semantics are hardened if local wall-clock execution is promised;
- billing/invoice/tax path is reviewed;
- processor/data-governance requirements are reviewed;
- residency claims are either explicitly unsupported or fully verified;
- support owner/hours/language are explicit;
- launch scope states both supported and unsupported capabilities.

**Preferred complexity profile:** when demand is otherwise comparable, prefer a Market #2 that can reuse the English UI and existing operating model. This is a complexity preference, not a predetermined country choice; stronger real demand overrides it.

Do **not** prebuild for Market #2 unless the winning opportunity requires it:

- broad UI translation;
- multi-region storage;
- many local payment methods;
- regional benchmark product;
- country-specific product fork.

## 51. Before Market #3

**Goal:** prove expansion is repeatable rather than founder exception-handling.

In addition to Market #2 gates:

- Market #2 has real activation/retention/commercial evidence, not signup volume alone;
- support/onboarding playbook is reusable;
- provider evaluation harness can add a market without bespoke one-off analysis;
- provider capability registry is versioned;
- comparison gate has one canonical implementation across customer surfaces;
- data-governance/processor review is repeatable;
- finance can report original-currency revenue/cost correctly;
- market-specific invoice/terms owners are defined;
- market-level support and provider cost are measurable;
- primary-market reliability/support has not materially degraded.

**OPERATING POLICY:** Market #3 should ideally introduce one major new complexity dimension at a time—new tax/contracting environment, materially different provider geography, or new billing currency—rather than combining every new complexity unless a high-value contract justifies it.

## 52. Before Market #4

**Goal:** earn the right to enter a structurally different market.

Market #4 may justify the first major language/localization or residency leap, but only if demand makes it the correct choice.

### If Market #4 requires translated UI

Require:

- locale resolver/catalog runtime;
- centralized date/number/currency formatters;
- text-expansion/reflow/accessibility QA;
- multilingual golden-set thresholds;
- buyer-question translation provenance;
- language-specific evidence QA;
- cross-language comparison remains fail closed;
- local-language support ownership;
- product/support/legal translation review process.

### If Market #4 requires regional residency

Require:

- explicit tenant placement architecture;
- regional database/storage behavior;
- cross-region write protections;
- backup/restore/export/delete verification;
- regional job/observability/admin paths;
- residency acceptance test;
- processor register for the target configuration;
- reviewed customer-facing contractual wording.

### If it requires both

Require executive review of:

- opportunity value;
- implementation cost;
- support cost;
- provider cost;
- gross-margin impact;
- security/reliability complexity;
- opportunity cost against primary-market PMF.

---

# K. International Readiness Backlog

## 53. Do now

No speculative international runtime build is required today.

Do now:

1. keep the UI English-first;
2. preserve locale/market/timezone provenance already captured;
3. document that current exact comparison does not include locale/market;
4. route international-demand evidence into customer-research/commercial truth systems;
5. treat provider regional/language quality as `not_evaluated` until tested;
6. keep billing server-authoritative and fail closed;
7. keep tax/residency/legal claims unknown until verified;
8. keep regional benchmarks disabled/future-gated;
9. retain the local-wall-clock recurrence limitation as a correctness item before that behavior is promised.

## 54. Build when a real Market #2 candidate appears

- demand scorecard/decision record;
- target-market provider capability evaluation;
- golden buyer-question/evidence set;
- immutable regional/language measurement context;
- exact comparator hardening for locale/market and any material geo/retrieval dimension;
- comparison reason codes/tests;
- schedule timezone hardening if locally scheduled execution is part of scope;
- contracting/privacy/tax/residency checklist;
- market-level support/cost model.

## 55. Build when the first translated UI is justified

- locale resolver;
- message catalogs;
- centralized formatters;
- translated system-email/export workflow;
- localized metadata/SEO only for real localized public routes;
- translation provenance/QA;
- text-expansion/reflow/accessibility suite;
- RTL only if required.

## 56. Build when the first residency commitment is justified

- tenant home-region/data-governance profile;
- regional data/control-plane strategy;
- cross-region write guardrails;
- region-aware background jobs;
- region-aware backup/restore/delete/export;
- regional observability/admin/support controls;
- residency acceptance suite;
- contract wording checked against verified architecture.

## 57. Build when regional benchmarks are justified

- permission/contract policy;
- anonymized cohort builder;
- small-cell suppression;
- versioned benchmark definitions;
- market/language/provider/methodology comparability gates;
- statistical uncertainty reporting;
- deletion/recomputation policy.

---

# L. Decision Records

## 58. Market-decision template

```markdown
# Market decision — <market key>

Status: researching | pilot_only | approved | deferred | retired
Decision date:
Owner:

## Demand evidence
- contracted requirement:
- paid pilot requirement:
- retained-customer expansion requests:
- qualified opportunity blockers:
- repeated discovery signals:
- evidence references:

## Scorecard
- customer demand:
- revenue potential:
- provider coverage:
- language quality:
- legal/privacy complexity:
- support burden:
- competitive landscape:
- payment/billing:
- data residency/processors:
- localization cost:
- total:

## Hard gates
- product quality:
- regional comparability:
- billing/tax:
- privacy/legal:
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
Known direct cost:
Known support cost:
Unknowns:

## Decision
Proceed | pilot only | defer
Reason:
Review date:
```

## 59. Capability truth table

Maintain only when multiple markets are real:

| Capability | Primary market | Market #2 | Market #3 | Market #4 |
| --- | --- | --- | --- | --- |
| UI language | English | UNKNOWN | UNKNOWN | UNKNOWN |
| Buyer-question language | English-first; locale provenance seam exists | UNKNOWN | UNKNOWN | UNKNOWN |
| Exact regional trend protection | Not yet locale/market-aware | REQUIRED BEFORE #2 | UNKNOWN | UNKNOWN |
| Provider/model quality | evaluate per configured provider/model | UNKNOWN | UNKNOWN | UNKNOWN |
| Retrieval geography | provider-specific; no broad promise | UNKNOWN | UNKNOWN | UNKNOWN |
| Billing currency | configured Stripe Price truth only | UNKNOWN | UNKNOWN | UNKNOWN |
| Tax treatment | requires actual setup/review | UNKNOWN | UNKNOWN | UNKNOWN |
| Data residency | no customer-selectable promise established | UNKNOWN | UNKNOWN | UNKNOWN |
| Support language/hours | current operating setup | UNKNOWN | UNKNOWN | UNKNOWN |
| Benchmark eligibility | not launched | UNKNOWN | UNKNOWN | UNKNOWN |

Never replace `UNKNOWN` with a flag icon or green check because a vendor page says it supports a country.

---

# M. QA + Release Gates

## 60. Automated tests when a market/language feature is built

Add focused tests for relevant behavior:

- locale parsing/fallback;
- language-tag validation;
- timezone validation;
- DST/local-wall-clock recurrence when promised;
- date/number/currency formatting;
- long-string/text-expansion layout contracts;
- question translation provenance;
- immutable run snapshot preservation;
- comparison withheld when language changes;
- comparison withheld when market changes;
- comparison withheld when regional provenance is missing;
- comparison allowed when all required regional dimensions match;
- provider capability-status gating;
- region/tenant isolation if residency exists;
- billing price-book server authority;
- benchmark small-cell/privacy rules.

## 61. Manual acceptance for every launched market

- real target-market buyer-question set;
- target-language reviewer when relevant;
- provider answer/citation/evidence inspection;
- locally natural terminology review;
- refusal/error/partial-result handling;
- local timezone display/scheduling verification when promised;
- desktop/mobile/reflow/accessibility checks;
- invoice/payment journey when enabled;
- privacy/subprocessor/data-location statement review;
- support escalation rehearsal;
- exact customer-facing capability statement review.

## 62. Release claim rule

A market is not "supported" merely because:

- the website loads there;
- a card can be charged there;
- a provider can emit the language;
- a database vendor offers a region;
- an AI translation looks fluent;
- one API call succeeded;
- one prospect asked for it.

A supported market has an explicit launch decision, evidence-backed product quality, a truthful comparison boundary, commercial/legal path, data-governance answer, support ownership, and documented scope.

---

# N. Recommended Current Decision

## 63. Decision as of recovered `main`

**OPERATING POLICY — preserve the existing English-first beachhead and make future international expansion evidence-driven.**

Current decisions:

- Market #2: **UNKNOWN**
- Market #3: **UNKNOWN**
- Market #4: **UNKNOWN**
- First translated UI language: **UNKNOWN**
- First additional billing currency: **UNKNOWN**
- First customer-selectable residency region: **UNKNOWN**

Foremention is **partially international-ready at the provenance layer** because recurring measurement can preserve locale/market context, an IANA timezone is validated, and provider prompts can carry locale metadata.

Foremention is **not yet region-safe for longitudinal comparison** because the canonical exact comparator does not currently include locale/market in slot identity.

Foremention is **not internationally commercialized by evidence in this repository** because demand, regional provider quality, legal/tax setup, local billing requirements, residency, support burden, and localization requirements are not proven for a second market.

That is the correct present state.

## 64. Why this Chat 18 pass is documentation-only

No runtime/schema changes are introduced by this pass because:

- verified second-market demand is not established here;
- broad localization would be premature;
- comparison hardening should be implemented against the concrete Market #2 measurement model rather than guessed provider geography fields;
- multi-currency/tax/residency implementations depend on actual commercial/legal requirements;
- regional benchmark infrastructure has no defensible current cohort requirement;
- parallel customer-research/commercial work is the correct source for demand evidence.

The two technical issues explicitly elevated for a future Market #2 candidate are:

1. **regional comparison identity:** add locale/market and any material provider geography/retrieval context to the canonical exact comparison gate and its tests;
2. **local scheduling semantics:** replace UTC-only recurrence arithmetic if Foremention promises preserved local wall-clock execution across timezone/DST changes.

Neither should be hidden behind an international marketing claim before it is implemented and verified.

## 65. Definition of ready to choose Market #2

Foremention is ready to choose Market #2 only when it can answer, with evidence:

1. Which qualified customers are asking for it?
2. What contracted, expansion, or credible pipeline value is attached?
3. Which exact buyer-question language(s) matter?
4. Which providers/models work there, and what do evaluations show?
5. What retrieval/search geography is actually controllable?
6. Can Foremention preserve regional provenance and fail closed on non-comparable runs?
7. What product/localization work is truly required?
8. What contracting, tax, invoice, currency, and payment constraints are real?
9. What storage, processing, processor, transfer, and residency constraints are real?
10. What support language/timezone/SLA burden exists?
11. What does the market cost to launch and support?
12. What evidence would cause Foremention to defer or exit?

Until those answers exist, the strategically correct international feature is **discipline**.
