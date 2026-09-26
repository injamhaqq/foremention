# Provider-surface coverage and claims boundary

**Operational evidence status (2026-09-26).** The current production free-only live collection route is one controlled observation surface: **Cloudflare Workers AI hosted inference with independent Bing Search RSS retrieval and grounded synthesis**. The trusted canary pins the hosted model `@cf/google/gemma-4-26b-a4b-it`; each persisted observation retains its recorded provider/model. Provider search-result source numbers used in synthesis are checked against the retrieved URL set. Neither this hosted model nor its independent search retrieval is a native consumer ChatGPT, Gemini, or Perplexity observation.

A configured optional provider adapter is not a certified production surface. In particular, prior Gemini failures were 404 for the earlier deployed model setting and 429 at the account quota boundary; repository defaults do not prove current deployed account configuration or grounded success. A direct provider API may be materially different from the consumer application, and neither is presumed representative of personal or private conversations.

## Required coverage record before making any claim

For each *independently validated* provider/method cohort, record:

- **provider_family**: actual vendor/hosting identity; avoid borrowing the model developer's product name to relabel an independent hosted environment.
- **exact_api_surface**: endpoint or hosted inference channel, plus whether it is a supported direct API, hosted model, or actual authorized consumer UI. Do not conflate them.
- **model_id**: exact outbound and recorded model ID; do not infer deployed identity from source defaults alone.
- **retrieval_and_grounding_mode**: whether search/retrieval is native provider grounding or an independent retrieval source consumed by synthesis. Record tool/schema versions.
- **question_identity**: versioned buyer question, locale/market, buyer stage and material comparison protocol.
- **source_provenance**: returned citation metadata versus independently retrieved candidate URLs versus human-retrieved/reviewed evidence. A URL's presence is not evidence of its causal influence on the generated answer.
- **access_and_cost_limits**: authorized API or hosted mode, current account quota, no unsupported scraping, explicit bounded spend and data-retention rules.
- **comparison_eligibility**: require matching material method/model/question/locale and sufficient evidence; mark unavailable, changed or unmatched cohorts as not comparable.
- **confidence_and_limitations**: failures, date, missing/zero-citation outcomes and review coverage; do not advertise external customer success based on internal canaries.

## Surface claims currently permitted

- It is accurate to say the free-only collection path *observes Cloudflare Workers AI + Bing Search RSS grounded synthesis under a declared model and question protocol*, with retrieved URL candidates and provenance.
- It is **not** accurate to say that this measurement monitors, ranks, samples or audits what real people see in the ChatGPT, Gemini or Perplexity consumer applications.
- It is **not** accurate to relabel model-vendor API output as the vendor's consumer-app output. Cite API/surface identity literally and show unknown when a target surface has no evidence.
- Real customer-facing comparisons must be within one verified material measurement surface. The current five-question acceptance canary and QA datasets do not constitute verified consumer-app coverage or demonstrated customer uplift.

## Evidence required to promote a new surface

1. Identify an authorized, documented direct provider API and the actual grounding/citation fields. Confirm account tier, key scope, model availability, quota and budget **without logging secrets**. Consumer-app representativeness is a separate, generally unproven claim.
2. Version a fixed corpus of **20** representative B2B SaaS buyer questions under the exact API/model/methodology. Do not cherry-pick only successful results, fabricate citations, or launch calls without a permitted spend ceiling.
3. Record every attempted request's status, retries, cost estimate and the precise evidence it returned. Human reviewers independently inspect at least **10** distinct observations containing genuine, traceable provider-returned citations.
4. Compare observed records only after the question/version, provider/model, retrieval protocol and locale checks pass. An independently retrieved Bing RSS URL is not automatically a vendor-returned native citation.
5. Gate public/demo assertions and provider status on independently verified coverage, not `configured=true`, internal canary success, or a mixed historical aggregate. If no permitted native surface exists, keep the narrower, honest Cloudflare-grounded claim.

**Release checklist:** public HTML and Markdown mirrors must state the same current surface boundary. All measurements should retain source provenance, failures and uncertainty; no new external API call is added by this policy.
