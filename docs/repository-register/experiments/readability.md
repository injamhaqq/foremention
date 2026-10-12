# Experiment — mozilla/readability (register disposition: EXPERIMENT)

**Result: NEGATIVE — not adopted.** Re-run 2026-10-12 against current `main`.

## Acceptance (from the repository register)

> Bounded approved fixture corpus improves readable text without changing SSRF/size/timeout safety.

## What was run

- Corpus: the 12 checked-in fixtures in `benchmarks/source-extraction/` (article, documentation, product, comparison, navigation-heavy, sidebar/footer noise, structured article, malformed HTML, rendered dynamic snapshot, blocked response, very small page, deterministic large page above the 256 KiB inspection bound).
- Harness: `scripts/source-extraction-benchmark.mjs` calls Foremention's real `inspectSourceUrl` (safe URL → DNS/public address → bounded fetch → redirect/content-type/size limits) with a stub fetcher, and gives Readability exactly the same bounded HTML prefix. Score = `0.75 × required-phrase recall + 0.25 × boilerplate rejection`.
- Candidates: `@mozilla/readability` 0.6.0 (Apache-2.0) with
  - **JSDOM 20.0.2** (Node only — the historical baseline), and
  - **linkedom 0.18.12** (ISC) — the DOM that would actually be needed for Cloudflare Workers (JSDOM does not run in workerd).
- Change in this PR: the benchmark gained `BENCHMARK_DOM=jsdom|linkedom`, and the CI workflow (`.github/workflows/source-extraction-benchmark.yml`) now runs both. Neither package enters `package.json` / the production lockfile; they install into an isolated `.source-benchmark-runtime/`.

## Results (local run, Node 22, 2026-10-12)

| Metric | Native (prod) | Readability + JSDOM | Readability + linkedom |
|---|---:|---:|---:|
| Average quality (11 content fixtures) | **0.977** | 0.962 | 0.962 |
| Article-like quality | 1.000 | 1.000 | 1.000 |
| Material wins (Δ ≥ 0.15) over native | — | none | none |
| Material regressions vs native | — | large-near-limit (0.75 vs 0.917) | large-near-limit (0.75 vs 0.917) |
| Large bounded page median latency | ~15 ms | ~672 ms | ~77 ms |

Per-case differences: malformed HTML (native 0.833, Readability 0.917 — below the 0.15 materiality bar), dynamic snapshot (native 1.0, Readability 0.917), large page (native 0.917, Readability 0.75). Every other content fixture ties at 1.0.

## Decision

The acceptance test is **not met**: Readability does not improve readable text on the approved corpus — it is lower on aggregate and regresses the bounded large page with either DOM. Since there is no improvement, no opt-in/flagged extractor path was added (it would only add a DOM dependency, bundle weight and a non-sanitizing HTML parser to the Worker for no measured gain). SSRF/DNS/redirect/size/timeout code in `lib/source-inspection.ts` is untouched.

This agrees with the 2026-08-14 decision in `docs/SOURCE-EXTRACTION-DECISION-2026-08-14.md` and extends it with the Worker-compatible DOM (linkedom), which was the open "DOM compatibility must be established" gap in the register.

## Reopen criteria

Reopen only when a real customer source class fails the native path (required content missing, repeated loss on malformed markup) and a new fixture for it shows a material Readability win (Δ ≥ 0.15) with linkedom, with no regression on the existing corpus. The CI benchmark already measures both DOMs on any change to the extractor or fixtures.

## Reproduce

```bash
mkdir -p .source-benchmark-runtime && cat > .source-benchmark-runtime/package.json <<'JSON'
{"private":true,"dependencies":{"@mozilla/readability":"0.6.0","jsdom":"20.0.2","linkedom":"0.18.12"}}
JSON
npm install --prefix .source-benchmark-runtime --package-lock=false --ignore-scripts --no-audit --no-fund
BENCHMARK_DOM=jsdom    node --experimental-strip-types --expose-gc scripts/source-extraction-benchmark.mjs
BENCHMARK_DOM=linkedom node --experimental-strip-types --expose-gc scripts/source-extraction-benchmark.mjs
# results: source-extraction-benchmark-results/{jsdom,linkedom}/summary.md
```
