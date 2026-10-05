# Foremention Company OS — Capability Integration Register

Date: 2026-10-05  
Authority: Enterprise Company Automation OS blueprint, sections 18–23

## Decision

This register supersedes the conflicting integration preferences in the 2026-10-02 capability-spine document while preserving its core safety principle: **one Foremention kernel, one durable orchestrator, one authoritative company database, and replaceable capability modules**.

The current authoritative runtime boundaries are:

- Foremention native Governor, task/action contracts, evidence and receipts remain authoritative.
- Supabase/Postgres remains company/product operational truth with explicit scope and RLS.
- Inngest remains the durable workflow runtime.
- Public/customer application and internal Company OS remain isolated surfaces in the same repository where useful.
- External code never receives authority merely because it appears in this registry.
- Every source import requires the exact revision/package, path-level license/notices, dependency review, data-access review, tests, owner, upgrade plan and exit procedure.

## Current first wave

| Capability | Source | Treatment | Current state |
|---|---|---|---|
| Lifecycle/recovery patterns | `paperclipai/paperclip` | Adapt leases, heartbeats, attention queues and budget patterns into native contracts | Reference only |
| Internal model gateway | `Portkey-AI/gateway` | Selected sidecar/adapter for company-agent routing and fallback | Disabled pending adapter/evidence |
| AI evaluations | `promptfoo/promptfoo` | CI-only deterministic/adversarial evaluation | Existing pinned CI use; extend per workflow |
| AI browser interaction | `browserbase/stagehand` | Isolated Node/Chromium worker | Disabled |
| Deterministic browser verification | `microsoft/playwright` | Explicit browser-worker package | Disabled |
| Research crawling | `apify/crawlee` | Bounded research worker when native inspection is insufficient | Disabled |
| SaaS connectors | `activepieces/activepieces` | Selected connectors/sidecar only as needed | Disabled |
| MCP fleet routing | `microsoft/mcp-gateway` | Later, only when fleet/Kubernetes lifecycle warrants it | Deferred |

## Selected supporting systems

- **Langfuse** is the selected AI trace/evaluation diagnostic backend when a real deployment is justified. It does not replace Sentry, PostHog, business receipts or the native cost ledger.
- **OpenFGA**, **OpenMeter** and **Graphiti** remain later responses to measured authorization, metering or temporal-memory requirements.
- **Infisical Agent Vault** remains a credential-broker candidate, not a selected production dependency, until exact deployment/maintenance/license fit is validated.
- **OpenHands Software Agent SDK** remains an isolated engineering-worker option when current worker coverage is insufficient.
- **Cosign** and **in-toto** extend supply-chain evidence only where the existing release process has a concrete gap.
- **Docling** is a document-worker option; documents remain untrusted input with page/source provenance.
- **xyflow** is the selected operational/evidence graph UI layer; the graph is a view, not an authorization database.
- **React Three Fiber**, **Three.js** and **Motion** are optional public-site presentation dependencies and must preserve accessibility/performance fallbacks.

## Capital OS source material

`candur-ai/candur`, `GrantKit/grantkit` and `ddanntheman/GrantForge` are procedure/checker pattern sources only. They do not establish current eligibility, acceptance probability, submission authority or factual company claims. Official current program sources and verified Company Truth remain authoritative.

## Superseded choices

The 2 October spine selected LiteLLM as the active gateway preference and placed AgentKit in the first implementation path. The 5 October blueprint supersedes those choices:

- **Portkey** occupies the current internal model-gateway slot.
- **LiteLLM** is quarantined as an alternative, avoiding two overlapping gateways.
- **AgentKit** is deferred until a measured coordination gap exists; native Inngest/task contracts are sufficient for the current wave.
- **Langfuse** occupies the current AI-observability slot; equivalent tracing stacks remain alternatives rather than simultaneous control planes.

## Admission checklist

No external capability may move from registry entry to runtime until all of these are recorded:

1. exact repository/package revision and imported paths;
2. license, notices and enterprise/commercial directory boundary;
3. transitive dependencies and supply-chain review;
4. network/data access and information classification;
5. adapter contract and native organization/project binding;
6. credential path and revocation behavior;
7. budget/concurrency/timeout limits;
8. failure, retry, reconciliation and duplicate-effect behavior;
9. deterministic and adversarial acceptance tests;
10. upgrade owner, rollback/exit procedure and kill-switch behavior.

The machine-readable register is `lib/company-os/capabilities.ts`.
