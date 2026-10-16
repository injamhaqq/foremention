# Chat 02 — Evidence-quality execution handoff

Batch: fm360-20261016 | IDs: FM-AUD-01, FM-AUD-11 | Base SHA: 6bf8bfda6ec0573dbbf432b831eff45688f8f47b | Date: 2026-10-16 UTC

Status: BOUNDED PATCH READY; production canary and FM-AUD-11 remain unverified. Scope: evidence-owned pure helper plus one focused offline regression file. No schema, migration, global UI, provider, billing or production mutations.

## Exact historical receipt versus representative fixtures

[Run 38739762884](https://github.com/injamhaqq/foremention/actions/runs/38739762884), 2026-10-15, authenticated synthetic acceptance: pinned question asked the title/date of the most recent post on openai.com/news; provider Cloudflare Workers AI, model @cf/google/gemma-4-26b-a4b-it. One answer and two reference entries were persisted. Failure ABSTENTION_NOT_VERIFIED_EVIDENCE withheld verification and publication. The $0.01 configured maximum is a SPEND CEILING, not measured spend. The GitHub artifact did not expose the actual answer text, two reference URLs, source excerpts, individual retrieval times or per-answer usage. DO NOT misrepresent them as reproduced; all offline fixtures below are REPRESENTATIVE.

An explicit abstention could be factually appropriate: an in-domain URL alone cannot prove that a particular item is chronologically the newest. A correct refusal must not be forced to qualify.

## Defects reproduced and patched

1. An answer prefaced by a retrieval summary but explicitly saying "I cannot verify" could pass when accompanied by an official URL. The helper previously checked mainly answer-leading refusals. Now it conservatively withholds explicit embedded disclaimers.
2. Answers to ordinary (non-official-scope) buyer questions could have an explicit refusal bulk-verified. Now the partition withholds these too. Substantive generic answers remain eligible for normal human review.

RED baseline isolated test: 5 passed, 2 failed. GREEN corrected isolated test: 7 passed, 0 failed, using Node v22.16.0 and command: node --test tests/chat02-evidence-qualification.test.mjs. This is NOT full repository CI, runtime source support, browser, security, or live-provider verification.

Fixture categories: positive structural official URL, embedded refusal, irrelevant URL, spoofed domain, wrong official path, model-written link, mixed references, empty result, partial refusal, ambiguous multi-domain prompt, inert injected snippet and generic bulk-review refusal. A qualifying URL remains structural eligibility, NOT factual or causal verification.

## Provenance gaps

Historical 2026-10-15 audit: 199 of 217 answer records lacked observation_method. Source-snapshot states: 74 open (25 without excerpts), 217 partial, 344 blocked, 3 unknown out of 638 total. These are dated prior measurements, not new production queries.

Canary exact question/provider/model and run-stage UTC are known. Unknown or unexposed: organization/project IDs, effective question version, exact answer/time/hash, per-answer usage and actual cost, both citation URLs and origins, search query/retrieval time, source excerpts/access, human factual support. The adapter source indicates independent web retrieval + API-hosted model, but cannot substitute for the original per-answer raw row. Keep unknowns unknown; never infer consumer ChatGPT/Gemini/Perplexity behavior.

## Integration handoffs

Chat 01: maintain existing typed reference origins; propose additive true method/question-version/retrieval-time/hash/rejection reasons if needed, never speculative backfills. Verify this patch against exact current main and all required CI; do not make the latest-post canary pass via weakened abstention. Distinguish two references from two native provider citations.

Chat 03: only eligible observed, classified, pinned-method/context samples may count in comparisons; missing/refused/partial/blocked is unknown, not zero visibility.

Chat 04: revise bulk-review error wording for generic refusals and require exact claim-span versus source excerpt review before verified opportunities. This helper only determines minimal URL eligibility. Retain source rejection reasons.

Chat 05: source content, spoofed hosts, redirects, private egress and malicious instructions require separate security tests. An inert text fixture is not end-to-end injection proof.

Chat 07 proposed exact copy: "Observed using an API-hosted model ([provider] / [model]) at [UTC time]. Where shown, Foremention independently retrieved the search results supplied to the model; they are not native citations from the provider. This does not establish what a consumer ChatGPT, Gemini or Perplexity application showed. A link or content hash alone does not prove support for a claim. Missing evidence remains unknown." Replace origin label only on actual per-answer proof; for historical gaps say "Observation method not recorded".

## Remaining acceptance and rollback

Still required: inspect authorized redacted original canary raw answer and two citations, classify exact retrieval versus legitimate abstention, verify real support for one positive official source and paired negative refusal, observe eligible run review in isolated/full CI, and sample legacy provenance/excerpts. No real paid model calls, production writes, manual publishing or customer contact in this Chat 02 work. Rollback: revert changed helper plus its test. No database rollback.

Source refs: https://github.com/injamhaqq/foremention/blob/6bf8bfda6ec0573dbbf432b831eff45688f8f47b/lib/official-source-relevance.mjs and https://github.com/injamhaqq/foremention/actions/runs/38739762884.
