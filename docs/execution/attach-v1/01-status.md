# Chat01 — measurement, evidence and spend — checkpoint (2026-10-12)

## Authority and exact refs
- Owner: Chat01 / packet 01. Coordinator: FM-00; independent acceptance: Chat09.
- Repository: `injamhaqq/foremention`.
- Isolated branch: `fm-attach-v1/01-measurement`.
- Exact original main/base: `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`; tree `4935ed3ed9ff1ef53486a0d82f35efb09302b19c`.
- First implementation commit: `2f59f492a7358eb928cc5bd6ba3e42e1a027d7e8`. The branch head may advance with this checkpoint and CI fixes; read the branch ref before integration.
- No main merge, deployment, production write, paid provider/API call, outreach or customer mutation.

## Source inventory / truth boundary
- Received **seven loose files**: `PROMPT(1).md`, `SHARED_RULES(1).md`, `OWNERSHIP_AND_COORDINATION(1).md`, `PACKAGE_ID(1).json`, `START_HERE(1).md`, `Source_File_Checklist_19(1).csv`, and `Backlog_Source_Index(1).csv`.
- Contrary to `START_HERE` and package metadata, the supplied upload contained **no ZIP and no Source_Files directory or 18 unchanged historical originals**. The source index does preserve the 71 historical references, of which 16 rows are assigned to Chat01; this is **not 71 current verified defects**. `Foremention_Master_Backlog_28_v2.csv` is explicitly absent in the index.
- The eight dictionary/polysemy URLs in the regression fixture are **synthetic recreations**, not the raw Oct 11 production receipt. Exact buyer question/full raw URLs cannot be independently reconstructed from uploaded originals.

## Verified on current main before edits
- PR #455 (complete public aggregates), PR #456 (explicit official-domain gating), and PR #459 (structured citation provenance) are **merged**; their relevant implementation is present. Do not implement duplicate fixes from the historical backlog.
- `lib/free-web-retrieval.ts` previously accepted any nonempty non-domain-scoped result set and passed it to the grounded Cloudflare model; a grammar-heavy search hit could therefore be treated as relevant without a topical gate.
- `lib/onboarding-enrichment.ts` previously called `groqAdapter.run` with a hard-coded local `budget` but no persistent organizational budget admission. Free-only policy allows only Cloudflare internal model work, whereas the direct call did not test that policy.
- `lib/evidence-capacity.ts` already includes D1 daily/monthly admission. `lib/providers/*` already separate structured citations from model-mentioned URLs. These observations are source inspection, **not production runtime proof**.

## Changed paths (owned)
- `lib/retrieval-topic-relevance.mjs` — conservative, unit-testable query/source lexical relevance gate; intentionally not a claim-truth/authority score.
- `lib/free-web-retrieval.ts` — apply relevance before model inference except for independently strict official-domain questions; reject all-irrelevant retrieval as unavailable; preserve query, count of raw candidates and relevance exclusion count in successful evidence.
- `lib/providers/cloudflare.ts` — map relevance-unavailable to explicit HTTP 422, not fabricated zero visibility; attach search query/retrieval counts to stored raw provider response.
- `lib/onboarding-enrichment.ts` — stop direct Groq enrichment until centrally persisted authorization/budget admission and usage receipts are implemented. Existing metadata/manual editable onboarding remains available; this is intentional fail-closed behavior for both free-only and non-free configurations.
- `tests/fixtures/fm01-irrelevant-retrieval.json` and `tests/fm01-retrieval-relevance.test.mjs` — synthetic negative/positive tests and bypass contract.

## Validation completed / incomplete
- Local **standalone helper** regression execution: `node --test /mnt/data/fm01-local/tests/fm01-retrieval-relevance.test.mjs` — 8/8 passing (Node 22.16). This was a matching preliminary local pure-module test, **not exact branch/full repository CI**.
- GitHub connector has repository write permission. Local container cannot clone GitHub (`Could not resolve host: github.com`); the branch was written through GitHub's connector with exact-ref compare-and-swap.
- Full `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` **not locally executed** without checkout/dependencies. Request exact head GitHub CI plus browser/acceptance, and review any source-level regressions. Synthetic fixtures do not replace founder review of 10 buyer questions or the recorded source receipt.

## Historical ID disposition
| IDs | Current disposition |
|---|---|
| CV-01, A08 (29 + 24) | **Partially fixed**: new broad query-topic gate, pre-inference fail-closed; exact real-canary replay and 10-question review pending. Official-domain portion merged via #456. |
| CV-02 | Existing surface-truth contract in `docs/PROVIDER-SURFACE-TRUTH.md`; **API-hosted model + independent search is not consumer-app monitoring**; customer language/integration verification pending FM-00/Chat05. |
| CV-03 | **Fail-closed fixed:** retired `/v1/sonar` is disabled (`configured=false`; HTTP 410 before fetch). Agent API replacement, current model/citation/usage contract and spending permission remain unverified. |
| CV-07, A29 | **Fail-closed fixed**: onboarding no longer performs unadmitted direct Groq network call; internal cost/retry/usage ledger integration remains a dependency before re-enabling. |
| CV-11, A09 (29 + 24) | Structured references already merged via #459; **UI/reviewer/export copy contract pending** Chat04/05/09. Independent Cloudflare search candidate != native model-vendor citation. |
| A07 (29 + 24) | **Fail-closed runtime fixed:** no silent Bing RSS fallback without explicit rights attestation; provider error 403 before D1 admission/network. Actual authorization/contract remains **unverified**, and FM-00 must decide permitted retrieval mode. |
| A10 (29 + 24) | Existing complete-run opt-in aggregation from merged #455; still requires exact-head acceptance and production opt-in evidence. |
| A18 (29 + 24) | Existing D1 daily/Brave monthly caps inspected; current vendor quota, billing settings, invoice and retry-unit reconciliation **unknown**. Zero rate estimates are not invoice proof. |

## Provider/measurement contract delivered to downstream owners
- `422` + relevance-unavailable means **no support for this question**, not **0% brand visibility** or a valid answer. Do not include in answer/useful recommendation denominators.
- Retain approved question/version, provider/method/model/locale, collected time, raw answer, surfaced/candidate URL types, usage, request/receipt identities and review state; do not relabel independent search candidates as native citations. No historical record fabrication.
- Successful Cloudflare raw includes `retrievalProvider`, `retrievalQuery`, `retrievedCandidateCount`, `relevanceRejectedCount`, and selected `citationCount`; missing native citation metadata remains missing.
- Chat04/06 must confirm missing-evidence display/retry/eligibility behavior; FM-00 owns any shared DB schema, global context contract, capacity quotas, final readiness and composition. Chat09 independently validates exact compose head.

## Follow-up proposals / gates / rollback
1. FM-00: obtain the genuine historical eight raw sources and a 10-question reviewed buyer corpus; review false positives/negatives; block use of unreviewed metrics as coverage.
2. FM-00/Chat06: define durable per-tenant **internal model admission + usage accounting** (including retries) before allowing Groq onboarding or paid provider work; supply a tested interface.
3. FM-00: source retrieval licensing decision, actual provider entitlement and quotas, existing rate estimates vs invoice, and optional Perplexity live-contract revalidation. No spending authorization implied.
4. Chat04/05/09: inspect 422/evidence unavailable copy, independent source labeling, comparison denominator, and semantic accessibility against the integrated candidate.
5. Run exact-head GitHub checks; preserve draft until green. Rollback is reverting the FM-01 implementation commit on its isolated branch (never rewrite other workers, never force-merge).

**Checkpoint conclusion:** reviewable owned code is committed; cross-owner integration, real provider/rights verification and production acceptance are **not** verified.

## Follow-up implementation checkpoint — 2026-10-12
- Added explicit no-license/no-provider preflight to `lib/free-web-retrieval.ts` and `lib/providers/cloudflare.ts`; no silent Bing RSS fallback and nonretryable 403 on unavailable rights. `BRAVE_SEARCH_API_KEY` permits the separately capped Brave lane only after operator entitlement/usage verification; `FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED=1` must NOT be set absent documentary authorization.
- Disabled retired Perplexity Sonar adapter: `lib/providers/perplexity.ts` now `configured() === false` and always throws before network. Converted its old mocked-citation regression into a fail-closed no-fetch test in `tests/provider-citation-integrity.test.mjs`.
- Added `tests/fm01-retrieval-rights.test.mjs` and `docs/execution/attach-v1/01-proposals/provider-method-requirements.md` for source/method requirements and explicit cross-owner behavior.
- Most recent implementation commit at this checkpoint: `4087096664dad1d18a1bbe2820889f3b03c69835`; **this status-document update changes the branch SHA again**. GitHub branch/PR head, not this embedded value, is authoritative for exact-head checks.
- Read-only verification of external docs: Perplexity vendor support confirmed Sonar chat-completions retirement September 27, 2026; Microsoft commercial Bing Search APIs terms are not evidence of commercial authorization for the distinct public RSS URL. No live vendor credentials, quota, payments or license grants were inspected.
- Draft PR #565 is the exchange point for FM-00 and Chat09. Security, Semgrep and CodeQL passed on the previous intermediate code revision; **none of those results certify this updated final head**. Cloudflare's separate automatic PR build check reported failure (reason inaccessible), not a deploy receipt. Other head checks remain pending. No production deployment was authorized.
