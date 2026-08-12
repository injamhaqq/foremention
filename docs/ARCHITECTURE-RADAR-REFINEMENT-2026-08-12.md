# Foremention Architecture Radar Refinement — 2026-08-12

This ADR refines three entries from `docs/ARCHITECTURE-DECISION-MATRIX-2026-08-12.md`. It does **not** authorize production installation. The canonical rule remains: adopt infrastructure only after a concrete Foremention problem, security review, current license/maintenance check, staging proof, and rollback plan.

## Decision changes

| Technology | Previous decision | Refined decision | Why |
|---|---|---|---|
| Firecrawl | REJECT | BENCHMARK ONLY | Keep Crawl4AI + native safe-fetch/Readability as the primary direction, but retain Firecrawl as a controlled benchmark for difficult extraction/crawl cases. Promote only if it demonstrates a material product-quality or reliability advantage that justifies an additional external data boundary and cost. |
| Activepieces | REJECT | FUTURE / STRATEGIC | Do not embed a general automation runtime into the core product now. Re-evaluate when customer demand for Slack/CRM/ops integrations outgrows explicit Foremention connectors, signed webhooks, and MCP. Any future use must be tenant-scoped, auditable, revocable, least-privilege, and isolated from evidence integrity. |
| Novu | REJECT | FUTURE | Resend + native in-app alerts remain sufficient now. Re-evaluate when Foremention needs real multi-channel orchestration such as in-app + email + Slack/chat, notification preferences, batching/digests, delivery-state management, and per-customer routing. Do not add merely for UI polish. |

## Production decision today

None of these three technologies should be added to the production runtime in the current release.

The next engineering priority remains:

1. publish the current verified `main` release atomically to the existing production deployment;
2. verify exact production provenance and authenticated customer flows;
3. only then continue the highest-value P2 intelligence work, beginning with native Source Snapshot/Change Graph improvements, Postgres/pgvector semantic retrieval when justified, and a native SearchRouter with provider adapters.

## Guardrails

- No duplicate control planes.
- No new dependency without a demonstrated problem and benchmark.
- No external service may become the source of truth for Foremention evidence lineage.
- Search-engine results, AI observations, and browser-surface observations remain different evidence types.
- Exact provider/model/methodology provenance remains mandatory.
- New integrations must preserve Supabase RLS and tenant ownership.
- New notification infrastructure must never receive secrets or unnecessary raw customer evidence.
