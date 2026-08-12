# Foremention Next Engineering Priorities — 2026-08-12

This document prevents scope creep after the current product-repair series. It is intentionally ordered around evidence integrity, customer comprehension, reliability, maintainability, and only then additional infrastructure.

## P0 — Release canonicalization

Do not begin a broad new product slice until the current canonical main release is coherently live and production provenance is verified.

Required target commit: `787111087bc1219d444dd4cd1f0508094435b96d`.

See `docs/PRODUCTION-CANONICALIZATION-CHECKLIST-2026-08-12.md`.

## P1 — Complete customer acceptance on live production

Verify the real first-time customer path end to end:

website → buyer questions → collection → AI result → cited sources → Source X-Ray → human review → competitor context → reviewed opportunity → action → later remeasurement.

Fix any dead or misleading control before adding new platform complexity.

## P2.1 — Source Snapshot Engine + Change Graph v2

Prefer native Foremention code and existing Postgres first.

Minimum useful snapshot model:

- source identity / canonical URL;
- retrieval timestamp;
- HTTP/content metadata;
- title;
- bounded clean text or normalized content representation;
- content hash;
- previous snapshot relationship;
- deterministic changed/unchanged state;
- linked AI observation/citation;
- human-review state;
- organization/workspace ownership.

Do not store broad archives by default. Prototype Crawl4AI/Readability/Browsertrix/ArchiveBox only where native bounded retrieval cannot satisfy a proven evidence requirement.

Change Graph must distinguish:

- new/lost AI mention;
- new/lost citation;
- new/lost source;
- changed source content;
- new/lost competitor;
- changed claim/context;
- methodology change vs product observation change.

Never infer causation from temporal sequence.

## P2.2 — Semantic retrieval

Use current global Postgres search until a real user/relevance gap is demonstrated.

When needed:

1. add `pgvector` inside existing Postgres/Supabase;
2. define tenant-scoped embeddings with explicit provenance/model version;
3. use semantic retrieval for related questions/sources/claims/evidence;
4. measure relevance and query cost;
5. only consider Qdrant/Meilisearch/OpenSearch after Postgres becomes a measured bottleneck.

## P2.3 — External SearchRouter

Build native provider-neutral interfaces before enabling external providers.

Candidate adapters:

- Brave Search API;
- Exa;
- SearXNG.

Persist search-provider identity, query, timestamp, rank/position when returned, URL, and relevant metadata.

Search observations must remain a distinct evidence type from AI recommendation observations and consumer-AI browser-surface observations.

## P2.4 — Release / quality gates

Add tooling incrementally after compatibility proof:

- Playwright for authenticated customer journeys;
- axe-core for accessibility;
- Lighthouse CI for key-route regressions;
- Gitleaks / Trivy / Semgrep / OSV / Harden Runner where each integrates cleanly with the current CI;
- Promptfoo for provider/prompt regression suites;
- k6/Toxiproxy only when a suitable non-production failure-test environment exists.

Do not add several overlapping tools in one PR merely to satisfy the technology radar.

## P2.5 — Product truth and economics

Continue the native Product State and Product Truth layers across every core screen. Any important customer-visible metric should carry enough information to recover:

- source;
- timeframe;
- sample/denominator;
- workspace;
- methodology;
- freshness;
- review/verification state.

Expand the internal cost ledger to search/crawl/browser/storage/email only when those costs are actually incurred. Keep raw infrastructure economics out of the primary customer experience.

## Future triggers, not current tasks

- Activepieces: only when explicit connectors/webhooks/MCP cannot satisfy real integration demand.
- Novu: only when multi-channel orchestration/preferences/digests become operationally complex.
- Firecrawl: benchmark only against a demonstrated retrieval failure; do not add by default.
- ClickHouse/dbt: only after Postgres analytics becomes a measured scale problem.
- vLLM/TEI: only after internal inference economics justify GPU/SRE burden.
- OpenFGA/Cerbos/SpiceDB/OPA: only after current RLS/native-role authorization becomes insufficient for real enterprise requirements.
- Temporal: do not introduce while Inngest satisfies durable workflow requirements.

## Definition of good progress

Progress is not the number of dependencies installed. A successful Foremention release should make the customer experience simpler while increasing evidence integrity, reliability, longitudinal intelligence, and operational confidence underneath.
