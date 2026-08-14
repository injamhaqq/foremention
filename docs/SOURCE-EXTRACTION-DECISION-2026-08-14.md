# Source Extraction Decision — 2026-08-14

## Scope

This record evaluates extraction quality without changing Foremention's production source-inspection authority.

The production boundary remains:

safe URL validation → DNS/public-address checks → bounded fetch → redirect validation → content-type and size limits → deterministic extraction → Source X-Ray observation → separate human review.

No benchmark extractor may bypass those controls or become verified evidence by itself.

## Current upstream facts

### Mozilla Readability — SELECTIVE PRODUCTION CANDIDATE, NOT YET ADOPTED

- Official repository: `mozilla/readability`.
- Package version benchmarked: `@mozilla/readability` `0.6.0`.
- License declared by the package source: Apache-2.0.
- Readability expects a DOM `document`; Mozilla's Node example uses JSDOM.
- Mozilla explicitly warns that Readability is not a sanitizer. Foremention does not render Readability HTML in this benchmark; only normalized text is evaluated.
- JSDOM scripts and remote resource loading were disabled in the benchmark environment.
- Benchmark dependencies remained isolated from Foremention's production dependency graph.

### Crawl4AI — DEFER UNTIL A REAL FAILURE CLASS

Crawl4AI is a Python/browser crawler that installs Playwright/Chromium and can also run as a Docker service. It is materially heavier than the current Worker-native inspection path. It should only be benchmarked after native extraction plus a lightweight deterministic parser leaves an important customer-relevant page class unsolved.

### Stagehand — DEFER FOR EXTRACTION

Stagehand is a browser automation framework combining code and model-driven browser actions. That is useful for interactive workflows, not as the default deterministic page-text extractor. It would add browser/model operational complexity to a problem Foremention can often solve without agentic interaction.

### Firecrawl — BENCHMARK ONLY IF NEEDED

Self-hosted Firecrawl introduces Docker/service operation and broader crawling infrastructure. Its overlap with Foremention's existing bounded source inspector means it must beat the native path on a demonstrated source class before adoption.

### changedetection.io — REJECT AS A DUPLICATE CONTROL PLANE

Foremention already owns source snapshots, fingerprints, significant-change detection, notifications, and the Change Graph direction. changedetection.io would duplicate product-owned state and monitoring semantics.

### ArchiveBox — DEFER / REJECT FOR CURRENT MVP

ArchiveBox is a full preservation system that stores multiple long-lived formats such as HTML, screenshots, PDFs, WARC, and media. Foremention intentionally avoids unnecessary raw page retention and does not currently need a separate web-archive control plane.

## Benchmark contract

The deterministic corpus contains twelve checked-in fixture definitions/templates:

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
12. deterministic large page expanded above the 256 KiB bounded inspection limit

The benchmark compares Foremention's actual `inspectSourceUrl` implementation against Mozilla Readability running with JSDOM in an isolated CI-only runtime.

Quality is deterministic rather than subjective. For each fixture:

- `relevantPhraseRecall = required phrases present / required phrases defined`
- `boilerplateRejection = 1 - forbidden boilerplate phrases present / forbidden phrases defined`
- `qualityScore = 0.75 * relevantPhraseRecall + 0.25 * boilerplateRejection`

Latency is the median of three extraction runs. Heap delta is informational only because JavaScript garbage collection and CI runtime behavior make it noisy. For the truncated fixture, Readability receives the same 262,144-byte HTML prefix permitted to the native inspector.

## Observed benchmark — workflow run 31813100482

Generated at `2026-08-14T15:10:11.174Z` from PR #97.

### Aggregate quality

- Native average quality: **0.811**
- Readability average quality: **0.962**
- Native article-like quality: **0.750**
- Readability article-like quality: **1.000**
- Readability article-like required-phrase recall: **1.000**
- Benchmark contract failures: **0**
- Readability null extractions: **0**

### Material Readability wins

Readability improved the deterministic quality score by at least `0.15` on:

- article
- documentation
- product
- comparison
- navigation-heavy
- sidebar/footer-noise
- structured-article

On each of those cases the native extractor scored `0.75` because it preserved the required content but also retained benchmarked navigation/sidebar/footer noise; Readability scored `1.0` by preserving the required phrases while rejecting that boilerplate.

### Neutral / small differences

- malformed HTML: native `0.833`, Readability `0.917`
- rendered dynamic snapshot: both `0.917`
- very small page: both `1.000`
- blocked HTTP 403 remains outside Readability; Foremention correctly preserved the native `blocked` state.

### Material regression

The bounded large-page case is the reason Readability must not replace the native extractor:

- generated input: `270,040` bytes
- bounded input: `262,144` bytes
- native quality: `0.917`
- Readability quality: `0.750`
- native median extraction latency: `6.101 ms`
- Readability median extraction latency in Node/JSDOM: `556.335 ms`

The native inspector therefore remains the reliable bounded fallback and the authority for network/access state.

### Latency evidence

On the small deterministic fixtures, native extraction was generally below `1 ms` median while Readability/JSDOM was roughly `8–32 ms`. This benchmark demonstrates a real quality/runtime tradeoff; it does not justify applying Readability to every source by default.

## Adoption decision

**Decision: `selective-readability-candidate-with-native-fallback`.**

The quality evidence is strong enough to justify a separate production-integration proof, but not strong enough to authorize a blanket parser replacement.

A production implementation may proceed only if it proves a Cloudflare Worker-compatible DOM strategy and preserves this order of authority:

safe network policy → bounded HTML → native metadata/access result → optional selective Readability normalization → native fallback → Source X-Ray observation → separate human review.

Readability must never fetch independently, validate or follow redirects, determine crawler access, convert text into a verified claim, or become provider citation evidence.

## Remaining adoption gate

Production adoption still requires:

1. Cloudflare Worker-compatible DOM implementation without JSDOM-as-runtime assumption;
2. bundle-size and cold-start review;
3. no script/resource execution;
4. bounded parser input and output;
5. deterministic timeout/failure fallback to native text;
6. extraction provenance (`native`, `readability`, or `native_fallback`) and extractor version;
7. Worker dry-run/workerd verification;
8. regression tests proving existing SSRF, DNS/IP, redirect, size, tenant, and human-review boundaries stay unchanged;
9. live production release and Browser Acceptance after merge.

Until those gates pass, Mozilla Readability remains **benchmark-proven but not a Foremention production dependency**.
