# FM-07 — Measurement, AI Evaluation and Cost Intelligence
**Checkpoint:** 2026-10-09 UTC; `main` at `d4fea60a7bb8e047f2282cea9134121e9496c67e`
**Owner:** FM-07 only. **Integration authority:** FM-00. **Status:** repository and connected-PostHog inspection; no verified production release, live Sentry project, production Supabase ledger query, invoice reconciliation or verified revenue data.

## Source of truth and conflict control
- Constitution: `CLAUDE.md` and `FOREMENTION_STATE.md`. Public product is Recommendation Intelligence for B2B software; Change Specification is the company decision, Recommendation Record is the measurement object; no Source X-Ray product or event.
- Existing first-party implementations: `lib/product-analytics-contract.ts`, `lib/product-analytics.ts`, `lib/pmf-metrics.ts`, `lib/evaluation/*`, `scripts/*ai-evaluation*`, `lib/sentry-privacy.ts`, `lib/company-operational-cost-readiness.ts`, and Supabase operational-cost and provider-attempt migrations.
- Open conflict boundary at inspection: PRs #459 (measurement citations and pinned Gemini), #457 (gateway pinning), #458 (repeat-cycle reliability), #455 (answer-set integrity), #446 (billing), #440 (comparable second-cycle UX). They are **not on main** and must not be counted as shipped.
- PostHog connected project is "Default project", UTC, organization group type registered. SDK project token in the repo matched the connected project. 2026-10-09 event taxonomy listed `$pageview`, `performance_observed`, `design_partner_cta_impression`, `score_viewed`, `category_page_viewed`, `design_partner_page_viewed`, `workflow_completed`, `auth_session_established`, and `research_page_viewed` among observed recent events. This proves ingestion of those event names, **not a working full customer funnel**. IP anonymization was false at project level; privacy owner must configure or justify it. A catalog metric read was blocked by missing `data_catalog:read` MCP scope. Do not invent counts.
- Live endpoint and infrastructure invoice verification were inaccessible. Existing migration SQL is not proof it is applied. No claims about production Sentry DSN, alert rules, costs, paid pilots, ARR or retention are established by this audit.

## Event dictionary: privacy-safe browser signals
Properties are strictly allowlisted in `sanitizeProductAnalyticsEvent`, with unknown properties removed. Captures below are **behavioral telemetry**, not durable commercial proof. The application is production-hostname-gated, disables autocapture/replay, uses UUID-only identification and normalized organization groups. The event names are exact contract names.

| Event(s) | Observable fact; allowed details | Authority and limitation |
|---|---|---|
| `$pageview` | Allowed `surface` enum | Navigation only; cannot prove completion |
| `score_viewed`, `score_started`, `score_completed`, `score_failed`, `score_cta_clicked` | View/start, score-result DOM detection, failure; shared flag/count bucket/category | Client outcome is not a durable score record |
| `signup_started`, `signup_completed`, `auth_session_established` | Email/Google intent; auth response confirmation flag; workspace entry surface | Server auth identity/session is authoritative |
| `activation_setup_started`, `activation_context_ready`, `activation_setup_failed`, `activation_setup_completed` | Setup stages; source/quality/bucket or error category | Server workspace configuration and question rows are authoritative |
| `question_created`, `buyer_question_status_changed`, `buyer_question_updated` | Buyer-question interactions; category enum/status boolean | Use persisted distinct, active, reviewed questions for count of five |
| `workflow_started`, `workflow_completed`, `workflow_failed` | Attempt/client lifecycle and bounded source/provider/outcome/failure descriptors | A finalized first real run requires persisted run + attempts + answers; UI completion is insufficient |
| `ai_result_viewed`, `citation_result_viewed`, `recommendation_record_viewed` | Record/result UI interactions | Inspection event is not evidence review or provenance validation |
| `source_map_opened`, `evidence_inspection_opened`, `evidence_review_completed` | Evidence interaction, reviewed dimensions (booleans/enums) | Require persisted reviewer/decision to count human review |
| `comparison_viewed`, `comparison_eligibility_observed` | Comparison screen and eligibility boolean | Only exact persisted eligible run pairs support retention |
| `decision_insight_reached`, `first_record_reviewed` | Evidence-generated actionable gap and first review UI milestone | Human-reviewed persisted Recommendation Record/opportunity is authority |
| `action_created`, `second_comparable_cycle_completed` | Action interaction and longitudinal UI milestone | Join persisted Change Specification, decision ownership and exact comparable remeasurement |
| `measurement_schedule_enabled` | Schedule cadence/state | A scheduling preference is not proof execution occurred |
| `record_share_created`, `record_share_viewed`, `record_share_workspace_cta_clicked` | Share actions, mode, evidence inclusion | No customer or revenue inference |
| `team_invite_sent` | Invitation role | Invite ≠ active account or activated user |
| `category_page_viewed`, `research_page_viewed`, `partner_page_viewed` | Public information-interest events | Non-commercial |
| `design_partner_cta_impression`, `design_partner_cta_clicked`, `design_partner_page_viewed`, `design_partner_application_started`, `design_partner_application_submitted` | Public-funnel events; CTA placement enum for impression/click | **Submission event currently checks a client-visible `submitted=1` URL parameter**; the persisted design-partner intake is the canonical application record, not this event |
| `performance_observed` | Page/API latency bucket, operation, outcome, status class | Sampled browser/visitor view, not an SLO denominator for all API requests |

Legacy aliases `onboarding_*`, `collection_*`, `reviewed_opportunity_created`, and `source_xray_*` normalize to canonical events. No new standalone Source X-Ray analytics event is allowed. In `public-activation-analytics.tsx`, attempted `sample_opened` and `evidence_inspected` event names are *not* allowed by the contract and are silently dropped. Fix only through a reviewed FM-00 event-contract change or remove those dead captures.

## Metric dictionary: source, grain, population, minimum evidence
Every metric has a report window, ingestion/extraction timestamp, numerator, denominator, eligibility logic, version, missingness and source lineage. **Unknown is NULL / unavailable, not zero.** Distinguish visitor, user, organization, run, attempt, source and decision grains.

| Measure | Definition, numerator / denominator and authoritative records |
|---|---|
| CTA impression-to-click | Distinct eligible website visitor sessions with CTA click / sessions with visible CTA impression; PostHog behavioral diagnostic. Do not interpret as unique potential customers. |
| Application completion | Server-persisted valid new design-partner applications / eligible application starts for a comparable cohort; browser-only approximation must be labeled noncanonical. |
| Signup completion | Real server-created auth accounts / observed eligible starts; first-party auth is numerator authority; distinguish pending email verification. |
| Onboarding completion | Distinct eligible organizations with persisted configured workspace / newly eligible organizations started; no demo or internal data. |
| Five questions | Distinct eligible organizations with **five active, reviewed buyer questions** / eligible onboarded organizations; active question rows and review state, not `question_count_bucket`. |
| First live run | Eligible organizations with a terminal, persisted, nonmock first live measurement with complete answers / eligible organizations with five approved questions. Exclude unpinned provider/model identity from comparative research. |
| Record inspected | Eligible organizations with UI inspection events tied to one real completed run / eligible organizations with first completed run; user-behavior metric, not human-review proof. |
| Human-reviewed first value | Eligible organizations with persisted first human-reviewed Recommendation Record / organizations with first live run; reviewer, timestamp, review state and evidence lineage required. |
| Opportunity creation | Eligible organizations with at least one evidence-gated, persisted opportunity / organizations with a reviewed first Record. |
| Change Specification ownership | Eligible organizations with a persisted approved/assigned Change Specification / organizations with reviewed opportunity. Include decision owner, acceptance, applied reference, and review status separately. |
| Follow-through | Approved Change Specifications with verifiable recorded application / approved Change Specifications; exclude draft, proposed and automated-only action. |
| Second comparable reviewed cycle | Eligible organizations with an exact-compatible, later **reviewed** paired measurement (at least one week after baseline for early retention) / eligible activated organizations with cohort maturity disclosed. No evidence of causal lift. |
| PMF activation rate | See canonical `PMF_METRIC_DEFINITIONS.activation_rate`: first configured workspace, five questions, first measurement, reviewed Record, assigned action / KPI-eligible organizations. |
| WAU / MAU accounts | Distinct KPI-eligible organizations with meaningful first-party activity in trailing 7 / 30 days; never seats or pageviews. |
| Rolling retained account rate | KPI-eligible organizations active in both current and prior 30-day windows / eligible organizations active in prior 30 days. Cohort report separately. |
| Time to first value / second cycle | Median elapsed hours; withhold median under 5 eligible observed organizations per existing PMF contract. |
| Design-partner-to-paid | Accepted external design partners with independently verified payment / accepted external design partners. Submission, acceptance and payment are three different stages. |
| Paid conversion, MRR, ARR, churn | From verified contracts/subscription ledger, payment status, billing intervals, refunds and cancellation effective dates. No unverified MRR, annualization, ARR, churn or logo count. Billing setup and ledger code alone are not revenue. |
| SLO availability and error budget | Successful eligible first-party operations / eligible eligible service requests with exact route exclusions and monitor period; error budget = allowed failures minus actual failures. Define SLO and alert policy with FM-06/08 before publishing. |
| Provider success / latency / retries | Successful or failed terminal provider attempts / all terminal eligible attempts; p50/p95 per provider, model and attempt. Distinguish user cancellations, queue failures and timeouts from provider faults. |
| AI cost per run | Sum distinct durable provider-attempt cost events by `run_attempt_id`; include zero/unknown classifications separately. Mark provider-reported vs price-estimated cost and retry cost. |
| All-in cost per reviewed decision | Verified external direct AI + allocated infrastructure/customer support costs / external human-reviewed decisions; unavailable without invoice/meter completeness and allocation policy. |
| Gross margin / retention economics | Verified recognized revenue less reconciled COGS; currently unverified. Costs alone do not imply margin or LTV/CAC. |

**Canonical cohort classification:** Only organizations explicitly included by `company_organization_classifications` as real design partners/customers qualify for business KPIs. Prospect, demo, internal, seeded, benchmark, unidentified, synthetic and unknown are excluded. No inferred external classification from email domain.

## Data lineage, quality and production checks
1. Web UI -> `captureProductEvent` -> strict contract and `before_send` allowlist -> PostHog browser ingestion -> UTC event table. Audit event loss at disabled-host/identity boundaries, duplicates, delayed events, bot/preview traffic, and data retention. Client app has production domain guard but `PostHog` project-level IP anonymization was disabled at inspection. Obtain privacy review of retention, IP handling, consent, deletion and processors.
2. Auth/workspace/question -> Supabase first-party relational records -> reviewed milestone selection -> `derivePmfMetrics` -> operator-only KPI view. Audit temporal ordering, distinct organization IDs, eligible classification as-of time, absent records, timestamps and cohort maturity. PostHog must not become payment or approval authority.
3. Provider request -> run attempt -> `ledger_run_attempt_cost` trigger -> `ai_cost_events` `run_attempt_id` unique -> cost-source class -> operator-only `provider_attempt_operational_facts` and `company_operational_cost_readiness`. Migration presence is not deployment proof. Compare 1:1 terminal charged attempt receipts to ledger; cost may be nonbillable or missing if no cost recorded; do not force null to zero.
4. Infrastructure -> source invoice/meter hash + period -> `infrastructure_cost_allocations` -> audited organization allocation -> reconciliation -> unit economics. Period cut-off logic may omit overlapping invoices; track unallocated spend and late-arriving adjustments.
5. AI answer -> native citations vs independently retrieved URLs -> retrieval/evidence review -> exact provider/model/prompt/parser/retrieval/policy versions -> golden dataset -> release eval. Retrieval truth and human review must remain separate.

**Automatable checks to add with owners:** freshness SLA and late-arrival watermark; accepted enum drift; unique client milestone/event de-duplication; null foreign keys; parent organization/project authorization (FM-05); terminal-attempt / ledger mismatch (FM-05/06); mixed-internal cohort exclusion; model/version mismatch (FM-01); run-pair completeness (FM-01/06); released SHA versus production SHA (FM-08). Apply safety/privacy redaction before diagnostics; never export prompt, answer, citation text or customer PII to observability by default.

## Evaluation matrix and release evidence
| Dimension | Current implementation or required ground truth |
|---|---|
| Retrieval precision/coverage | Returned distinct canonical URLs against reviewer-curated relevant-reference set; withhold unknown denominator |
| Citation survival | Returned citation retrievability, not semantic credibility; inaccessible expected negatives evaluated separately |
| Evidence correctness | Reviewer-assessed page/claim matches with provenance and review date |
| Evidence-state and classification accuracy | Curated labels vs observation; includes missing, contradictory, stale and inaccessible evidence |
| Duplicate detection | Canonicalized URL duplicate-set equality |
| Unsupported conclusion / hallucination | Reviewed assertion labels; missing assertions must not silently become `supported` |
| Comparative eligibility | Exact pinned model/prompt/question/methodology and complete paired evidence; noncomparable runs excluded |
| Prompt injection and manipulation | Synthetic malicious-source scenarios with no instruction following, secret disclosure or fabricated conclusions |
| Provider failure and latency | Exact error reason, missing data, retry path, provider/model dimensions, p50/p95 and cost source |
| Version drift | Prompt, parser, provider, model, model version, retrieval, policy, schema and evaluator versions recorded together |
| Human decision relevance | Blind, annotated reviewer rating with adjudication; no fabricated user value or causal ROI |

Existing golden dataset contains 15 **synthetic** categories and no live-provider benchmark. `evals/promptfooconfig.yaml` is a native deterministic safety-boundary suite, **not model superiority evidence**. `scripts/verify-ai-evaluation-gate.mjs` currently supplies default `assertions: [{support:"supported"}]`, `outputStructureValid: true`, zero costs and synthetic latency for fixture rows missing fields. Those defaults are **simulated fixture conveniences**; gate results must be labeled deterministic regression only, and must not be treated as observed costs or real model accuracy.

**FM-07 bounded patch:** strict case coverage added to `lib/evaluation/release-quality-gate.mjs`, plus negative tests in `tests/fm07-release-quality-integrity.test.mjs`. It rejects missing, duplicate, unknown, recategorized and malformed case IDs even where aggregate count matches. This does not certify the live models, deployed app or real customer outcomes.

## Technology decisions and scoring
Weighted architecture-fit rubric (judgment, not measured performance): customer relevance 20, data correctness 15, privacy/provenance 15, integration effort 15, running cost 10, ongoing maintenance 10, reliability 10, testability 5; 0–5 per dimension; hard rejection for fake traction, unsafe payload logging or model comparisons missing pinned identity. Compare each tool **within its own role**, not as a single vendor leaderboard.

| Tool | Decision | Role and evidence boundary |
|---|---|---|
| PostHog | **KEEP / IMPROVE** | Already integrated with strict client contract and observed ingestion. Audit consent/IP retention, lost/uncaptured events and authoritative transaction joins before any executive funnel. No second product-event system. |
| Sentry | **KEEP / VERIFY** | Browser/cloudflare SDK and PII scrubber exist. Verify configured DSNs, SDK path, source maps, release tags, sampling, alerts and production error-event delivery. Do not assert live Sentry is working without account evidence. |
| Custom eval harness | **KEEP / IMPROVE** | Versioned synthetic golden cases, numerator/denominator metrics, privacy gate, drift checks. Add exact case-set check, reviewer provenance, blind holdout, multiple model observations and meaningful live test gating. |
| Promptfoo | **KEEP** | Already pinned in CI, runs deterministic zero-network source safety checks. Its config executes user-provided code; only run reviewed eval inputs in isolated CI. MIT license. |
| Langfuse | **DEFER / bounded experiment** | MIT self-hosted AI tracing and evals; potentially useful when native span/run visibility is insufficient. Requires sanitized traces, stable provider attempt IDs and infra/retention review; not a replacement for financial ledger. |
| Arize Phoenix | **DEFER** | OpenInference/OTel traces and evaluations; ELv2 self-host license. Prefer as focused eval/debug prototype only if native harness lacks required depth, not alongside a duplicate Langfuse pipeline. |
| Helicone | **DEFER** | Apache-2.0 gateway/observability. Gateway proxy adds a boundary and can alter cost/provenance/accounting; avoid during measurement-lane pinning unless FM-01 approves exact identity and request semantics. |
| OpenMeter | **DEFER** | Apache-2.0 usage metering and billing. Existing DB ledgers are sufficient for Stage 0; adopt only if externally billable usage volume and reconciliation require a dedicated metering system. |

Vendor license/pricing and product-feature terms require dated procurement confirmation before an adoption decision. Model-vendor scores must be blind paired measurements on the same corpus and same budget with explicit abstentions; architectural judgments above are **not** benchmark results.

## Red / green / verify handoff
- **RED:** synthetic release quality gate could accept duplicated observations while omitting another golden category; PostHog project IP anonymization off; full funnel not observed; production DSN and invoiced costs unavailable; URL-param submission analytics can be spoofed; release fixture defaults mimic assessed output quality.
- **GREEN proposed via FM-07 PR:** case-set integrity validator + four negative tests; no shared schema, UI, provider or orchestration modifications.
- **VERIFY still required:** `node --test tests/fm07-release-quality-integrity.test.mjs`, `node scripts/verify-ai-evaluation-gate.mjs`, full `pnpm test`, lint, typecheck, build, security, exact-head CI and deployment evidence. **Do not merge until green.**

## FM-07 continuation packet to FM-00
- **Branch:** `fm07/evaluation-case-integrity-20261009`.
- **Base main SHA:** `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
- **Owned touched files:** `lib/evaluation/release-quality-gate.mjs`, `tests/fm07-release-quality-integrity.test.mjs`, this new handoff document.
- **Changes:** fail-closed golden-case identity and category validation; synthetic-only coverage regression tests.
- **External dependencies:** FM-01 provider model identity/usage quality; FM-05 applied migration + cohort classification; FM-06 terminal attempt ledger and schedules; FM-08 production DSN/alert/source-map/release verification; FM-03 chart/UX display; FM-00 event contract and cutover.
- **Release blockers:** green tests on exact PR SHA, production telemetry validation, missing-scope catalog query, project-level IP privacy decision, independent real billing and customer proof evidence.
- **Non-claims:** no verified external customers, new signed pilots, ARR, model winner, production cost margin, live Sentry delivery or current production SHA established in this FM-07 review.
