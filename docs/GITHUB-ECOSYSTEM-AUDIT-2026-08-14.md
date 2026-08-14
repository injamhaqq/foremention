# Foremention GitHub Ecosystem Audit — 2026-08-14

This document records a broad, relevance-scoped GitHub ecosystem review for Foremention. It is intentionally **not** a claim that every repository on GitHub was exhaustively enumerated; GitHub contains far more repositories than can be meaningfully reviewed. The audit covers the product, source-retrieval, AI/evaluation, data/search, security, testing, release, supply-chain, observability, workflow, privacy, and adjacent GEO/AEO categories that materially overlap Foremention.

The rule is capability-first, not logo-count-first:

> Integrate a repository only when it improves customer evidence, security, reliability, quality, release provenance, or operating leverage more than the complexity and data boundary it adds.

A repository mentioned here is not automatically a production dependency.

## Status vocabulary

- **LIVE / NATIVE** — already part of the actual Foremention product or production architecture.
- **REPO / CI INTEGRATED** — committed to Foremention `main` as an engineering, security, quality, or release control; not customer runtime.
- **PRODUCTION-CAPABLE CODE** — adapter or code path exists but external configuration/live proof may still be required.
- **NEXT PRODUCT INTEGRATION** — worthwhile product capability, but must be implemented behind existing Foremention boundaries rather than blindly installed.
- **TEST / EVALUATION ONLY** — useful in CI, security testing, benchmarking, or offline evaluation; should not run in customer request paths.
- **RESEARCH ONLY** — useful pattern/competitor research; not trusted as Foremention infrastructure.
- **REJECT / DUPLICATE** — unnecessary overlap or wrong operational tradeoff for the current product.

---

## 1. Current Foremention product/runtime foundation

These remain the authoritative product stack:

| System / project | Status | Foremention role |
| --- | --- | --- |
| Next.js | LIVE / NATIVE | application framework |
| React / React DOM | LIVE / NATIVE | UI runtime |
| Cloudflare Workers | LIVE / NATIVE | production runtime |
| Wrangler / Cloudflare Vite tooling | LIVE / NATIVE build tooling | build, dry-run, release support |
| Cloudflare D1 | LIVE / NATIVE | existing public/intake binding |
| Supabase / Postgres | LIVE / NATIVE | transactional/evidence database + Auth |
| Supabase RLS | LIVE / NATIVE | tenant isolation boundary |
| Inngest | LIVE / NATIVE | durable background collection/scheduling |
| Sentry SDK | LIVE / NATIVE runtime code | error instrumentation; external dashboard receipt remains a separately verified control |
| PostHog | LIVE / NATIVE | privacy-limited product analytics |
| Resend | LIVE / NATIVE API integration | product/operator email delivery |
| HIBP Pwned Passwords API | LIVE / NATIVE API integration | k-anonymous compromised-password protection |
| Foremention Evidence Graph | LIVE / NATIVE IP | evidence lineage |
| Foremention Change Graph | LIVE / NATIVE IP | comparable observed change |
| Source X-Ray | LIVE / NATIVE IP | inspectable source evidence |
| Source Snapshot Engine | LIVE / NATIVE IP | bounded page observations/fingerprints |
| Product State Engine | LIVE / NATIVE IP | truthful customer state semantics |
| Cost / Capacity controls | LIVE / NATIVE IP | run and provider spending/capacity safety |

### Provider code already present

Foremention contains provider adapters/code paths for Groq, Gemini, OpenAI, Anthropic, Perplexity, Cloudflare Workers AI, OpenRouter, ZenMux, OmniRouters, and mock/demo testing. Adapter existence is not equivalent to current live provider proof. Groq Compound remains the clearest proven real collection path in the recorded private-beta evidence.

---

## 2. Engineering/security/release repositories integrated in this program

These belong in the repository/release system, not the customer runtime.

| Repository / action | Status | Why it belongs |
| --- | --- | --- |
| `step-security/harden-runner` | REPO / CI INTEGRATED | runner egress/process hardening; audit-first rollout |
| `actions/checkout` | REPO / CI INTEGRATED, SHA-pinned | source checkout with persisted credentials disabled |
| `pnpm/action-setup` | REPO / CI INTEGRATED, SHA-pinned | deterministic pnpm setup |
| `actions/setup-node` | REPO / CI INTEGRATED, SHA-pinned | deterministic Node setup |
| `actions/upload-artifact` | REPO / CI INTEGRATED, SHA-pinned | verified release archive |
| `actions/download-artifact` | REPO / CI INTEGRATED, SHA-pinned | post-verification provenance job |
| `github/codeql-action` | REPO / CI INTEGRATED | JavaScript/TypeScript SAST |
| `actions/dependency-review-action` | REPO / CI INTEGRATED | block risky dependency changes on PRs |
| `gitleaks/gitleaks-action` | REPO / CI INTEGRATED | secret-leak scanning |
| `google/osv-scanner-action` | REPO / CI INTEGRATED | lockfile vulnerability scanning against OSV |
| `aquasecurity/trivy-action` | REPO / CI INTEGRATED | filesystem dependency/config/secret scanning |
| `zizmorcore/zizmor-action` | REPO / CI INTEGRATED | GitHub Actions security analysis |
| `rhysd/actionlint` | REPO / CI INTEGRATED | workflow syntax/expression validation; release binary checksum verified before execution |
| `anchore/sbom-action` / Syft | REPO / CI INTEGRATED | SPDX SBOM generation for exact `main` release |
| `ossf/scorecard-action` | REPO / CI INTEGRATED | scheduled supply-chain/repository posture review |
| `actions/attest` | REPO / CI INTEGRATED | Sigstore-backed build provenance and SBOM attestations |
| GitHub Dependabot | REPO / CI INTEGRATED | weekly npm + GitHub Actions maintenance |

### Important security design

Third-party GitHub Actions are SHA-pinned rather than trusting mutable major tags. Dependabot is configured to maintain GitHub Actions references as well as npm dependencies. Write permissions are not granted globally; the provenance job receives only the attestation/OIDC permissions it needs and only runs after the verified `main` release job succeeds.

---

## 3. High-value repositories reviewed but requiring a separate product/quality implementation

### Browser product acceptance and accessibility

| Repository | Decision | Reason |
| --- | --- | --- |
| `microsoft/playwright` | NEXT QUALITY INTEGRATION | durable signup/onboarding/collection/Source X-Ray/mobile browser acceptance |
| `dequelabs/axe-core` | NEXT QUALITY INTEGRATION | accessibility assertions inside browser tests |
| Lighthouse / Lighthouse CI | NEXT QUALITY INTEGRATION | measured public/product performance + accessibility regression gates |

These require committed test fixtures/configuration and a properly locked dependency update. They should test meaningful Foremention journeys rather than exist as empty dependencies.

### AI/evidence regression testing

| Repository | Decision | Reason |
| --- | --- | --- |
| `promptfoo/promptfoo` | NEXT QUALITY INTEGRATION | provider/prompt/evidence contract regression and red-team evaluation |
| `NVIDIA/garak` | TEST / EVALUATION ONLY | LLM vulnerability probing; never customer runtime |
| `Azure/PyRIT` | TEST / EVALUATION ONLY | structured AI red-team evaluation; never customer runtime |
| DeepEval | TEST / EVALUATION ONLY | benchmark against Promptfoo only if a specific evaluation gap remains |
| Ragas | TEST / EVALUATION ONLY | retrieval-evaluation use cases only |

Promptfoo should run against deterministic fixtures and controlled provider evaluations without exposing customer evidence or creating uncontrolled provider spend.

### Codebase hygiene

| Repository | Decision | Reason |
| --- | --- | --- |
| `webpro-nl/knip` | NEXT QUALITY INTEGRATION | find unused dependencies/files/exports as product surfaces simplify |
| `renovatebot/renovate` | REJECT / DUPLICATE FOR NOW | Dependabot already owns dependency update PRs; do not run two update bots |
| Semgrep | NEXT SECURITY INTEGRATION WHEN RULESET EXISTS | useful targeted rules, but generic noisy scanning should not duplicate CodeQL without Foremention-specific value |
| TruffleHog | REJECT / DUPLICATE FOR NOW | Gitleaks already owns the primary repository secret-scan control |

---

## 4. Source retrieval, extraction, crawling, and change detection

Foremention already has a bounded native source inspector with URL validation, DNS/public-address checks, SSRF blocking, redirect limits, response-size limits, content-type controls, title/description/text extraction, snapshots, fingerprints, and change notifications. Third-party extraction must sit behind that authority rather than replace it.

| Repository / system | Decision | Reason |
| --- | --- | --- |
| `mozilla/readability` | NEXT PRODUCT INTEGRATION | improve main-content extraction behind the existing safe fetch boundary |
| `unclecode/crawl4ai` | CONDITIONAL PRODUCTION FALLBACK | isolated Python/browser service only if native extraction fails a proven source class |
| `dgtlmoon/changedetection.io` | REJECT / DUPLICATE | native snapshots + Change Graph already own change semantics |
| SearXNG | DEFER | self-hosted search operations not justified before SearchRouter demand |
| ArchiveBox | DEFER | archival operational surface exceeds current bounded evidence requirements |
| `browserbase/stagehand` | CONDITIONAL | controlled browser-assisted inspection only for pages that cannot be handled safely by bounded fetch |
| Crawlee | DEFER | avoid a parallel crawler orchestration stack |
| Firecrawl | BENCHMARK ONLY | external crawler/data boundary overlaps native inspector + possible Crawl4AI fallback |
| Browser Use | REJECT | general browser-agent autonomy is too broad for core evidence collection |

Crawl4AI is therefore **not** to be embedded in the Cloudflare Worker. If promoted, it becomes a separately isolated extraction fallback with independent network, robots, redirect, timeout, size, retention, and observability controls.

---

## 5. Search, semantic retrieval, and data infrastructure

| Repository / system | Decision | Reason |
| --- | --- | --- |
| `pgvector/pgvector` | NEXT PRODUCT INTEGRATION | first semantic layer inside existing Postgres |
| Brave Search API | NEXT PRODUCT INTEGRATION via SearchRouter | first external search adapter candidate |
| Exa | BENCHMARK / SECOND ADAPTER | add only if retrieval quality materially differs from first adapter |
| DuckDB | INTERNAL / OFFLINE OPTION | useful for bounded analysis/export QA, not another service |
| Meilisearch | REJECT | Postgres search first |
| Qdrant | REJECT | pgvector first; no second vector DB |
| OpenSearch | DEFER | no demonstrated scale requirement |
| ClickHouse | DEFER | no event volume requiring a second analytical database yet |
| FalkorDB | REJECT | native relational evidence graph remains authoritative |
| dbt | DEFER | no warehouse layer requiring it yet |
| Airbyte | DEFER | broad connector ingestion only after customer integration demand exists |

Semantic retrieval must never mutate historical evidence, silently merge entities, or label semantically similar observations as methodologically comparable.

---

## 6. AI gateways, observability, privacy, and metering

| Repository / system | Decision | Reason |
| --- | --- | --- |
| `open-telemetry/opentelemetry-js` | NEXT OBSERVABILITY INTEGRATION | trace context across request → Inngest → provider → persistence when it complements Sentry |
| `langfuse/langfuse` | DEFER | avoid duplicating raw customer evidence into another observability processor |
| `BerriAI/litellm` | REJECT FOR CUSTOMER OBSERVATIONS | Foremention owns exact provider/model routing and comparability |
| Portkey | REJECT | duplicate provider gateway/control plane |
| Helicone | REJECT | overlaps Sentry/native ledger/possible OTel |
| `microsoft/presidio` | CONDITIONAL PRIVACY INTEGRATION | useful at future free-form/import/logging boundaries where PII detection is required |
| GLiNER | CONDITIONAL | reviewed local entity extraction only if deterministic baselines show value |
| `openmeterio/openmeter` | DEFER | native cost/capacity ledger remains authoritative until billing semantics require more |
| SigNoz | REJECT | duplicate observability control plane |
| OpenFeature | DEFER | native/environment flags are sufficient at current rollout frequency |
| Infisical | DEFER / BENCHMARK | host secret stores remain authoritative until rotation/lifecycle requirements justify migration |

---

## 7. Workflow, integrations, notifications, and authorization

| Repository / system | Decision | Reason |
| --- | --- | --- |
| MCP TypeScript SDK | DEFER / STRATEGIC | governed API/MCP surface after customer use cases exist |
| Activepieces | DEFER / STRATEGIC | explicit connectors/webhooks first; do not add a broad execution engine prematurely |
| n8n | REJECT / DUPLICATE CURRENTLY | same broad workflow-engine overlap |
| Novu | DEFER | Resend + native notification model is sufficient now |
| Svix | DEFER | managed webhook delivery when retry/throughput needs exceed native implementation |
| OpenFGA | DEFER | current organization roles + RLS remain simpler |
| Cerbos | REJECT | parallel authorization control plane |
| SpiceDB | REJECT | parallel authorization datastore/control plane |
| OPA | DEFER | enterprise policy requirement not yet demonstrated |
| Chatwoot | DEFER | support volume does not yet justify another operational platform |
| Metabase | INTERNAL OPTION | curated read-only operations/business views only; never raw cross-tenant customer evidence |

---

## 8. Additional supply-chain/release repositories discovered in this review

These were important additions or explicit considerations beyond the older matrix:

1. **`actions/attest`** — added. Provides signed build provenance and SBOM attestations for the verified release bundle.
2. **`rhysd/actionlint`** — added with checksum-verified release binary. Validates GitHub Actions syntax and expressions.
3. **`zizmorcore/zizmor` / `zizmor-action`** — added. Audits workflow-specific security weaknesses that ordinary application SAST may miss.
4. **`actions/dependency-review-action`** — added. Reviews PR dependency changes rather than relying only on periodic advisories.
5. **`github/codeql-action`** — added. Persistent JavaScript/TypeScript SAST layer.
6. **`anchore/syft` / `anchore/sbom-action`** — added. Produces an exact-release software bill of materials.
7. **OpenSSF Scorecard** — added. Adds a recurring repository/supply-chain posture signal.
8. **Sigstore / Cosign** — researched; `actions/attest` already provides Sigstore-backed GitHub artifact attestations, so standalone Cosign is deferred until Foremention publishes OCI/container artifacts that need registry signing.
9. **SLSA provenance generators** — researched; GitHub `actions/attest` provides the useful provenance layer for the current non-container release model without another release framework.

---

## 9. Adjacent open-source GEO / AEO / AI-visibility repositories reviewed

GitHub search also surfaced a growing set of open-source projects around AI visibility, GEO, AEO, citation monitoring, and browser observation. Examples include:

- `Pupok462/open-geo`
- `anyin-ai/aperture`
- `danishashko/geo-aeo-tracker`
- `ansvisor/ansvisor`
- `alexpospekhov/searchstack-aeo`
- `Citatra/Citatra`
- `WorkSmartAI-alt/ai-visibility-monitor`
- `tanweer4u/llm-visibility-tracker`
- `syntropicsignal-ai/ai-visibility-audit`
- `AKzar1el/mcp-geo`

These are **RESEARCH ONLY** unless a specific implementation is separately audited. Their existence confirms that generic score/rank/visibility monitoring is increasingly commoditized. Foremention should not copy a repo merely because it can produce a visibility score.

Patterns worth studying:

- automated query sets;
- multi-engine observation;
- citation/source position capture;
- browser-observed AI answer surfaces;
- source/citation trend visualization;
- low-friction diagnostics.

Foremention's required differentiation remains stronger evidence provenance, exact provider/model/methodology lineage, source inspection, human review, safe opportunities/actions, and comparable longitudinal remeasurement.

---

## 10. What is deliberately not being installed into the customer runtime

The following would be a regression in architecture quality if blindly added together:

- multiple crawler stacks;
- multiple workflow engines;
- multiple vector databases;
- multiple search databases;
- multiple AI gateways;
- multiple authorization engines;
- multiple observability control planes;
- CI scanners inside the production Worker;
- red-team frameworks inside customer request paths.

A top-quality production system does **not** make Gitleaks, Trivy, CodeQL, OSV Scanner, actionlint, zizmor, Playwright, axe, Lighthouse, Promptfoo, PyRIT, or garak part of every customer request. Those tools protect or evaluate production from the repository/CI layer.

---

## 11. Ordered next integrations after this engineering-foundation PR

1. **Browser/evidence acceptance suite** — Playwright + axe + selected Lighthouse gates against meaningful Foremention journeys, committed with a properly locked dependency update.
2. **AI evidence evaluation suite** — Promptfoo using deterministic fixtures and cost-bounded provider tests; do not send raw customer evidence.
3. **Codebase hygiene** — Knip with an explicit baseline and then blocking unused dependency/export regressions.
4. **Extraction quality** — benchmark Mozilla Readability behind the existing safe source-fetch boundary.
5. **Semantic retrieval** — pgvector in existing Postgres only after defining embeddings, tenant isolation, provenance, deletion, and cost semantics.
6. **SearchRouter** — Brave first; benchmark Exa before adding a second live search provider.
7. **Trace context** — OpenTelemetry only where it complements Sentry/native run provenance without exporting sensitive evidence.
8. **Crawl4AI fallback** — only after a benchmark proves a meaningful class of sources that native safe extraction cannot handle; deploy as an isolated service, never as the evidence authority.

Each of these gets its own small PR, tests, security review, CI, merge, exact-release proof, and live acceptance rather than one unreviewable dependency dump.

---

## 12. Final architecture principle

Foremention should aggressively integrate **engineering capability**, but remain conservative about **runtime control planes**.

The target is not the most dependencies. The target is:

- the strongest evidence integrity;
- the smallest credible attack surface;
- reproducible releases;
- inspectable provenance;
- fast customer activation;
- reliable longitudinal intelligence;
- low operating complexity;
- and a native evidence graph that competitors cannot acquire merely by installing the same GitHub repositories.
