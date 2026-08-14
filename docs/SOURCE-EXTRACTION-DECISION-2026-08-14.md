# Source Extraction Decision — 2026-08-14

## Scope

Foremention keeps this production authority boundary:

safe URL validation → DNS/public-address checks → bounded fetch → redirect validation → content-type and size limits → deterministic extraction → Source X-Ray observation → separate human review.

No benchmark extractor may bypass those controls or become verified evidence by itself.

## Upstream candidates

### Mozilla Readability — BENCHMARKED, DO NOT ADOPT NOW

- Official repository: `mozilla/readability`.
- Version benchmarked: `@mozilla/readability` `0.6.0`.
- Package license inspected: Apache-2.0.
- Readability expects a DOM document; the benchmark used JSDOM only in an isolated CI runtime.
- Mozilla warns that Readability is not a sanitizer. Foremention evaluated normalized text only and never rendered Readability HTML.
- Readability/JSDOM was never added to Foremention production dependencies or the production lockfile.

### Crawl4AI — DEFER UNTIL A REAL FAILURE CLASS

Crawl4AI is a Python/browser crawler with Playwright/Chromium and Docker deployment options. It remains materially heavier than Foremention's Worker-native source inspection. Benchmark it only if the final native path fails a meaningful customer-relevant source class.

### Stagehand — DEFER FOR EXTRACTION

Stagehand is useful for interactive browser automation. It is not justified as Foremention's default deterministic text extractor.

### Firecrawl — BENCHMARK ONLY IF NEEDED

Firecrawl would add a separate crawling service/control plane overlapping the existing bounded inspector. It must solve a demonstrated source class before adoption.

### changedetection.io — REJECT DUPLICATE CONTROL PLANE

Foremention already owns source snapshots, fingerprints, significant-change detection, notifications, and Change Graph semantics.

### ArchiveBox — DEFER / REJECT FOR CURRENT MVP

ArchiveBox is a full web-preservation stack. Foremention intentionally avoids unnecessary raw page retention and does not currently need a second archive system.

## Deterministic benchmark contract

The benchmark contains twelve checked-in fixture definitions/templates:

1. article
2. documentation
3. product
4. comparison
5. navigation-heavy
6. sidebar/footer-noise
7. structured article
8. malformed HTML
9. rendered dynamic snapshot
10. blocked/inaccessible response
11. very small page
12. deterministic large page expanded above the 256 KiB inspection boundary

The benchmark calls Foremention's actual `inspectSourceUrl` implementation. Readability receives the same bounded HTML prefix on truncation cases.

Per-case quality is deterministic:

- `relevantPhraseRecall = required phrases present / required phrases defined`
- `boilerplateRejection = 1 - forbidden boilerplate phrases present / forbidden phrases defined`
- `qualityScore = 0.75 * relevantPhraseRecall + 0.25 * boilerplateRejection`

Latency is the median of three extraction runs. Heap delta is informational only.

## Benchmark 1 — baseline native vs Readability

Workflow run: `31813100482`
Generated: `2026-08-14T15:10:11.174Z`

- Native average quality: **0.811**
- Readability average quality: **0.962**
- Native article-like quality: **0.750**
- Readability article-like quality: **1.000**
- Readability article-like recall: **1.000**
- Benchmark contract failures: **0**
- Readability null extractions: **0**

Readability materially won the article, documentation, product, comparison, navigation-heavy, sidebar/footer-noise, and structured-article fixtures because the baseline native text preserved useful content but also retained semantic navigation/sidebar/footer boilerplate.

The first benchmark also showed an important Readability regression on the bounded large page:

- generated input: `270,040` bytes
- bounded input: `262,144` bytes
- native quality: `0.917`
- Readability quality: `0.750`
- native median: `6.101 ms`
- Readability/JSDOM median: `556.335 ms`

That evidence justified improving extraction quality, but did not justify replacing the native inspector.

## Native improvement under test

PR #98 changes only optional HTML `pageText` normalization:

- semantic `<nav>`, `<aside>`, and `<footer>` blocks are removed before optional page text is returned;
- the existing full visible-text path remains unchanged for `contentLength` and `contentSignature`;
- therefore existing source fingerprints do not receive an artificial one-time methodology change;
- plain-text sources remain unchanged;
- URL/DNS/SSRF/redirect/timeout/size/content-type controls remain unchanged.

A dedicated regression test locks the pre-change fingerprint for the normalization fixture at content length `96` and signature `904c16f0` while verifying page text removes the semantic boilerplate.

## Benchmark 2 — improved native vs Readability

Workflow run: `31814617389`
Generated: `2026-08-14T15:28:23.819Z`

### Aggregate result

- Native average quality: **0.977**
- Readability average quality: **0.962**
- Native article-like quality: **1.000**
- Readability article-like quality: **1.000**
- Readability article-like recall: **1.000**
- Material Readability wins: **none**
- Material Readability regressions: **large-near-limit**
- Benchmark contract failures: **0**
- Readability null extractions: **0**

### Per-case decision evidence

The improved native extractor scored `1.000` on article, documentation, product, comparison, navigation-heavy, sidebar/footer-noise, structured-article, rendered dynamic snapshot, and very-small-page cases.

The remaining differences were:

- malformed HTML: native `0.833`, Readability `0.917`
- bounded large page: native `0.917`, Readability `0.750`

Native medians on ordinary fixtures remained roughly sub-millisecond to about `1 ms`, while Readability/JSDOM was roughly `15–46 ms`. On the bounded large page native was `11.277 ms` versus Readability/JSDOM `668.324 ms`.

## Final adoption decision

**Decision: `do-not-adopt-readability-now`.**

The second benchmark removes the production justification for another parser dependency. Foremention's native normalization now exceeds Readability's aggregate benchmark score, exactly matches its article-like score and recall, has no material case where Readability wins, retains better bounded-large-page behavior, and avoids a DOM runtime dependency.

This is not a permanent rejection of Mozilla Readability. Re-open the decision only if real customer source failures show a page class the native path cannot handle safely and materially.

## Production implementation boundary

The production change remains deliberately native:

safe network policy → bounded HTML → stable full-text fingerprint → semantic boilerplate-reduced optional page text → Source X-Ray observation → separate human review.

The change does **not**:

- execute page scripts;
- fetch resources independently;
- alter redirect/DNS/SSRF policy;
- change existing content signatures;
- turn extracted text into verified claims;
- relabel search results as provider citations;
- introduce Crawl4AI, Firecrawl, Stagehand, Readability, JSDOM, or another crawler into the production runtime.

## Future reopening criteria

Reconsider a richer parser/crawler only when production evidence identifies a meaningful source class with one or more of:

- required content missing from bounded HTML;
- content only available after controlled client rendering;
- malformed markup that causes repeated loss of important evidence;
- legitimate page structure that native semantic boilerplate normalization cannot preserve.

Any future candidate must still pass Worker/runtime compatibility, security, bounded-resource, provenance, cost, and rollback gates before adoption.
