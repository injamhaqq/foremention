# Chat01 — measurement, evidence and spend — status (2026-10-12, checkpoint 2)

## Role and authority
- Packet 01 / Chat01: provider adapters, retrieval, enrichment/provider guards, spend/budget admission, provenance and metric contracts. Coordinator FM-00; independent acceptance Chat09.
- Repository `injamhaqq/foremention`, branch `fm-attach-v1/01-measurement`, **draft PR only**. No main merge, no deploy, no production DB change, no paid API call, no outreach, no customer data touched.

## Exact refs
- Base (origin/main when the branch was cut): `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`.
- Checkpoint-1 commits (parallel Chat01 session, written through the GitHub connector, **not executed locally at the time**): `2f59f49`, `4c5a6fa`, `8059220`, `4087096`, status-only `a37e8f7`, `24140a6`. That session opened draft PR #565; this checkpoint continues on the same branch/PR (no force-push, no rewrite).
- Checkpoint-2 code commit (this session, rebased onto `24140a6`, not a rewrite): `1318ebe`. This status/doc commit follows it; read the branch ref / PR head for the exact head.
- Checkpoint 1 left 5 failing tests in `tests/official-domain-evidence-adversarial.test.mjs` (Bing tests lacked the new A07 rights flag; the unscoped fixture had no topical titles). Fixed in `1318ebe`.

## Source inventory / truth boundary
- Available to this session: package files (`START_HERE.md`, `PROMPT.md`, `SHARED_RULES.md`, `OWNERSHIP_AND_COORDINATION.md`, `PACKAGE_ID.json`, `Source_File_Checklist_19.csv`, `Backlog_Source_Index.csv`) plus originals `Foremention_Master_Backlog_24.csv`, `Foremention_Audit_2026-10-11.md`, `Foremention_Repository_Register_124.csv`.
- **Not available** (rows used verbatim from `Backlog_Source_Index.csv` instead): `Commercial_Backlog_18.csv`, `Foremention_Master_Backlog_29.csv`, `Foremention_Audit_2026-10-11_v2.md`, `Foremention_Test_Run_2026-10-11.md`, route/surface registers, commercial/startup/financial/competitor files. `Foremention_Master_Backlog_28_v2.csv` does not exist (per package metadata) — not fabricated.
- The raw URLs/response of production run `abb5b16f-46ea-4d46-b769-231ea14ef47a` (2026-10-11, the B2B "should" case) are not in any available source. All fixtures are **synthetic** recreations, labelled as such.
- Production is still on build `b13e532` (deploy blocked). **No live receipt** exists for anything on this branch or for #551/#553/#555.

## Original-ID disposition (16 packet-01 rows)
| Source | ID | Disposition | Evidence |
|---|---|---|---|
| Commercial_18 | CV-01 | **Fixed here (pre-inference gate)** + official-domain part already on main | Topical relevance gate before inference (`lib/retrieval-topic-relevance.mjs`, `free-web-retrieval.ts`, `2f59f49`); 422 non-retryable "evidence unavailable"; fixture reproduction through the real grounded path (`tests/fm01-measurement-reproduction.test.mjs`, `1318ebe`). Main: #456 (`50b7b41`), #551 (`a17afda`). Open: founder-reviewed 10-question corpus + real run replay (sources unavailable). |
| Commercial_18 | CV-02 | **Fixed here (method declared in record) + proposal** | Cloudflare raw now records `observationMethod=api_hosted_model_with_independent_retrieval`, `consumerProductObservation=false`, `referenceProvenance=independent_retrieval`; ObservationEnvelope contract. Customer-facing copy: proposal (Chat04/05). |
| Commercial_18 | CV-03 | **Fixed here (disabled)** | `perplexity.ts` `configured()=false`, `run()` 410 before fetch (`8059220`/`4087096`). Retirement verified: vendor staff reply 2026-09-10 (https://community.perplexity.ai/t/sonar-moving-to-agents-api/6061). Agent API adapter not built (needs authorised live receipt). |
| Commercial_18 | CV-07 | **Fixed here** | `lib/internal-model-admission.ts` + `enrichOnboardingDraft` (`1318ebe`): free-only => zero Groq calls; otherwise operator cap + durable unit per attempt, no store => deny, no retry/substitution; 9 tests in `tests/fm01-internal-model-admission.test.mjs`. Usage-receipt persistence: proposal `internal-usage-ledger.md`. |
| Commercial_18 | CV-11 | **Contract fixed here; persistence/UI = proposal** | `lib/evidence-provenance.mjs` labels (native citation / answer URL / independent retrieval / unknown + human-review overlay), export columns; public report methodology corrected (`lib/public-visibility-report.ts`). Mislabels in `inngest.ts`, `source-map-generation.ts`, export, demo data + DB check constraint: `01-proposals/provenance-persistence-and-labels.md`. |
| Backlog_29 | A07 | **Fixed here (rights gate) + already on main (Brave)** | Main #547 (`b13e532`), #555 (`44e2894`). Here: no silent Bing RSS fallback; needs Brave key or explicit `FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED=1` attestation; 403 before capacity admission/network (`8059220`). Brave key commercial terms/quota not verified (no vendor access). |
| Backlog_29 | A08 | Same as CV-01 | Same evidence. Also: "100% coverage despite no useful answer" — metric contract + proposal `metric-denominator.md`. |
| Backlog_29 | A09 | **Already fixed on main + typed here** | #459 (`50b7b41`): no `extractUrls(answer)` citation fallback remains in `lib/` (grep verified). Here: independent-retrieval citations typed as non-provider (`1318ebe`). Visible typing in UI: proposal. |
| Backlog_29 | A10 | **Already fixed on main (verified in source)** | #455 (`50b7b41`): `public-visibility-report.ts` recomputes from complete verified answer sets via `complete-run-evidence.mjs`, withholds otherwise; run cap = `MAX_COMPLETE_RUN_HISTORY_RUNS` (50). Copy fix here. Production opt-in evidence: none. |
| Backlog_29 | A18 | **Already on main (caps) + partially blocked** | #553 (`d5825cb`): D1 daily 100 / Brave monthly 900, fail closed. Here: internal-model counter added to same store. Blocked: vendor invoices, free allocations, card/overage settings not accessible. |
| Backlog_29 | A29 | Same as CV-07 | Acceptance "free-only + Groq configured => zero Groq network calls; editable draft still works" covered by test. Runtime proof needs deploy. "Visible manual setup mode" is UI (Chat04/05) — not done here. |
| Backlog_24 | A07 | Same as A07 (29) | — |
| Backlog_24 | A08 | Same as A08 (29) | Official-domain adversarial tests pass on both providers. |
| Backlog_24 | A09 | Same as A09 (29) | — |
| Backlog_24 | A10 | Same as A10 (29) | — |
| Backlog_24 | A18 | Same as A18 (29) | — |

## Changed paths (branch vs base)
Code: `lib/retrieval-topic-relevance.mjs` (new), `lib/free-web-retrieval.ts`, `lib/providers/cloudflare.ts`, `lib/providers/perplexity.ts`, `lib/onboarding-enrichment.ts`, `lib/internal-model-admission.ts` (new), `lib/evidence-capacity.ts` (additive `admitNamedCapacityUnit`), `lib/evidence-provenance.mjs` (new), `lib/public-visibility-report.ts` (methodology sentence only).
Tests: `tests/fm01-retrieval-relevance.test.mjs`, `tests/fm01-retrieval-rights.test.mjs`, `tests/fm01-internal-model-admission.test.mjs`, `tests/fm01-measurement-reproduction.test.mjs`, `tests/official-domain-evidence-adversarial.test.mjs` (fixture/env only), `tests/provider-citation-integrity.test.mjs` (Perplexity case), fixtures `tests/fixtures/fm01-irrelevant-retrieval.json`, `tests/fixtures/fm01/*.json`.
Docs: `docs/execution/attach-v1/01-status.md`, `01-provider-contract.md`, `01-proposals/{provider-method-requirements,provenance-persistence-and-labels,metric-denominator,internal-usage-ledger}.md`.
Not touched: app routes/UI, `lib/jobs/*`, `lib/source-map-generation.ts`, migrations, CI, worker config.

## Commands run (this session, worktree `/workspace/work/wt-chat01`, Node 22, pnpm 10.25)
- `pnpm install --frozen-lockfile` — ok.
- `node --experimental-strip-types --test tests/*.test.mjs` on `4087096` (checkpoint 1): 1327 tests, **5 fail** (all in official-domain adversarial suite, caused by checkpoint 1).
- Same on `1fd4f76` (identical tree to `1318ebe` for code/tests): **1344 tests, 1344 pass, 0 fail**.
- `npx tsc --noEmit` — exit 0.
- `npx eslint` on all changed files — clean.
- `pnpm run build` — "Build complete", exit 0.
- GitHub CI on the PR head: see PR (recorded in the final report).

## Contracts provided (for 04/05/06/08/09 and FM-00)
- **ObservationEnvelope** `buildObservationEnvelope()` (`fm01.observation.v1`), **typed references** `typedReferences()/referenceExportColumns()`, **metric** `observationOutcome()/summarizeVisibility()`, **internal admission** `admitInternalModelCall()`. Details: `01-provider-contract.md`.
- Error semantics: 403 = retrieval rights unavailable; 410 = retired provider; 422 = evidence unavailable (scope/relevance); 429 = capacity. None is a zero-visibility observation; 403/410/422 are non-retryable.

## Blocked / pending
1. Live receipts: wait for production deploy (prod on `b13e532`). Chat09/FM-00 should re-run the canary + one unscoped buyer question after deploy.
2. A08 acceptance needs the real raw sources of run `abb5b16f…` and a founder-reviewed 10-question corpus — unavailable.
3. A18 vendor side: Brave/Cloudflare invoices, quotas, card/overage settings — no access in this package.
4. CV-03 re-enable path (Agent API) needs an authorised live call — out of scope (no paid calls).
5. A07 rights: commercial RSS rights decision is the founder's; the flag is an attestation, not a licence.
6. Cross-owner: provenance persistence/labels (Chat06/04/05 + FM-00 migration), metric denominator (Chat06), usage ledger (FM-00), manual-setup UI (Chat04/05).
7. `Foremention_Master_Backlog_28_v2.csv` missing; unavailable originals listed above.

## Rollback
Revert `1318ebe` (returns onboarding enrichment to the checkpoint-1 hard-disable, drops provenance/metric modules and new tests — keep the official-domain test fix if reverting partially). Revert `8059220`+`4087096` to restore the Bing RSS fallback and Sonar adapter (not recommended). Revert `2f59f49` to drop the relevance gate. No migrations or env changes to undo. Production env: leave `FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP` and `FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED` unset.

## Next action
FM-00: review draft PR, decide the provenance migration and usage-ledger shape, route the Chat06/04/05 proposals. Chat01 on "continue": refresh peer heads, rebase on main if it moved, and fold in any FM-00 decision on shared types.

## Checkpoint 3 — continuation: metric classification integrity
- Prior branch head `6d0c56a7c1e2aeda4b675941022f6241b7b22554` achieved successful exact-head CI, Security, CodeQL, AI Safety and authenticated journey; Browser Acceptance was still in progress at last inspection. These results belong to **that commit**, not the new head.
- Found and fixed pure contract edge: an observed answer without a boolean `brandPresent` was previously counted as false, manufacturing a zero. Now only classified observations enter the visibility denominator; unclassified counts are exposed and incomplete/unknown results withhold the appropriate aggregate. Added negative/positive regression tests.
- ObservationEnvelope previously inferred `api_provider_native` when no method was recorded. It now preserves `method=null` and lists it as unavailable. Do not retrofit missing history with guesses.
- Existing downstream `lib/jobs/inngest.ts` metric/denominator and schema changes remain Chat06/FM-00 proposals. No external provider call, customer mutation or release attempted.
- Current exact head: read branch/PR ref after this status commit; rerun exact-head GitHub Actions before accepting.

## Checkpoint 4 — regression from checkpoint 3 fixed (2026-10-12)
- `44a8134` (unscoped retrieval reads 20 candidates) broke 2 tests in `tests/official-domain-evidence-adversarial.test.mjs` that still asserted `count=8`. Updated the assertion: one search request with `count=20`, at most 8 citations reach the model.
- Local on this commit: `node --experimental-strip-types --test tests/*.test.mjs` 1350/1350 pass; `tsc --noEmit` exit 0; eslint on changed files clean. Build last run on `1fd4f76`/`6d0c56a` tree (ok); CI build covers this head.
- Two Chat01 sessions are writing this branch in parallel. To avoid a push loop, coordinate through PR #565: fetch + fast-forward before every push, never force-push.
