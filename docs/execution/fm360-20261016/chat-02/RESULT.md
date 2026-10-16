# Chat 02 — Evidence-quality execution handoff

Batch: fm360-20261016 | IDs: FM-AUD-01, FM-AUD-11 | Base SHA: 6bf8bfda6ec0573dbbf432b831eff45688f8f47b | Date: 2026-10-16 UTC

Status: BOUNDED PATCH CI-VERIFIED on initial exact PR head; remaining live positive-source acceptance and FM-AUD-11 unknown historical provenance are not closed. Scope: evidence-owned pure helper plus one focused offline regression file. No schema, migration, global UI, provider, billing or production mutations.

## Exact historical receipt versus representative fixtures

[Run 38739762884](https://github.com/injamhaqq/foremention/actions/runs/38739762884), 2026-10-15, authenticated synthetic acceptance: pinned question asked the title/date of the most recent post on openai.com/news; provider Cloudflare Workers AI, model @cf/google/gemma-4-26b-a4b-it. One answer and two reference entries were persisted. Failure ABSTENTION_NOT_VERIFIED_EVIDENCE withheld verification and publication. The $0.01 configured maximum is a SPEND CEILING, not measured spend. The GitHub Actions artifact omitted the answer and citations, but a later authorized read-only Supabase lookup recovered the exact synthetic run/answer and cited URLs, summarized below. Offline fixtures remain REPRESENTATIVE and must not be claimed as original provider outputs.

An explicit abstention could be factually appropriate: an in-domain URL alone cannot prove that a particular item is chronologically the newest. A correct refusal must not be forced to qualify.

## Defects reproduced and patched

1. An answer prefaced by a retrieval summary but explicitly saying "I cannot verify" could pass when accompanied by an official URL. The helper previously checked mainly answer-leading refusals. Now it conservatively withholds explicit embedded disclaimers.
2. Answers to ordinary (non-official-scope) buyer questions could have an explicit refusal bulk-verified. Now the partition withholds these too. Substantive generic answers remain eligible for normal human review.

RED baseline isolated test: 5 passed, 2 failed. GREEN corrected isolated test: 7 passed, 0 failed, using Node v22.16.0 and command: node --test tests/chat02-evidence-qualification.test.mjs. Seven full PR workflows SUCCEEDED on original exact head 84bc17afeed450af59daa1151a6164133081af9f (CI, Browser Acceptance, Isolated Authenticated Journey, Security, CodeQL, AI Safety and Code Health, Semgrep). The final head after documentation updates requires refreshed CI; none of these proves real positive live-source support.

Fixture categories: positive structural official URL, embedded refusal, irrelevant URL, spoofed domain, wrong official path, model-written link, mixed references, empty result, partial refusal, ambiguous multi-domain prompt, inert injected snippet and generic bulk-review refusal. A qualifying URL remains structural eligibility, NOT factual or causal verification.

## Provenance gaps

Fresh read-only Supabase aggregate on 2026-10-16 confirmed: 199/217 answers still lack observation_method (18 recorded api_hosted_model_with_independent_retrieval). Of 638 source snapshots: 74 open (25 without excerpts), 217 partial, 344 blocked and 3 unknown. No backfill or mutation.

The persisted synthetic answer (2026-10-15 13:07:18.500 UTC) records provider cloudflare, model @cf/google/gemma-4-26b-a4b-it, method api_hosted_model_with_independent_retrieval, reference origin independent_retrieval, and retrieval provider brave-search. Query: "site:openai.com/news openai title publication published post"; 12 candidates retrieved, 8 offered to hosted model, 2 selected: https://openai.com/news/ and https://openai.com/news/intelligence-age/. The original answer explicitly could not verify which general news post was newest. Both selected pages were inspected at about 13:07:37 UTC and returned HTTP 200 but access=partial without saved excerpts. Therefore ABSTENTION_NOT_VERIFIED_EVIDENCE was CORRECT, not an erroneously rejected valid answer. Stored usage: 861 input / 140 output / 1001 total tokens; reported latency 4066 ms. Cost source was estimated rather than billed; do not infer actual provider cost. An answer-text hash exists. Unknowns include actual latest-post support, uninspected page material and billed provider/search cost. Never infer consumer app behavior from this API-hosted independent retrieval.

## Integration handoffs

Chat 01: maintain existing typed reference origins; propose additive true method/question-version/retrieval-time/hash/rejection reasons if needed, never speculative backfills. Verify this patch against exact current main and all required CI; do not make the latest-post canary pass via weakened abstention. Distinguish two references from two native provider citations.

Chat 03: only eligible observed, classified, pinned-method/context samples may count in comparisons; missing/refused/partial/blocked is unknown, not zero visibility.

Chat 04: revise bulk-review error wording for generic refusals and require exact claim-span versus source excerpt review before verified opportunities. This helper only determines minimal URL eligibility. Retain source rejection reasons.

Chat 05: source content, spoofed hosts, redirects, private egress and malicious instructions require separate security tests. An inert text fixture is not end-to-end injection proof.

Chat 07 proposed exact copy: "Observed using an API-hosted model ([provider] / [model]) at [UTC time]. Where shown, Foremention independently retrieved the search results supplied to the model; they are not native citations from the provider. This does not establish what a consumer ChatGPT, Gemini or Perplexity application showed. A link or content hash alone does not prove support for a claim. Missing evidence remains unknown." Replace origin label only on actual per-answer proof; for historical gaps say "Observation method not recorded".

## Remaining acceptance and rollback

Historical canary diagnosis and selected references are now verified read-only. Remaining positive acceptance: test a stable official-source claim whose specific answer is supported by an inspectable source excerpt; retain a separate expected-abstention negative. FM-AUD-11's missing historical observation_method/excerpt facts must remain unknown absent authoritative source. FM-00 integration approval, latest exact-SHA gates and separate deployment confirmation still apply. No real paid model calls, production writes, manual publishing or customer contact in this Chat 02 work. Rollback: revert changed helper plus its test. No database rollback.

Source refs: https://github.com/injamhaqq/foremention/blob/6bf8bfda6ec0573dbbf432b831eff45688f8f47b/lib/official-source-relevance.mjs and https://github.com/injamhaqq/foremention/actions/runs/38739762884.
