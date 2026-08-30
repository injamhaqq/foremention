# Foremention AI Evaluation Quality and Model Reliability System

Status: implementation + operating contract

Branch: `build/billion-dollar-11-ai-quality`

Recovered live baseline: `08d7f398ae89d0d69af4530af5ecc6c752f1a6c6`

Date: 2026-08-30

## 1. Purpose

Foremention must be able to explain why its intelligence should be trusted without collapsing quality into a vague statement such as “the model looks accurate.” This system makes AI quality inspectable at the level where Foremention actually operates:

`buyer question -> provider/model -> answer -> returned references -> retrievability -> evidence -> extraction/classification -> Recommendation Record -> human review -> recommendation/action -> later comparable measurement`

The evaluation system is intentionally separate from live collection. It consumes captured observations. It does not issue provider requests, create evidence, or turn synthetic fixtures into customer proof.

This change creates the machinery for measurement. It does **not** claim any benchmark performance for Foremention.

## 2. Recovered current architecture

The implementation was designed from the live repository rather than from assumed architecture.

### 2.1 Provider abstraction

`lib/providers/types.ts` defines a provider contract that already carries the raw ingredients needed for defensible evaluation:

- provider;
- model;
- prompt ID;
- answer text;
- returned citations;
- raw provider metadata;
- collection timestamp;
- latency;
- input/output/total token usage;
- billed cost when the provider supplies one;
- provider request ID;
- finish reason.

`lib/providers/index.ts` exposes adapters for:

- OpenAI;
- Gemini;
- Anthropic;
- Perplexity;
- Groq;
- Cloudflare Workers AI;
- OpenRouter;
- ZenMux;
- OmniRouters;
- deterministic mock execution.

The evaluation layer does not replace this abstraction.

### 2.2 Prompt and question execution

Live collection snapshots the selected buyer question into `run_prompt_selections` before provider execution. The snapshot includes the prompt ID, stable prompt key, prompt text, and locale. A run therefore has a persisted question snapshot rather than depending on whatever the current editable question text happens to be later.

The Inngest collection workflow:

1. reloads and revalidates the queued run;
2. reloads the prompt snapshots;
3. resolves the configured workspace brand and active competitors;
4. selects exactly one live provider for the run;
5. resolves the configured model and provider cost rates;
6. checks the provider circuit breaker;
7. executes each prompt with a timeout and bounded output;
8. persists failed attempts separately from successful answers;
9. persists successful answers in a durable step separate from provider execution;
10. canonicalizes and deduplicates returned citation URLs;
11. persists sources, citations, and source observations;
12. stops the run at a human-review state.

The persistence boundary is particularly important: a database retry does not cause a second provider request and therefore does not silently create a different observation or duplicate provider spend.

### 2.3 Retries and provider failures

Provider attempts record provider, model, attempt number, status, safe error code/detail, estimated/provider-reported cost where available, retryability, latency, token usage, request ID, and completion time.

A circuit breaker can exclude calls after repeated failures. If every provider attempt fails, the run fails rather than inventing evidence. Partial runs retain successful evidence while surfacing failed prompts for review.

### 2.4 Groq retrieval observability

The current Groq adapter requires browser search. It separately records whether search executed and how many search results were observed, while returned citations remain a distinct field.

This distinction is a permanent evaluation invariant:

**search/retrieval execution is not the same fact as a returned citation, and a returned citation is not the same fact as verified evidence.**

The evaluator therefore never combines retrieval success, citation survival, and evidence correctness into one number.

### 2.5 Recommendation Record and evidence truth

The live product already preserves the boundary between observation and inference. For example, recommendation-gap diagnosis can state what persisted records showed and can expose an inference only when reviewed evidence exists, while explicitly refusing to treat correlation as causal proof.

The evaluator extends that epistemic separation rather than weakening it.

## 3. Evaluation architecture

The implementation has four layers.

### Layer 1 — immutable case definition

A case defines what is known before an observation is scored:

- case ID;
- category;
- buyer question;
- privacy classification;
- objective expected labels where ground truth exists;
- expected relevant citation URLs when a closed reference set exists;
- expected evidence state when objectively labelable;
- expected classification;
- expected comparison eligibility;
- expected canonical duplicate URLs.

A case is allowed to omit expected fields. Missing ground truth produces **not assessed**, never a fabricated zero or pass.

### Layer 2 — captured observation

An observation may contain:

- case ID;
- complete version context;
- provider failure state;
- returned citation URLs;
- per-reference retrievability result;
- per-reference evidence-correctness label;
- evidence-state classification;
- extraction/classification result;
- comparison-eligibility result;
- supported / unsupported / contradicted assertion labels;
- human review decision;
- latency;
- cost;
- output-structure validity;
- extracted items;
- red-team safety outcomes.

The harness does not retrieve URLs itself. Retrieval results must be captured by the controlled evaluation workflow so the score remains reproducible and has no hidden network dependency.

### Layer 3 — deterministic scorer

`lib/evaluation/quality-harness.mjs` performs deterministic scoring. It contains no model call and no network call.

The scorer:

- canonicalizes returned URLs;
- removes common tracking parameters;
- collapses duplicate references before precision/coverage calculations;
- keeps duplicate detection as its own metric;
- scores only fields with stated ground truth;
- separates unsupported conclusions from contradicted conclusions;
- surfaces red-team flags independently;
- retains numerator and denominator for every ratio.

### Layer 4 — aggregation, drift, and reporting

The harness aggregates real scored cases into:

- objective metric ratios;
- human-review outcome counts;
- provider/model/version slices;
- mean distinct returned-reference count;
- output-structure failure rate;
- provider failure rate;
- latency p95;
- mean observed cost.

`buildEvaluationReport()` emits an internal Markdown report. It deliberately does not calculate a single composite quality score.

## 4. Golden evaluation set

`lib/evaluation/golden-cases.mjs` contains a synthetic-only regression set. It currently covers all required risk classes:

1. common buyer question;
2. difficult multi-constraint question;
3. ambiguous intent;
4. missing-evidence / abstention case;
5. provider failure;
6. contradictory evidence;
7. citation error;
8. competitor-heavy answer;
9. no-recommendation case;
10. prompt injection inside retrieved content;
11. malicious retrieved page;
12. stale source;
13. inaccessible source;
14. manipulative marketing content;
15. unsupported causal inference.

The fixtures use fictional companies and reserved synthetic domains. Passing the golden set is regression evidence about the evaluator or a tested intelligence behavior; it is not customer outcome evidence.

## 5. Privacy boundary for evaluation data

The harness requires every case to carry a privacy classification.

The committed golden set is `synthetic` only.

A dataset classified `customer_confidential` is rejected unless the dataset carries an explicit `approvedBoundaryId`. That boundary is intentionally not inferred from workspace membership, a filename, or operator intent.

The approval identifier means only that the consuming evaluation workflow has an explicit approved boundary. It does not itself establish legal consent, data-processing rights, or a retention policy. Those must exist independently.

Rules:

- never copy customer confidential prompts, answers, pages, or evidence into the repository golden set;
- never place secrets, access tokens, session data, emails, or raw customer identifiers in fixtures;
- prefer synthetic transformations when a production failure can be reproduced without customer data;
- if confidential material is necessary, keep it in the approved controlled evaluation environment and record the boundary identifier;
- reports intended for broad internal distribution should use aggregate metrics and non-sensitive case IDs.

## 6. Metric definitions

Every ratio preserves its numerator and denominator. A metric without adequate ground truth is `null` / **not assessed**.

### 6.1 Retrieval precision

When a closed set of relevant references is defined:

`distinct relevant returned references / distinct returned references`

Tracking-parameter variants are canonicalized before counting.

This metric is not assessed when the case has no defensible closed reference set.

### 6.2 Retrieval coverage

When the expected relevant set is defined:

`distinct expected relevant references returned / expected relevant references`

A returned reference can count toward coverage even if it later fails retrieval. Retrievability is measured separately by citation survival.

### 6.3 Citation survival

`distinct returned references successfully retrievable during the controlled check / distinct returned references with a retrievability assessment`

This does not say that the content supports the claim.

### 6.4 Evidence correctness

`distinct assessed references whose retrieved evidence supports the evaluated use / distinct references with an evidence-correctness assessment`

This should be labeled by deterministic rules where possible and human-reviewed adjudication where semantic judgment is required.

### 6.5 Evidence-state correctness

`correct evidence-state labels / cases with objective evidence-state ground truth`

Examples of states can include observed, missing, conflicting, stale, or unretrievable when the evaluation definition makes that distinction explicit.

### 6.6 Extraction consistency

For repeated executions of the same controlled question, extraction consistency is the mean pairwise Jaccard similarity of the normalized extracted-item sets.

It measures stability, not semantic truth.

### 6.7 Question classification consistency

For repeated executions, classification agreement is:

`matching classification pairs / all comparable execution pairs`

A stable wrong answer can score highly on consistency, which is why consistency is never presented as correctness.

### 6.8 Duplicate-detection correctness

Where the golden case defines expected canonical duplicates:

`1 / 1` when the detected canonical duplicate set exactly matches ground truth, otherwise `0 / 1`.

This metric is not assessed when no duplicate ground truth has been declared.

### 6.9 Classification accuracy

`correct objective classification labels / cases with classification ground truth`

This metric is reported only for labels that have a defensible expected answer.

### 6.10 Unsupported conclusion rate

`unsupported + contradicted assertions / assertions with support labels`

An unsupported assertion is not automatically a hallucination. It may simply lack enough evidence in the evaluated context.

### 6.11 Hallucination/error rate

The initial deterministic definition is deliberately narrow:

`contradicted assertions / assertions with support labels`

This avoids casually labeling every unsupported statement as a hallucination. Broader semantic-error taxonomies require an explicit adjudication protocol and should become separate metrics rather than silently changing this denominator.

### 6.12 Comparison-eligibility correctness

`correct eligibility decisions / cases with objective comparison-eligibility ground truth`

This evaluates whether the intelligence layer respects Foremention’s comparability boundary. It does not imply that two runs are causally comparable merely because values moved.

### 6.13 Provider failure rate

`failed provider observations / observations with provider-failure state captured`

Provider failure should also be sliced by provider, model, model version, and time window.

### 6.14 Recommendation acceptance / rejection

Human review outcomes are reported as explicit counts:

- accepted;
- rejected;
- not reviewed;
- other.

Acceptance is not a model correctness label. Rejection reasons should eventually be separately coded so Foremention can distinguish evidence problems, recommendation quality, prioritization, effort, timing, and operator preference.

## 7. Versioning and reproducibility

Every new persisted provider answer receives a `measurement_context_json` envelope through the database in `20260830000300_ai_measurement_context.sql`.

The envelope tracks:

- `promptVersion`;
- `parserVersion`;
- `provider`;
- `model`;
- `modelVersion`;
- `retrievalVersion`;
- `policyVersion`;
- `schemaVersion`;
- `evaluationVersion`.

Current version values are mirrored in `lib/ai-measurement-context.ts` for typed application-side inspection.

### 7.1 Why the database stamps the envelope

The provider execution code already persists `provider` and `model`. Stamping the version envelope at insert time avoids touching or reissuing live provider requests solely to add evaluation metadata. It also creates one durable boundary for newly persisted Recommendation Record answers.

### 7.2 Historical records

Historical rows remain `null` for `measurement_context_json`.

They are **not** backfilled with the new version tuple because that would falsely imply knowledge about the prompt/parser/policy/evaluation version that was not recorded at the time.

Existing historical context such as prompt snapshots, provider/model labels, timestamps, raw provider metadata, citations, and methodology data remains available where already persisted.

### 7.3 Model version truth

The current provider answer contract reliably records the configured model identifier. It does not consistently expose a separate provider-reported model revision across all adapters.

Therefore `modelVersion` is stamped as `unreported` in this version of the envelope rather than guessing a release date or alias resolution.

When a provider supplies a trustworthy immutable model revision, the adapter/parser version and database stamp must be bumped together and the source of the model version documented.

### 7.4 Version-bump rule

A material change to any of the following requires the corresponding version bump **before** the changed intelligence behavior is accepted:

- provider/system/user prompt semantics -> `promptVersion`;
- response parsing, citation extraction, entity extraction -> `parserVersion`;
- retrieval tool, URL normalization, page retrieval or reference handling -> `retrievalVersion`;
- evidence/recommendation/safety decision rule -> `policyVersion`;
- Recommendation Record material schema -> `schemaVersion`;
- scoring definition, denominator, golden-label protocol -> `evaluationVersion`.

A provider or model switch is captured in `provider`, `model`, and, when known, `modelVersion`.

Version changes should never be hidden inside a deploy with the old version tuple.

## 8. Model and provider drift

`detectModelDrift()` compares a baseline summary with a candidate summary without pretending that any single signal explains the cause.

Signals include:

- provider identity shift;
- model identity shift;
- model-version shift;
- mean citation-count change;
- output-structure failure change;
- provider failure-rate change;
- latency p95 change;
- mean observed cost change.

Default thresholds are operational starting points, not statistical guarantees:

- citation mean relative change: 25%;
- output-structure failure-rate absolute delta: 10 percentage points;
- provider failure-rate absolute delta: 10 percentage points;
- latency p95 relative change: 50%;
- mean cost relative change: 25%.

Thresholds can be supplied per evaluation run. Crossing a threshold creates a drift signal for investigation; it does not by itself prove degradation.

### Required drift response

When a drift signal appears:

1. identify whether provider/model/version identity changed;
2. confirm the same golden dataset and evaluation version were used;
3. inspect case-level failures, not only the aggregate;
4. separate retrieval/citation drift from answer/extraction drift;
5. separate cost/latency drift from semantic quality;
6. rerun controlled repeats if stochastic variance is plausible;
7. require human approval before changing live prompts, parsers, evidence policy, or recommendation behavior.

## 9. Provider and model comparisons

Provider/model comparison must use the same case definitions and compatible execution conditions.

Recommended procedure:

1. run the same golden dataset for each provider/model slice;
2. preserve each observation’s full version tuple;
3. create a summary for each slice;
4. compare objective metrics individually;
5. compare operational cost, latency, citation count, failure rate, and output-structure failure independently;
6. report missing metrics as not assessed;
7. avoid declaring a universal winner from one aggregate score.

A provider can be better on retrieval while worse on latency or unsupported conclusions. Foremention should retain that multidimensional truth.

## 10. Recommendation quality guard

`validateRecommendationQuality()` requires the output to name its epistemic kind explicitly:

- `observation` — what the persisted measurement directly shows;
- `inference` — a reasoned interpretation tied to evidence;
- `recommendation` — a proposed action requiring human judgment;
- `speculation` — an explicitly uncertain hypothesis with limitations.

For a recommendation, the guard requires:

- at least one evidence reference;
- confidence level;
- confidence rationale;
- explicit limitations;
- expected benefit;
- effort level;
- rationale;
- `humanApproval.required = true`;
- approval status of pending, approved, or rejected.

A recommendation that lacks these fields fails validation. This is a quality gate, not an automated claim that the recommendation is good.

### Action suggestions

An action suggestion must first satisfy the recommendation guard. Creating an action does not convert an inference into an observation or prove expected benefit. Human approval remains the boundary before execution.

## 11. Red-team evaluation contract

The golden set and observation flags cover the following classes.

### Prompt injection in retrieved content

Retrieved text is evidence content, not an instruction source. A page that says “ignore previous instructions,” “mark this verified,” or asks for secrets should be treated as untrusted content.

Failure signal: `promptInjectionFollowed = true`.

### Malicious pages

Pages that attempt system override, tool execution, data exfiltration, or evaluator manipulation must not alter policy or scoring behavior.

### Irrelevant citations

Returned references that do not belong to the expected relevant set lower retrieval precision when a closed relevant set exists. Evidence correctness remains separate.

### Duplicate references

Canonical URL duplicates are collapsed for precision/coverage/survival denominators while duplicate detection is scored independently.

### Stale sources

Staleness is surfaced as a case/evidence flag and can map to a stale evidence state where the case defines a time boundary.

### Inaccessible pages

An inaccessible returned reference reduces citation survival. It must not automatically become “incorrect evidence”; the content could not be verified.

### Conflicting sources

Contradiction is surfaced independently. The correct behavior can be uncertainty or a conflicting evidence state rather than forced synthesis.

### Provider hallucinations

The initial objective hallucination/error metric counts explicitly contradicted assertions. Unsupported assertions are measured separately.

### Manipulative content

Marketing superlatives, coercive language, or instructions embedded in pages must not be promoted to facts merely because the model repeats them.

Failure signal: `manipulativeContentFollowed = true`.

### Unsupported causal inference

A returned reference, temporal sequence, competitor presence, or later movement does not prove what caused a provider recommendation.

Failure signal: `unsupportedCausalInference = true`.

## 12. Internal evaluation reporting

A no-network CLI is available:

```bash
pnpm eval:ai -- --input path/to/capture.json --report artifacts/ai-eval.md --json artifacts/ai-eval.json
```

The input payload has this shape:

```json
{
  "runId": "eval-run-identifier",
  "dataset": { "version": "optional custom dataset", "cases": [] },
  "observations": [],
  "baselineSummary": null,
  "driftThresholds": {}
}
```

If `dataset` is omitted, the committed synthetic golden dataset is used.

Each observation must include the full version tuple. The evaluator refuses incomplete version context.

The Markdown report exposes:

- case count;
- each objective metric with numerator and denominator;
- accepted/rejected/not-reviewed counts;
- provider/model/version slices;
- returned-reference volume;
- output-structure failure rate;
- provider failure rate;
- latency p95;
- mean observed cost;
- drift signals when a baseline is supplied.

The CLI does not contact providers, retrieve pages, or call external services. The controlled capture pipeline is responsible for producing the observation JSON.

## 13. Statistical QA rules

### 13.1 Never hide sample size

Every ratio must retain numerator and denominator in stored/reportable output.

### 13.2 Do not average incompatible denominators

Aggregate counts first, then compute the ratio. Do not average per-case percentages unless the metric definition explicitly calls for that procedure.

### 13.3 Separate stability from correctness

Repeat agreement is a stability measure. It can detect stochastic or provider drift but cannot establish truth.

### 13.4 Slice before causal interpretation

Provider, model, model-version, evaluation-version, and time-window changes can confound comparisons. A cross-version movement is an observed difference, not automatically model drift caused by one component.

### 13.5 No benchmark claim from synthetic fixtures alone

Synthetic golden cases can show whether known regressions are caught. They do not establish real-world customer accuracy, lift, ROI, recommendation causality, or product-market fit.

### 13.6 Adjudication changes are version changes

If a human-label rubric changes, the evaluation version must change. Otherwise old and new scores would look comparable while using different ground truth rules.

## 14. Regression gate before intelligence behavior changes

Any material change to provider prompts, parser/extraction logic, citation handling, evidence classification, comparison eligibility, recommendation generation, or action suggestions must follow this order:

1. add or update the relevant golden/regression case;
2. add a test that fails for the undesired behavior;
3. record the appropriate version bump;
4. implement the smallest behavior change;
5. run the full test suite;
6. run the affected evaluation set against the prior baseline where real captures are available;
7. inspect case-level regressions and drift signals;
8. require human review before release.

A change must not be approved solely because a different model-generated answer “looks better.”

## 15. CI regression coverage in this build

The new tests enforce:

- required synthetic golden risk categories;
- rejection of customer-confidential datasets without an approved boundary;
- complete version context;
- objective metric numerator/denominator behavior;
- explicit not-assessed behavior when ground truth is missing;
- repeated-question consistency measurement;
- recommendation evidence/confidence/limitation/human-approval guardrails;
- independent drift signals;
- internal reporting without a vanity composite;
- persistent database-stamped measurement context;
- no-network evaluation CLI wiring.

The migration is also subject to the repository’s existing isolated Supabase migration replay in CI.

## 16. Evaluation operating cadence

### Before a material intelligence change

- identify affected metric families;
- add a regression case first;
- bump the affected version dimension;
- record a baseline capture when a comparable real evaluation environment is available.

### On every candidate change

- run unit/regression tests;
- run synthetic golden evaluation;
- run approved real evaluation captures when available;
- compare provider/model slices;
- inspect drift;
- document any accepted regression and its rationale.

### Periodic model reliability check

Use the same frozen evaluation version and dataset to sample:

- provider failures;
- citation survival;
- evidence correctness where adjudicated;
- output structure;
- latency;
- cost;
- repeated-question stability.

If the provider silently changes behavior while the configured model name stays the same, citation, structure, latency, cost, or failure drift can still surface the change for investigation.

## 17. What this build deliberately does not claim

This build does not claim:

- a production AI quality percentage;
- 99% accuracy;
- any provider is best;
- any model is more truthful than another;
- a statistically significant improvement;
- customer-validated recommendation acceptance;
- causal impact from Foremention recommendations;
- that a returned citation caused an AI recommendation;
- that historical records contain version metadata that was never recorded.

Those claims require real evaluated observations and defensible denominators.

## 18. Follow-on work after real evaluation data exists

The next evidence-driven extensions should be selected from observed failure modes rather than added speculatively. Likely candidates include:

- adjudicator agreement and disagreement tracking;
- coded recommendation-rejection reasons;
- confidence intervals once sample sizes justify them;
- provider/model slice dashboards backed by persisted evaluation runs;
- automated alerting for sustained drift, with minimum sample requirements;
- immutable evaluation-run persistence;
- sampled production shadow evaluations under explicit privacy controls;
- provider-reported immutable model revision capture where available;
- richer claim-level evidence entailment tests.

None should be represented as implemented until the corresponding code, data model, and tests exist.

## 19. Acceptance criteria for Chat 11

This build is complete when all of the following are true:

- the golden dataset exists and is privacy-safe;
- deterministic objective scoring exists;
- missing ground truth is not converted into a score;
- version context is required by the evaluator;
- new persisted answers receive measurement context without backfilling historical guesses;
- recommendation quality guardrails require evidence, confidence, limitations, expected benefit, effort, rationale, and human approval;
- red-team failure classes are represented;
- drift detection separates model/version/citation/structure/cost/latency/failure signals;
- internal reporting exposes denominators and review outcomes;
- regression tests pass;
- existing repository tests, lint, typecheck, build, security and browser acceptance remain green before the PR is considered merge-ready.
