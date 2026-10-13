# Chat01 provider, retrieval, spend and provenance contract (attach-v1, 2026-10-12)

Owner: Chat01 (packet 01). Consumers: Chat04 (record/review/export), Chat05 (public copy/examples), Chat06 (jobs/metrics), Chat08 (commercial claims), Chat09 (acceptance), FM-00 (shared types/migrations).
Status: source + offline-fixture verified on branch `fm-attach-v1/01-measurement`. **Not production-verified**: production still runs build `b13e532` (deploy blocked), so no live receipt exists for any statement below.

## 1. Provider / method matrix (what each lane is allowed to claim)

| Lane | Code | Current state on this branch | What it is | What it is NOT |
|---|---|---|---|---|
| Cloudflare Workers AI hosted model + independent search | `lib/providers/cloudflare.ts`, `lib/free-web-retrieval.ts` | Active (free-only default). Search = Brave Search API when `BRAVE_SEARCH_API_KEY` set (#547); Bing RSS only behind `FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED=1` (operator rights attestation, **not a licence**); neither => 403 fail-closed before capacity admission or network | An API sample: Foremention retrieves search results, filters them (official-domain scope #456/#551, topical relevance gate A08), and a pinned hosted model synthesises an answer citing only supplied source numbers | Not ChatGPT/Gemini/Perplexity consumer-app monitoring; its URLs are **not** provider-native citations |
| Perplexity Sonar (`/v1/sonar`) | `lib/providers/perplexity.ts` | **Disabled** (`configured()=false`, `run()` throws 410 before fetch) | — | Vendor retired Sonar chat-completions on 2026-09-27 (vendor staff reply, https://community.perplexity.ai/t/sonar-moving-to-agents-api/6061; migration guide https://github.com/perplexityai/api-platform-developers/blob/main/skills/migrate-sonar-to-agent-api/SKILL.md). No Agent API (`/v1/agent`) adapter is validated; no silent substitution. Re-enable only with new request/response/citation(`search_results` output item)/usage fixtures, an authorised live receipt and a new method version (not comparable with Sonar history) |
| Groq (internal onboarding enrichment) | `lib/onboarding-enrichment.ts` -> `lib/internal-model-admission.ts` | Gated. Free-only mode (default) => denied `FREE_ONLY_MODE`, zero network calls | Optional paid internal helper (browser_search reserves >= $0.05/call) | Never a measurement observation; never substituted by another provider |
| OpenAI / Anthropic / Gemini / Groq measurement adapters | `lib/providers/*.ts` | Unchanged; blocked from live collection in free-only mode (`providerAllowedForLiveCollection`) | Direct API with native search-tool citations only (#459) | Not consumer-app observation; text URLs are `mentionedUrls`, never citations |

## 2. Retrieval relevance (CV-01 / A08)
- `lib/retrieval-topic-relevance.mjs`: conservative lexical gate applied **before inference** to unscoped questions. A candidate needs >= 2 question terms incl. one specific (non-generic) term in title/snippet/path. Question with no specific term => `QUESTION_TOO_AMBIGUOUS`. All rejected => `RetrievedTopicUnavailableError` => provider 422 `Evidence unavailable` (non-retryable). Partial sets pass only relevant candidates; `retrievedCandidateCount` and `relevanceRejectedCount` are recorded in `raw`.
- Explicit official-domain questions use the strict scope gate instead (#456/#551).
- Lexical relevance is **not** claim verification, authority or causality. A founder-reviewed 10-question corpus is still required (A08 acceptance) — not available to this package.
- Unscoped retrieval now scans up to 20 ranked candidates (one search request), filters topical relevance, and selects at most 8 model-facing references. An isolated synthetic positive control covers the first relevant result at rank 10. This is not a guarantee that all relevant sources will appear or that provider billing is unchanged; verify the current vendor entitlement and contract before paid activation.

## 3. Spend / admission (A18, A29, CV-07)
- Live evidence: `admitEvidenceCall` (#553) — atomic D1 UTC-day cap (default 100) + Brave UTC-month cap (default 900), fail closed when the Worker store is required but missing. Admission is per grounded call, so each retry is admitted again.
- Internal model work: `admitInternalModelCall({provider,purpose,configured})` — order: free-only policy -> per-purpose operator cap env (`FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP`, unset/0 = disabled, ceiling 50) -> provider configured -> durable D1 unit `internal:<purpose>:<provider>:day:<UTC date>`; **no store => denied** (never uncapped). Every attempt, including any retry, must obtain its own unit. Denial = skip work, keep manual/metadata draft.
- Zero-rate Cloudflare estimates in `collection-policy.ts` are not invoices. Vendor quotas, card/overage settings and invoices were not accessible to this package (A18 remains partially open on the vendor side).

## 4. Reference provenance (CV-02, CV-11, A09) — `lib/evidence-provenance.mjs`
| origin | label (record/export/example) | counts as provider citation |
|---|---|---|
| `native_citation` | Citation returned by the provider's API search tool | yes |
| `answer_url` | URL written in the answer text (not a citation) | no |
| `independent_retrieval` | Search result retrieved by Foremention and given to the model (not a provider citation) | no |
| `unknown` | Source origin not recorded | no |

Human review is an overlay (`verified` / `rejected` / `unreviewed`), never an origin. `citationOriginForAnswer` prefers recorded `raw.referenceProvenance`, then retrieval metadata, then provider identity; anything else is `unknown`. Cloudflare answers now persist `raw.referenceProvenance="independent_retrieval"`, `raw.observationMethod="api_hosted_model_with_independent_retrieval"`, `raw.consumerProductObservation=false` (inside existing jsonb `raw_response`/`raw_json`; no migration).

Known mislabels still on main (other owners; patches in `01-proposals/`): `lib/jobs/inngest.ts` writes `sources.source_type="provider-returned citation"` for every citation; `lib/source-map-generation.ts` writes `reference_origin="provider_citation"` (DB check constraint only allows that value — migration needed); source-map CSV export has no origin column; demo/example data marks all rows `provider_citation`.

## 5. Metric contract — missing is unknown, never zero
`observationOutcome(attempt)` => `observed` | `abstained` | `evidence_unavailable` (HTTP 403/410/422) | `failed`. `summarizeVisibility(attempts,{requireComplete})` counts only `observed` answers with an explicit `brandPresent: true|false` boolean in the denominator. A missing/null/unverified brand classification increments `unclassified` (not a negative result); it returns `value=null` and `NO_CLASSIFIED_OBSERVATIONS` when no observed answer can be classified. Under `requireComplete`, abstained, unavailable, failed **or unclassified** attempts withhold the aggregate. Current `inngest.ts` excludes failed attempts but counts abstentions as brand-absent — proposal 01-proposals/metric-denominator.md.

## 6. ObservationEnvelope (FM-00 interface #1)
`buildObservationEnvelope(answer, context)` returns `contractVersion fm01.observation.v1` with organization/project/question id+version+text, locale, method, `consumerProductObservation:false`, provider, model, observedAt, providerRequestId, finishReason, rawAnswer, typed references, retrieval {provider, query, candidateCount, relevanceRejectedCount}, outcome, attemptStatus, httpStatus, usage, billedCostUsd, budgetAdmission, humanReview, and `unavailable[]` listing every field the source did not supply. It is a pure builder; persisting it as a shared type is an FM-00 decision.

## 7. Raw fixture artifacts (synthetic, offline)
`tests/fixtures/fm01/`: `brave-b2b-should-dictionary.json` (B2B question, 8 dictionary/grammar "should" hits — shape of the 2026-10-11 run `abb5b16f…`, whose real URLs were **not** available), `brave-b2b-partial-relevant.json`, `brave-b2b-positive-control.json`, `brave-empty.json`, `brave-ambiguous-question.json`, `workers-ai-grounded-answer.json`; plus the earlier `tests/fixtures/fm01-irrelevant-retrieval.json`. All are labelled synthetic; none is a production receipt.

### Checkpoint 3: missing fields are never inferred
- ObservationEnvelope `method` is `null` + listed in `unavailable` unless the raw provider record explicitly carries `observationMethod`. Neither provider identity nor `raw.grounded` or number of URLs proves a native provider-search method.
- Unclassified brand presence is not a measured negative; do not infer `brandPresent=false` from a missing field.
