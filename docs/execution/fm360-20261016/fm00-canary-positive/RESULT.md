# Fixed first-evidence positive canary — integration handoff

Batch `fm360-20261016`, original Chat 02 evidence diagnosis, **Chat 01 / FM-00 integration ownership**. As-of October 16, 2026. Isolated draft branch; no merge/deploy/live-provider calls.

## Verified real defect

Historical production canary run [38739762884](https://github.com/injamhaqq/foremention/actions/runs/38739762884) asked for the "most recently published" article at `openai.com/news`. Its Cloudflare API-hosted model received 8 independently retrieved Brave snippets drawn from 12 candidates and selected just two URLs, the news index and a section index; it correctly **abstained** because those sources did not establish the most recent individual article title/date. Both subsequent source inspections were partial without recorded excerpts. Do not convert this justified refusal into a fake positive.

## Patch

- New pure `lib/official-first-evidence-case.mjs`: fixed question requesting **only** the original title and publication date of an identifiable article at an exact HTTPS official URL, with positive field and exact-path qualification and explicit negative refusals.
- `scripts/first-evidence-production-canary.mjs`: use fixed question, retain pinned workspace fingerprint (org UUID + prompt UUID) and existing PATCH identity gate; verify matching official citation, title, date **before** synthetic review publication. Every other safety gate remains intact.
- `tests/first-evidence-production-canary-contract.test.mjs`: retain explicit spending/identity/auth/run and no-bypass contract; replace outdated "latest post" contract with stable positive record contract.
- `tests/official-first-evidence-case.test.mjs`: offline positive, negative refusal, wrong date/title, spoofed/wrong official URL, mixed source, extra conflicting fields and incomplete result.
- `docs/authenticated-first-evidence-canary.md`: document purpose and limitations.

**First-party ground truth:** https://openai.com/index/chatgpt/ displays heading **Introducing ChatGPT** and date **November 30, 2022**; independent read on October 16, 2026. This is a static factual fixture, NOT a positive result observed from the deployed Foremention provider.

**Acceptance limits:** this check combines recorded answer content and source URL for one pinned claim; it does not prove that the actual fetched page was complete at collection time, citation causal influence, or how consumer ChatGPT behaved. Keep human source review and separate expected-abstention negative cases.

## Remains required

1. Exact HEAD CI (all seven GitHub workflows), security, isolated/authenticated/browser acceptance.
2. FM-00 compare other open PRs and integrate only with explicit ownership review. Keep protected/main restriction.
3. Authenticated synthetic production run against deployed exact main SHA, explicitly authorized spend <= USD 0.01 configured ceiling, correct Cloudflare model and correct fixed-source answer. One question, one provider, SHA-scoped idempotency.
4. Verify source snapshot contents where available; do not claim unsupported semantic source support.
5. Preserve 199 historical missing observation methods and 25 open snapshots missing excerpts as unknown (read-only 2026-10-16 aggregate). No speculative backfill.
6. Original Chat 02 scoring/refusal corrections remain [PR #596](https://github.com/injamhaqq/foremention/pull/596), exact SHA f3b5f68b7d115db3ca45ecd0f502227528d792a8, seven out of seven Actions pass.

Rollback: revert only this independent canary PR; no schema or customer data migration. Older unstable newest-post question is not a suitable required *positive* acceptance test, though may be used as a separate expected-abstention negative.

No secrets, production writes, account login or paid API requests in this branch.