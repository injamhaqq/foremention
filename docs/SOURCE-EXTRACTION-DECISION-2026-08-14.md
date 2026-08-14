# Source Extraction Decision — 2026-08-14

## Scope

This record evaluates extraction quality without changing Foremention's production source-inspection authority.

The production boundary remains:

safe URL validation → DNS/public-address checks → bounded fetch → redirect validation → content-type and size limits → deterministic extraction → Source X-Ray observation → separate human review.

No benchmark extractor may bypass those controls or become verified evidence by itself.

## Current upstream facts

### Mozilla Readability — BENCHMARK NOW

- Official repository: `mozilla/readability`.
- Current repository package version inspected for this benchmark: `@mozilla/readability` `0.6.0`.
- License declared by the package source: Apache-2.0.
- Readability expects a DOM `document`; Mozilla's Node example uses JSDOM.
- Mozilla explicitly warns that Readability is not a sanitizer. Foremention does not render Readability HTML in this benchmark; only normalized text is evaluated.
- JSDOM scripts and remote resource loading remain disabled by default in this benchmark.
- Benchmark dependencies are isolated from Foremention's production dependency graph.

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

The deterministic corpus contains twelve checked-in HTML fixtures:

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
12. large page near the bounded inspection limit

The benchmark compares Foremention's actual `inspectSourceUrl` implementation against Mozilla Readability running with JSDOM in an isolated CI-only runtime.

Quality is not a subjective score. For each fixture:

- `relevantPhraseRecall = required phrases present / required phrases defined`
- `boilerplateRejection = 1 - forbidden boilerplate phrases present / forbidden phrases defined`
- `qualityScore = 0.75 * relevantPhraseRecall + 0.25 * boilerplateRejection`

Latency is the median of three extraction runs.

Heap delta is informational only because JavaScript garbage collection and CI runtime behavior make it noisy.

For truncated fixtures, Readability receives the same bounded HTML prefix permitted to the native inspector.

## Adoption gate

A quality win alone does not authorize production integration.

Production adoption still requires:

1. material benchmark improvement on customer-relevant page classes;
2. no unacceptable regression on product/comparison/small pages;
3. a Cloudflare Worker-compatible DOM strategy;
4. bundle and cold-start review;
5. security review;
6. Worker dry-run and workerd/browser acceptance;
7. provenance that records which extractor produced the normalized text;
8. native fallback and existing SSRF/network controls remaining authoritative.

Benchmark results are written to the workflow artifact rather than fabricated in this document before the run.
