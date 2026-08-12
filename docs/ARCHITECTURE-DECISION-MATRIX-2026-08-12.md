# Foremention Architecture Decision Matrix — 2026-08-12

This matrix is a product/architecture fit decision, not a claim that every third-party project is currently suitable for production. Before adopting anything marked **IMPLEMENT**, **PROTOTYPE**, or **STAGING**, re-check its current license, maintenance, security posture, deployment model, and data-handling terms.

Principle: Foremention should remain one disciplined product, not a collection of services. The proprietary asset is the longitudinal evidence/intelligence model; open-source software is supporting machinery.

## Canonical native Foremention IP

| System | Decision | Reason |
|---|---|---|
| Evidence Graph | KEEP EXISTING + IMPLEMENT | Core proprietary lineage from question to answer, citation, review, opportunity, action, and remeasurement. Extend natively. |
| Change Graph | IMPLEMENT | Core differentiator for new/lost/changed answers, mentions, sources, claims, competitors, and later observations. Keep native and evidence-bound. |
| Source X-Ray | KEEP EXISTING + IMPLEMENT | Product-defining source inspection/review surface. Extend snapshots/change intelligence without replacing the model. |
| Source Snapshot Engine | IMPLEMENT | Needed for durable page-change evidence; store bounded, lawful snapshots/hashes with lineage. |
| Provider Registry | KEEP EXISTING + IMPLEMENT | Exact provider/model provenance is methodology, not generic routing metadata. |
| Model Capability Registry | IMPLEMENT | Record citation/search/tool capabilities and comparability constraints explicitly. |
| Methodology Registry | IMPLEMENT | Version observation surface, collection technique, prompt/version, and comparison rules. |
| Prompt Version Registry | IMPLEMENT | Required to prevent silent methodology drift across historical observations. |
| Entity Resolution Layer | IMPLEMENT | Native mapping of company/competitor/source identities with auditable merges, not black-box identity guesses. |
| Product State Engine | KEEP EXISTING + IMPLEMENT | Canonical customer state semantics now exist; expand across all core screens. |
| Product Truth Layer | IMPLEMENT | Every metric needs source, denominator, time, workspace, methodology, freshness, and verification status. |
| Search Router | IMPLEMENT | One native abstraction for external search providers; do not confuse search results with AI recommendation observations. |
| Cost Ledger | KEEP EXISTING + IMPLEMENT | Attempt-level AI costs already persist; extend to search/crawl/browser/storage/email while keeping customer UI outcome-focused. |
| Capacity Manager | KEEP EXISTING + IMPLEMENT | Existing quotas/budgets/circuit behavior should remain the single control plane for run capacity. |
| Opportunity Engine | KEEP EXISTING + IMPLEMENT | Deterministic, reviewed-evidence-first opportunity logic. No magic composite score. |
| Action/Remeasurement Loop | KEEP EXISTING + IMPLEMENT | Preserve action lineage and comparable follow-up observations without causal overclaiming. |

## Core platform and current stack

| Technology | Decision | Reason |
|---|---|---|
| Supabase / Postgres | KEEP EXISTING | Primary transactional/evidence database. One strong database is preferable to adding stores prematurely. |
| Supabase RLS | KEEP EXISTING | Primary tenant isolation boundary; every new tenant-owned table must remain RLS-tested. |
| pgvector | STAGING | Use inside Postgres for semantic retrieval when keyword search proves insufficient; no separate vector DB first. |
| Cloudflare Workers | KEEP EXISTING | Existing production edge/runtime path and bindings. Do not recreate infrastructure. |
| Cloudflare Workers SDK / Wrangler | KEEP EXISTING | Existing build/deployment tooling. |
| workerd | STAGING | Useful for Worker-runtime compatibility testing; not another production service. |
| Inngest | KEEP EXISTING | Existing durable collection/scheduling workflow. Do not introduce a second workflow engine without a demonstrated gap. |
| Sentry | KEEP EXISTING | Existing error monitoring/correlation foundation. |
| Resend | KEEP EXISTING | Existing application-alert email path; authentication email remains separate. |
| Groq / Groq SDK | KEEP EXISTING | Existing citation-capable observation provider path; exact provider/model provenance remains mandatory. |
| Google GenAI SDK | FUTURE | Add only when direct Gemini observation support justifies the SDK over the current adapter style. |
| OpenAI Node | FUTURE | Add only for a real direct OpenAI observation surface; never merely for generic internal inference. |
| PostHog | KEEP EXISTING | Existing privacy-limited product analytics; keep raw evidence/password/form content excluded. |

## Source retrieval, web search, and archives

| Technology | Decision | Reason |
|---|---|---|
| Crawl4AI | PROTOTYPE | Strong candidate for richer Source X-Ray extraction. Evaluate in an isolated service with SSRF/network controls before production. |
| Mozilla Readability | IMPLEMENT | Small, focused extraction dependency/algorithm for readable page text where safe fetches already exist. |
| changedetection.io | PROTOTYPE | Evaluate algorithms/operational ideas for change detection; native Change Graph remains system of record. |
| Brave Search API | STAGING | Candidate external SearchRouter adapter; credential required before live proof. |
| Exa | STAGING | Candidate external SearchRouter adapter for retrieval breadth; preserve exact provider/search metadata. |
| SearXNG | PROTOTYPE | Evaluate only if self-hosting cost/maintenance is justified; not a default extra service. |
| ArchiveBox | PROTOTYPE | Evaluate retention/export patterns; not primary evidence storage. |
| Browsertrix | FUTURE | Heavy browser archival only if evidence requirements exceed bounded fetch/snapshot capability. |
| pywb | FUTURE | Replay layer only if Foremention later operates a compliant web archive. |
| Stagehand | PROTOTYPE | Browser-assisted source inspection for pages that require interaction; never a default crawler. |
| Firecrawl | REJECT | Overlaps native safe-fetch + prospective Crawl4AI/Readability path and adds another external data boundary. Revisit only if a proven gap remains. |
| Crawlee | FUTURE | Browser/crawl orchestration alternative; avoid parallel crawl stacks now. |
| Browser Use | REJECT | General browser-agent autonomy is unnecessary for the evidence collection core and broadens the security boundary. |

## Search, retrieval, data stores, and analytics infrastructure

| Technology | Decision | Reason |
|---|---|---|
| Meilisearch | REJECT | Postgres search first; another index/database is unjustified now. |
| Qdrant | REJECT | pgvector first; avoid a second vector database. |
| OpenSearch | FUTURE | Only for demonstrated high-scale text/log search needs beyond Postgres. |
| ClickHouse | FUTURE | Only after event/observation volume makes Postgres analytics materially inadequate. |
| DuckDB | STAGING | Useful for offline/internal analysis and export QA without adding a service. |
| dbt | FUTURE | Adopt when a real analytics warehouse/modeling layer exists. |
| Great Expectations | FUTURE | Consider for large analytical data pipelines; current transactional invariants belong in schema/tests. |
| OpenLineage | FUTURE | Warehouse/pipeline lineage only when those systems exist; Foremention evidence lineage remains native. |
| FalkorDB | REJECT | Native relational graph structures first; adding a graph DB does not create a moat. |
| Airbyte | FUTURE | Broad connector ingestion only if customer data integrations become a proven product need. |
| DVC | REJECT | Not a fit for the primary application/evidence history; Git + database lineage already cover current needs. |

## AI gateway, evaluation, safety, and inference

| Technology | Decision | Reason |
|---|---|---|
| LiteLLM | PROTOTYPE | Evaluate in staging for internal inference abstraction only. Comparable customer observations must not silently route models. |
| Portkey | REJECT | Do not run two gateway/control planes; evaluate LiteLLM first and keep native observation routing authoritative. |
| Langfuse | STAGING | Evaluate for non-sensitive LLM trace/evaluation metadata; never duplicate raw customer evidence unnecessarily. |
| Helicone | REJECT | Overlaps Langfuse/Sentry/native cost ledger and adds another data processor. |
| Promptfoo | IMPLEMENT | High-value regression/evaluation gate for prompts/provider adapters and evidence-handling contracts. |
| DeepEval | PROTOTYPE | Compare with Promptfoo for targeted offline quality evaluation before adding another permanent framework. |
| Ragas | PROTOTYPE | Relevant only to retrieval/evidence evaluation; not a primary runtime dependency. |
| Evidently | FUTURE | Consider when model/data drift monitoring has a concrete internal use case. |
| Guardrails AI | PROTOTYPE | Evaluate narrow structured-output validation use cases; native deterministic validation stays preferred. |
| PyRIT | STAGING | Security/red-team evaluation for AI-facing surfaces, not production runtime. |
| garak | STAGING | Automated LLM vulnerability probing in security CI/staging. |
| NeMo Guardrails | REJECT | Runtime conversational guardrail layer is unnecessary for current deterministic product flows. |
| DSPy | FUTURE | Research optimization only after stable evaluation datasets exist; not customer observation methodology. |
| Text Embeddings Inference | FUTURE | Self-host embeddings only when volume/economics justify operational burden. |
| vLLM | FUTURE | Self-host inference only when proprietary/internal workload economics clearly justify GPUs and SRE burden. |
| GLiNER | PROTOTYPE | Candidate local entity extraction for brand/competitor mentions with deterministic reviewable output. |
| Microsoft Presidio | STAGING | Useful for PII detection/redaction around imported documents/logging boundaries. |

## Testing, security, supply chain, and reliability

| Technology | Decision | Reason |
|---|---|---|
| Playwright | IMPLEMENT | Browser acceptance/E2E for activation, auth, collection, review, pause/resume, mobile, and errors. |
| axe-core | IMPLEMENT | Automated accessibility checks alongside Playwright. |
| Lighthouse CI | IMPLEMENT | Performance/accessibility regression gate for key public/customer routes. |
| k6 | STAGING | Load/failure testing for read APIs, collection queueing, and health paths. |
| Gitleaks | IMPLEMENT | Secret scanning in CI/pre-merge. |
| Trivy | IMPLEMENT | Dependency/container/config vulnerability scanning where applicable. |
| Semgrep | IMPLEMENT | Targeted static security rules for auth/RLS/URL handling/server boundaries. |
| OSV Scanner | IMPLEMENT | Supply-chain vulnerability gate complementary to package audit. |
| Syft | STAGING | Generate SBOMs for release artifacts when deployment pipeline can retain them. |
| Cosign | FUTURE | Sign release/container artifacts when Foremention has a stable artifact registry/deploy path. |
| OpenSSF Scorecard | STAGING | Dependency/repository hygiene signal; advisory, not a substitute for review. |
| Harden Runner | IMPLEMENT | Reduce GitHub Actions egress/supply-chain exposure when workflow compatibility is verified. |
| ZAP | STAGING | Authenticated/non-destructive web security scanning against staging. |
| Knip | IMPLEMENT | Find unused code/dependencies as the product is simplified. |
| MSW | STAGING | Frontend/integration test doubles when real API contracts become difficult to exercise deterministically. |
| Testcontainers | FUTURE | Add if local integration tests need real Postgres/services; current CI does not justify Docker complexity yet. |
| Toxiproxy | FUTURE | Failure injection when containerized integration environment exists. |
| Mailpit | STAGING | Local email rendering/delivery testing; no production role. |
| React Email | PROTOTYPE | Evaluate if product-alert email volume/design grows; avoid migration merely for aesthetics. |
| Pact JS | FUTURE | Consumer contract testing only if independent services/clients multiply. |
| Schemathesis | FUTURE | API property testing after a formal public/internal OpenAPI surface exists. |
| Spectral | FUTURE | OpenAPI linting alongside a formal API contract. |

## Observability, uptime, feature flags, and metering

| Technology | Decision | Reason |
|---|---|---|
| OpenTelemetry | STAGING | Add trace context across API → Inngest → provider → persistence when it can complement rather than duplicate Sentry. |
| SigNoz | REJECT | Do not introduce a second primary observability stack while Sentry + targeted OTel are sufficient. |
| OpenStatus | STAGING | External uptime checks/status evidence if it can be run cheaply without duplicating hosting health. |
| OpenMeter | PROTOTYPE | Evaluate for usage/entitlement metering only after billing semantics are finalized; native cost ledger remains separate. |
| Lago | FUTURE | Billing/usage billing engine only if commercial requirements exceed a simpler payment provider + native entitlements. |
| OpenFeature | STAGING | Vendor-neutral flag API if controlled rollout becomes frequent. |
| Unleash | FUTURE | Flag backend only if native/environment flags become operationally insufficient. |

## APIs, integrations, authz, and workflow ecosystem

| Technology | Decision | Reason |
|---|---|---|
| MCP TypeScript SDK | STAGING | Appropriate for a governed Foremention MCP/API surface after customer use cases are defined. |
| Activepieces | REJECT | General automation platform adds broad execution/security surface; use explicit integrations/webhooks first. |
| Svix | FUTURE | Managed webhook delivery only if native signed webhook throughput/retry requirements outgrow current implementation. |
| Novu | REJECT | Notification orchestration is currently simple and already implemented; another platform is unnecessary. |
| Unkey | FUTURE | API-key management if/when a public API becomes real. |
| Scalar | FUTURE | API documentation UI once a public OpenAPI surface exists. |
| OpenAPI Generator | FUTURE | Generate SDKs only after API contract stabilizes. |
| OpenFGA | FUTURE | Consider if authorization relationships outgrow current organization roles + RLS. |
| Cerbos | REJECT | Do not add parallel authorization engines while Supabase RLS/native roles are sufficient. |
| SpiceDB | REJECT | Same reason: unnecessary second authorization datastore/control plane today. |
| OPA | FUTURE | Policy evaluation for infrastructure/enterprise governance only if concrete requirements emerge. |
| OPAL | REJECT | Avoid policy-distribution infrastructure before OPA itself is justified. |
| Retraced | FUTURE | Enterprise audit-log product only if customer-facing immutable audit requirements exceed native records. |

## Secrets, support, and internal operations

| Technology | Decision | Reason |
|---|---|---|
| Infisical | PROTOTYPE | Evaluate secret lifecycle/rotation ergonomics; current host secret stores remain authoritative until migration is justified. |
| OpenBao | FUTURE | Self-hosted secret manager is operationally heavy; only for enterprise/compliance need. |
| Chatwoot | FUTURE | Customer support platform when support volume justifies another operational system. |
| Metabase | STAGING | Read-only internal business/ops analytics on curated non-sensitive views; never expose raw cross-tenant evidence casually. |
| Renovate | IMPLEMENT | Automated dependency-update PRs with CI gates; do not auto-merge risky runtime changes. |

## Decision rules

1. **No duplicate control planes.** One database, one workflow system, one primary observability foundation, one customer evidence model.
2. **Comparable observations never silently route.** Provider/model/methodology changes are recorded methodology changes.
3. **Tenant boundaries travel with the data.** Search, snapshots, embeddings, opportunities, actions, notifications, integrations, exports, and archives require organization ownership and RLS/authorization tests.
4. **Production runtime dependencies earn their place.** A library must remove more risk/complexity than it creates.
5. **Prototype heavy infrastructure outside the critical path.** Crawl/browser/archive/gateway systems must prove a product need before they become production dependencies.
6. **The moat stays native.** Evidence Graph, Change Graph, Source X-Ray, methodology lineage, opportunity logic, action lineage, and longitudinal observations remain Foremention-owned models.
