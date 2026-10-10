# FM-02 — Evidence Retrieval, Inspection and Extraction Decision (2026-10-09)

**Authority:** FM-02 extraction and evidence inspection only. FM-00 owns integration.
**Main baseline:** `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
**Status:** Code fix proposed on branch, not released. Existing 12-fixture native/Readability benchmark rerun; no live-page or vendor-crawler head-to-head. Commercial search license NOT CLEARED.

## Decision — KEEP / ADAPT / ADOPT

**KEEP** the existing Bing RSS -> Cloudflare Workers AI discovery lane, existing bounded
`source-inspection.ts`, tenant-scoped Source Map, `source_snapshots` and human review
until a specific customer requirement and license review justify replacement. **ADAPT**
coverage truth, SSRF/transport controls, legal permission verification, and
independent relevance tests. **DO NOT ADOPT** a separate default Python crawler,
LLM browser agent, or paid API today. Source X-Ray remains retired as a standalone
product.

Bing RSS results are independently retrieved URLs, **not native provider citations**.
Cloudflare Workers AI can select links from retrieved results, but the citation's
origin must stay explicit in the record. Never recast a mentioned URL or a crawler
result as a native model citation. This decision does not authorize continued
commercial use of Bing RSS: license question #346 blocks expanded collection.

## Actual implementation map on audited main

1. `lib/free-web-retrieval.ts`: at most eight Bing RSS hits, HTTP(S) URL
   normalization, output snippets and `retrievalProvider: "bing-rss"`.
2. `lib/providers/cloudflare.ts`: model consumes retrieved snippets and selects
   indexed citations; provider adapter belongs to FM-01.
3. `lib/source-inspection.ts`: HTTP(S) only, blocks credentials, nonstandard ports,
   localhost/reserved destinations, checks DNS, validates up to three redirects,
   bounded HTML/text read, visible-text metadata and optional page text.
4. `lib/source-map-generation.ts`: after observation, aggregates citations by
   distinct source; inspects bounded pages, records observed brand terms,
   persists snapshots; reviewed map publishes only following verified run review.
5. `lib/source-snapshots.ts`: 24k normalized text SHA-256, bounded 4k excerpts,
   retrievability history, previous snapshot links, idempotent source observations.
6. `components/recommendation-source-evidence.tsx`: contained Record evidence,
   crawler state, citations vs credibility heuristic, explicit human-review path.
7. `lib/evidence-quality.ts`: distinct freshness (observation age), retrieval,
   authority, corroboration and review dimensions. This is **not** proof of
   source publication recency or causal influence.
8. `supabase/migrations/20260813080000_source_snapshot_engine.sql` and related
   policies: persistent organization-scoped snapshot audit linkage. No schema or
   retention changes are proposed in FM-02.

**Overlap:** Active PR #456 owns official-domain Bing query/URL filtering; PR #459
owns native-provider returned-citation separation; PR #455 owns incomplete
aggregate integrity. Do not copy or supersede those changes.

## Current -> target (verified gap ledger)

| Capability | Main | Target / owner |
| --- | --- | --- |
| Returned citations distinct from search-retrieved URLs | Partial adapter boundaries; #459 open | FM-01 with FM-00 |
| Official-site search scope | Generic RSS search on main; #456 open | Merge only after its review and license gate |
| HTTP HTML/plain static inspection | Implemented, bounded | KEEP |
| JS-rendered inspection | Not in default path | Optional adapter only if corpus fails |
| Absent brand on truncated/partial page | Can claim `absent` when `partial` and no match | FM-02 patch: unknown unless complete coverage |
| Redirect / DNS URL guard | URL and resolved-address guards exist | FM-02 + security review on DNS rebinding |
| Robots / ToS compliance | No per-host robots policy in inspector | Gate any new commercial crawler |
| Historical bounded snapshots | Implemented | KEEP existing RLS and representation version |
| Canonical redirects/duplicates | Partial URL normalization, source IDs, final URL | Evaluate cross-redirect dedup in corpus |
| Source support for exact assertions | Mention/substring heuristic, human review | Evidence-span support check, coordinated FM-05 |
| Existing extraction benchmark | Twelve fixture cases and native vs Readability workflow implemented | Preserve and extend the benchmark before any new vendor quality claim |

## Security, privacy and legal acceptance

- **High-priority unresolved:** DNS lookup through Cloudflare DoH is a preflight
  check, but the Worker `fetch` may resolve independently at connection time.
  That check **does not prove DNS rebinding resistance or destination pinning**.
  Security review must validate an execution-layer egress policy or a
  provider-mediated fetch where destination restrictions are enforced at
  connection time. Do not advertise complete SSRF mitigation.
- **Additional FM-02 DNS patch:** reject malformed/non-IP A/AAAA answers in
  `lib/source-inspection.ts` before the first fetch and on every manually
  validated redirect. Offline tests assert zero fetches for fake hostnames,
  malformed IPv6, private IPv4/IPv6, mapped private IPv4, and mixed address
  sets. This closes an input-validation weakness; it is **not** a rebinding
  solution because the actual transport destination remains unpinned.
- Fail closed for malformed IP answers; every redirect needs fresh destination
  validation; reserved/unicast and numeric-host evasion cases need negative tests.
- Reject credentialed URLs, private/metadata destinations, unexpected ports,
  excessive redirects, oversized responses, executable/unexpected MIME,
  cross-tenant references, and unauthorized customer URL requests.
- Do not feed retrieved text to model instruction roles. Mark retrieved HTML,
  metadata and snippets as untrusted; prevent prompt injection from escalating
  to tools, secret access, cross-origin fetches, review, or attribution.
- Browser fallback must use disposable contexts, no customer cookies,
  no internal network, no downloads/scripts outside sandbox, 0..N page caps,
  size/time/memory/concurrency ceilings, and approved robots/ToS posture.
- Keep existing bounded snapshots, organization RLS, human review, and retention.
  Full HTML, PII-bearing pages, screenshots, credentials and raw cookies are
  not to be persisted as a default. No production policy change authorized.
- Bing RSS commercial redistribution/license scope is unresolved (#346). Stop
  expansion until counsel/provider permission confirms suitable rights.

## Source provenance (FM-05 schema proposal; do not edit shared schema here)

`origin`: native_provider_citation | provider_structured_search |
independent_search_result | model_mentioned_url | independently_inspected_page

Track `provider`, `model_id`, `run_id`, `organization_id`, `project_id`,
`question_id`, `reference_index`, original / final / canonical URL,
retrieval method/version, observed / checked timestamp, status, redirect chain,
HTTP content type/status, fingerprint/version, excerpt limits, snapshot ID,
source observation IDs, robots/permission disposition, page support status,
reviewer/action timestamp, limitations, and comparison eligibility.

Enforce that `model_mentioned_url` and `independent_search_result` never
increment provider-native citation denominators. Page inspection establishes
only page content observed at inspection time. Excerpts are not full archives.
No assertion of recommendation causation.

## Design scoring (NOT extraction benchmark)

Weights: customer value / product fit / evidence truth / security /
reliability / operating cost / reversibility / legal = 20/15/15/15/10/10/10/5.
Scores are analyst *architecture-fit judgments*, not experimental accuracy,
vendor SLAs, actual prices or permission to scrape. Critical risk veto
overrides any total.

| Option | V | F | E | S | R | C | Rev | L | Total | Role |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Existing bounded inspector (adapt) | 18 | 15 | 13 | 11 | 8 | 10 | 10 | 3 | 88 | Default; SSRF/license gates unresolved |
| Licensed Search API SDK | 16 | 13 | 11 | 11 | 9 | 7 | 9 | 4 | 80 | Discovery substitution after licensing |
| Cloudflare Browser Run | 16 | 13 | 12 | 11 | 8 | 6 | 8 | 4 | 78 | JS fallback PoC within plan caps |
| Crawlee (TS) | 16 | 11 | 12 | 10 | 8 | 7 | 8 | 4 | 76 | Optional portable service |
| Crawl4AI (Python) | 16 | 9 | 12 | 9 | 7 | 7 | 7 | 4 | 71 | Python sidecar only if measured gain |
| Jina Reader API | 15 | 10 | 12 | 9 | 7 | 6 | 8 | 3 | 70 | Externally hosted extraction candidate |
| Firecrawl cloud/self-host | 17 | 10 | 12 | 10 | 8 | 5 | 6 | 2 | 70 | Legal/hosting/paid review first |
| Stagehand | 13 | 8 | 8 | 7 | 7 | 4 | 7 | 3 | 57 | Agent browser, not default evidence |
| ScrapeGraphAI | 13 | 6 | 8 | 7 | 6 | 4 | 6 | 4 | 54 | LLM extraction experiment |
| browser-use | 11 | 7 | 7 | 6 | 6 | 4 | 6 | 3 | 50 | Interactive tasks, not source truth |
| GPT Researcher | 9 | 5 | 9 | 7 | 6 | 5 | 5 | 4 | 50 | Research synthesis, not measurement |

Licenses according to public upstream repositories at review: Crawlee Apache-2.0,
Crawl4AI Apache-2.0, Stagehand MIT, browser-use MIT, ScrapeGraphAI MIT,
GPT Researcher Apache-2.0; Firecrawl server chiefly AGPL-3.0 with MIT
SDKs. **Verify exact package/submodule license, deployment/network obligations,
provider terms and data-processing terms** before adopting. Cloudflare
Browser Run is a hosted platform feature, not a license to scrape content.
No free tier implies unlimited production capacity.

## Extraction benchmark: existing receipt and unexecuted expansion

**Existing benchmark must not be duplicated:** `scripts/source-extraction-benchmark.mjs`,
`benchmarks/source-extraction/cases.json`, and
`.github/workflows/source-extraction-benchmark.yml` already compare Foremention
native extraction with Mozilla Readability/JSDOM on twelve checked-in deterministic
HTML fixtures. See `docs/SOURCE-EXTRACTION-DECISION-2026-08-14.md` for the
original dated baseline. This benchmark does not execute JavaScript or prove
current live-web accuracy.

**Current recheck receipt:** the existing Source Extraction Benchmark workflow
run `37923431253` succeeded at code SHA
`b63bc5b1c863c97e1dc6842438606081a304186f` on 2026-10-09:
native average fixture quality `0.977`, Readability `0.962`;
native and Readability article-like quality both `1.000`;
zero material Readability wins, one large-bounded-page Readability regression,
quality decision `do-not-adopt`. These are phrase-recall / boilerplate-rejection
scores on test fixtures, NOT independent URL fidelity, vendor accuracy or
real-world search coverage. Workflow artifact:
`https://github.com/injamhaqq/foremention/actions/runs/37923431253`.

**Expansion not yet executed:** Assemble licensed, explicitly permitted public
pages, fixture copies or test
servers: 4 clean static articles, 3 complex-nav pages, 3 JS-rendered pages,
2 redirected/canonical duplicates, 2 blocked/robots pages, 2 malformed HTML
pages, 2 PDFs with selectable text (separate PDF pipeline), 2 changed-over-time
pages, 2 prompt-injection pages, and 2 oversized/unsafe destination fixtures.
Include first-party baseline and competitors using same query/URL set. Do not
test private customer URLs without permission.

Record per-URL success/unknown/blocked, title precision, supported key-claim
recall and precision against two human-reviewed golden spans, false positive
`absent` rates, redirect correctness, canonical URL, source-date fidelity,
evidence-span offsets, retries, total bytes, p50/p95 latency, per-page cost,
robots disposition, network safety and retention. Use exact tool/model
versions, fixed retry cap, dates and frozen fixture hash. A blocked page must
not be scored as a successful extraction.

Go/no-go: any private-address reachability, unauthorized robots bypass,
tenant bleed, fabricated provider citation, false `absent` on truncated
page or unreviewed automated promotion is a veto. A new vendor must
materially outperform the existing baseline on permitted pages *after*
including operational and legal costs, not merely produce prettier Markdown.

## Additional source-coverage safety hardening

A successful HTTP 200 response is **not** proof that a page has inspectable
content. On blank HTML, blank plain text, or a JavaScript-only application
shell, the static extractor can return an empty string while the HTTP status
is `open`. Such results now receive `pageTextCoverage: partial` and
`pagePresenceState: unknown`, not `absent`. Deterministic response fixtures
cover these three cases. A JavaScript-only shell with a nonempty static
`<title>` is also `unknown` unless the HTML response contains readable
static body text. The stored fingerprint and extracted text are unchanged;
only the internal coverage attestation is tightened. This is intentionally conservative: only the
returned, fully captured static text can support a narrow negative
observation; nothing here proves JavaScript-rendered absence.

## Bounded mention matching correction

Page observations previously used raw substring checks. That can turn a
different product name such as `NotAcme` or `AcmePlus` into a false positive
for `Acme`. The FM-02 matcher now checks Unicode letter/number/mark/underscore
boundaries on both ends of brand and competitor terms. Ordinary punctuation,
multiword brand names and domain-style references remain matchable. It is a
deterministic lexical mention check, **not** proof of semantic endorsement,
recommendation causality, source authority or independent attribution. Tests
cover nested terms, partial pages, competing labels and Unicode punctuation.

## FM-02 submitted change and verification limits

New `lib/source-page-presence.ts` supplies a deterministic coverage gate:
a found mention may be recorded on a partial retrieved page; a missing brand
is `unknown` unless `access=open` and the inspector explicitly attests
complete coverage of its static bounded visible-text representation: exact
text identity (not merely equal lengths), no HTTP/body truncation, no
boilerplate excluded, and no extracted-text cap reached. This does not prove
the absence of script-rendered content, future updates or uninspected content.
New deterministic tests exercise actual HTTP 206, text truncation, static
HTML, omitted navigation/footer, oversized representations, blocked and
unknown responses.
Source DNS regression tests additionally require validation of actual IP
syntax (including IPv6 literals), rejection of malformed A/AAAA records, and
zero network requests on invalid resolution.

**Verification:** Previous patch CI failed an outdated structural regression
test that asserted the old unsafe direct ternary. That test was updated to
assert the new source inspector coverage contract. Current exact-head CI remains
an independent required gate; successful 12-fixture benchmark and security
workflows do not prove production readiness. No live provider spend authorized.
FM-00 owns integration after exact-SHA gates.

## FM-02 continuation packet to FM-00

1. Review/merge FM-02 coverage patch if test + security gates pass; preserve
   source map migration/review semantics and no claim of page-wide absence.
2. Resolve #346 Bing RSS commercial rights and #345 relevance; coordinate PR #456.
3. Coordinate FM-01 PR #459 to preserve native vs retrieved citations and avoid
   shared provider-adapter edits from FM-02.
4. FM-05: define provenance/coverage state (if needed) without backfilling
   historical rows; require tenant-scoped, immutable human review linkage.
5. FM-06: own any future job queue/browser budget, retries and idempotency.
6. Security owner: test DNS rebinding at network connection time, robots and
   external resource isolation; block broad untrusted crawling until corrected.
7. Keep the successful existing 12-fixture native/Readability receipt, and
   extend the permitted corpus with real-world and adversarial cases before
   deciding on Crawlee/Crawl4AI/Firecrawl/Browser Run. Do not infer a vendor
   winner from the native/Readability-only fixture benchmark.
8. No secrets changed, no paid services activated, no retention changes,
   no production actions, no merge or auto-deployment from this workstream.

Source references: github.com/apify/crawlee, github.com/unclecode/crawl4ai,
github.com/firecrawl/firecrawl, github.com/browserbase/stagehand,
github.com/browser-use/browser-use,
github.com/ScrapeGraphAI/Scrapegraph-ai,
github.com/assafelovic/gpt-researcher,
developers.cloudflare.com/browser-run/, jina.ai/reader/.
