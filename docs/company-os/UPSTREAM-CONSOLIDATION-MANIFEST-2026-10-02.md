# Foremention Company OS — Upstream Consolidation Manifest

Date: 2026-10-02

## Goal

Build one Foremention Autonomous Enterprise OS without turning the repository into a
dump of copied upstream projects.

The unification rule is:

> One Foremention kernel, one durable orchestrator, one authoritative company database,
> one action/approval/audit boundary, and replaceable capability modules around it.

The user experience may feel like one company brain. Internally it must remain modular
so a failed browser worker, model provider, research engine, coding agent, or third-party
project cannot take the whole company down.

## Canonical systems that are NOT replaced

- Foremention product/evidence model
- Supabase organization/project truth and RLS
- Foremention action proposal and execution-receipt model
- Inngest durable orchestration
- Recommendation measurement provider adapters
- Foremention evaluation/release gates
- Foremention Customer Hunter service boundary
- existing production security/reliability controls

## Source handling rules

### Never wholesale-merge an upstream repository

Do not copy:
- screenshots and marketing assets;
- demo apps;
- upstream dashboards that duplicate Foremention;
- upstream CI/CD;
- deployment manifests for infrastructure Foremention does not use;
- example credentials;
- sample databases;
- benchmark datasets that are not needed;
- docs sites;
- package-manager scaffolding;
- unrelated providers;
- generated lockfiles;
- issue templates;
- contributor automation;
- enterprise-only code;
- AGPL/source-available code into the customer-facing product without explicit legal review.

Prefer one of:
1. normal package dependency;
2. separately deployed sidecar;
3. small clean adaptation of concepts into Foremention-native code;
4. CI-only scanner/evaluator;
5. reference-only playbook.

## Exact KEEP / ADAPT / DROP map

### A. injamhaqq/foremention — KEEP AS KERNEL

KEEP:
- `lib/agent-os/*`
- `lib/agent-control-plane.ts`
- `lib/jobs/*`
- `lib/providers/*` for Recommendation measurement
- `lib/evaluation/*`
- tenant/RLS/auth/security primitives
- cost controls and FinOps
- customer-success/support/acquisition boundaries
- audit/action execution receipts
- PostHog/Sentry integration
- all existing regression/security tests

ADAPT:
- progressively expose current Agent OS through `lib/company-os/*`
- replace hard-coded agent lists with registry-backed definitions while keeping compatibility
- evolve static policy into policy + budget + data-class + reversibility + approval rules
- add objective/task/decision/assumption registries

DROP:
- nothing from the kernel merely to make space for an upstream framework.

### B. injamhaqq/foremention-outreach — KEEP AS SEPARATE INTERNAL SERVICE

KEEP:
- Customer Hunter
- qualification/research
- mini-audit bridge
- reply routing
- bounce/suppression controls
- sender/channel health
- cost accounting
- canary/readiness logic
- discovery adapters

DO NOT COPY INTO MAIN:
- Linki UI
- Linki auth
- LinkedIn browser/session automation
- SQLite runtime
- campaign UI
- generic Linki runner implementation

WHY:
The repository inherits the Linki Sustainable Use License. It permits internal business
use but prohibits offering the software as a hosted/managed service to third parties.

INTEGRATION:
`foremention-outreach -> signed API/events -> Foremention Company OS`

### C. inngest/agent-kit — PACKAGE DEPENDENCY, NO SOURCE COPY

KEEP THROUGH PACKAGE API:
- `createAgent`
- `createNetwork`
- typed state
- tools
- lifecycle hooks
- deterministic routing
- MCP integration

DO NOT COPY:
- examples
- demo server
- docs site
- provider demos
- separate Express server

COMPATIBILITY:
Current AgentKit package declares `inngest >=3.43.1`; Foremention currently uses
Inngest 4.x, so the declared peer range is compatible. Add and verify its Zod peer
dependency before enabling.

RULE:
AgentKit is collaboration logic inside an Inngest function, never a second scheduler.

### D. agentkitai/agentgate — ADAPT SELECTED PRIMITIVES, NOT FULL SERVER

USE AS REFERENCE / SELECTIVE MIT ADAPTATION:
- `packages/core/src/policy-engine.ts`
- policy types/events
- scoped decision tokens
- agent budget patterns
- RBAC patterns
- rate-limit patterns
- URL validation / SSRF guard patterns
- webhook/notification escalation semantics
- policy simulator ideas

DO NOT IMPORT:
- separate Postgres/SQLite approval database
- separate dashboard
- CLI
- Slack/Discord bot packages initially
- AgentGate API-key authority as a second identity system

FOREMENTION DESTINATION:
- `lib/company-os/governor/policy/`
- `lib/company-os/governor/approvals/`
- `lib/company-os/governor/budgets/`

### E. agentregistry-dev/agentregistry — ADAPT DATA MODEL, NOT PLATFORM

ADAPT:
- artifact identity/version
- provenance
- dependency metadata
- lifecycle/promotion states
- agents/skills/prompts/MCP metadata
- evaluation signals
- supply-chain visibility

DO NOT DEPLOY IN STAGE 0:
- Go API server
- separate Postgres
- Kubernetes deployment controller
- registry web UI
- CLI daemon

FOREMENTION DESTINATION:
Supabase tables + `lib/company-os/registry/*`.

### F. Infisical/agent-vault — DEPLOY AS SECURITY SIDECAR

KEEP UPSTREAM SERVICE ISOLATED.
Do not paste its code into the web app.

FOREMENTION WRITES ONLY:
- typed adapter
- task identity
- credential request
- policy context
- short-lived proxy/session handling
- audit correlation IDs

NEVER:
- expose vault master credentials to an LLM;
- store raw secrets in Supabase company memory;
- emit raw secrets to Opik/PostHog/Sentry/GitHub.

### G. BerriAI/litellm — DEPLOY AS MODEL-GATEWAY SIDECAR

KEEP:
- upstream proxy
- routing/fallback/budget/health capabilities
- upstream provider integrations

DO NOT COPY:
- provider implementations
- management UI
- tests
- enterprise directory
- source tree

FOREMENTION WRITES:
- model aliases
- company-task routing policy
- budget metadata
- privacy classification
- fallback rules
- trace correlation adapter

CRITICAL:
Recommendation Record measurement continues through Foremention native adapters.

### H. agentgateway/agentgateway — QUARANTINE

Do not add yet.

Reason:
It overlaps with AgentKit tool routing + LiteLLM gateway + Foremention policy. Reconsider
only when MCP/A2A traffic volume and cross-service governance create a measured need.

### I. getzep/graphiti — DEFER AS TEMPORAL-MEMORY SIDECAR

Do not install on Day 1.

Reason:
Graphiti is Python and current releases require a graph backend such as Neo4j/FalkorDB.
Foremention already has Supabase truth and does not yet need another database to prove
customer value.

If activated:
- Graphiti contains derived relationship/time context only.
- Supabase always wins conflicts.

### J. OpenHands/software-agent-sdk — ISOLATED ENGINEERING SERVICE

KEEP THROUGH SDK/service boundary:
- agent runtime
- tools/workspaces
- isolated code execution
- patch/test workflows

DO NOT COPY:
- entire Python workspace
- agent server source
- examples
- test infrastructure

FOREMENTION CONTROL:
issue/RFC -> engineering task -> disposable workspace -> patch -> tests -> PR -> review.

Never grant autonomous merge/deploy/secret/database authority initially.

### K. browserbase/stagehand — DEDICATED BROWSER WORKER

Do not run inside the Cloudflare web app.

Reasons:
- browser automation needs Chromium/runtime resources;
- Stagehand current workspace targets Node >=22.18;
- Foremention web runtime has different deployment constraints.

Deploy a separate worker/container and expose a narrow signed API.

Keep:
- act/extract/observe style browser actions
- cached/deterministic follow-up flows

Foremention owns:
- domain allowlists
- credential request
- action classification
- approval
- idempotency
- receipts

### L. memodb-io/Acontext — ADAPT SKILL-LEARNING DESIGN FIRST

Do not deploy its full stack on Day 1.

Its current architecture adds:
- Postgres
- S3
- Redis
- RabbitMQ
- Python core
- sandbox infrastructure

ADAPT:
- successful run -> proposed skill
- failure -> revised skill proposal
- explicit skill files
- skill versioning
- skill evaluation
- promotion/demotion

FOREMENTION IMPLEMENTATION:
Git/Supabase lightweight skill registry first.

### M. SkillMD + Snyk Agent Scan — CI SUPPLY-CHAIN GATE

Use before any external skill/MCP/agent is promoted.

Pipeline:
DISCOVER -> LICENSE -> STATIC SCAN -> SECRET SCAN -> PROMPT-INJECTION REVIEW ->
NETWORK/FILESYSTEM REVIEW -> SANDBOX -> EVAL -> APPROVAL -> REGISTRY.

Neither scanner alone establishes trust.

### N. comet-ml/opik — EVAL/TRACE ADAPTER, NOT COMPANY TRUTH

Initial mode:
- send safe, redacted agent traces
- datasets/experiments
- model/prompt comparisons
- CI evals

Do not duplicate:
- PostHog product analytics
- Sentry application errors
- Foremention evidence truth

Never export unrestricted customer-confidential payloads or secrets.

### O. docling-project/docling — DOCUMENT WORKER

Deploy later as Python sidecar for:
- application PDFs
- pitch/deck documents
- contracts
- spreadsheets
- program rules
- diligence documents

Treat extracted text as untrusted evidence/data.

### P. assafelovic/gpt-researcher / DeerFlow-style research workers

Use as bounded research workers, not executives.

Output:
- question
- sources
- dated evidence
- contradictions
- confidence
- unresolved gaps

Foremention then verifies and decides.

Research workers may never directly:
- send outreach;
- submit applications;
- spend money;
- publish claims;
- modify production.

### Q. rojenwai/CompanyOS + small autonomous-company repos

USE:
- department maps
- SOPs
- role descriptions
- meeting/review cadences
- checklists
- playbooks
- prompt patterns

DO NOT USE AS RUNTIME:
Their maturity and production controls are far below Foremention's existing kernel and
the specialist infrastructure above.

Convert useful material into Foremention-owned skills.

### R. lalalune/outreachr — CAPITAL OS PATTERNS

Adapt:
- investor research
- fit scoring
- warm-intro paths
- outreach approval
- meeting notes
- diligence checklist
- investor CRM stages

Do not add a second authoritative company CRM.

### S. 1984vc/cap-table — DETERMINISTIC FINANCE PATTERNS

Adapt deterministic calculations for:
- SAFE conversion scenarios
- option-pool scenarios
- priced-round dilution
- founder ownership scenarios

Do not allow an LLM to be the arithmetic authority.
Do not treat simulations as legal cap-table records.

## Unified target tree

```text
lib/company-os/
  capabilities.ts
  kernel/
    constitution.ts
    objectives.ts
    tasks.ts
    decisions.ts
    assumptions.ts
    evidence.ts
    audit.ts
  registry/
    agents.ts
    skills.ts
    tools.ts
    prompts.ts
    models.ts
    mcp.ts
    provenance.ts
  governor/
    policy.ts
    risk.ts
    approvals.ts
    budgets.ts
    data-classes.ts
    kill-switches.ts
  orchestration/
    network.ts
    router.ts
    context.ts
    events.ts
    executor.ts
  departments/
    chief-of-staff.ts
    product.ts
    engineering.ts
    revenue.ts
    customer.ts
    capital.ts
    distribution.ts
    intelligence.ts
    finance.ts
    security.ts
    evolution.ts
  memory/
    truth.ts
    temporal-adapter.ts
    procedural.ts
  adapters/
    agentkit.ts
    outreach.ts
    agent-vault.ts
    litellm.ts
    openhands.ts
    stagehand.ts
    opik.ts
    research.ts
    documents.ts
  skills/
    ...
lib/jobs/company-os/
app/api/company-os/
app/app/company-os/
tests/company-os-*.test.mjs
```

## Five process boundaries

The final system should normally run as five logical deployment boundaries, not one
giant process:

1. **Foremention web/kernel** — Cloudflare/Vinext + Supabase.
2. **Durable orchestration** — Inngest functions.
3. **Company model gateway** — LiteLLM sidecar when enabled.
4. **Privileged workers** — browser/coding/document/research containers.
5. **Credential broker** — isolated Agent Vault/secrets plane.

`foremention-outreach` remains a sixth pre-existing internal revenue service until a
future clean-room replacement is justified.

## One-brain user experience

Externally:

```text
Founder -> Chief of Staff -> Company
```

Internally:

```text
Chief of Staff
  -> deterministic router
  -> specialist network/skill
  -> policy
  -> tool/service
  -> receipt
  -> eval
  -> memory
```

This preserves the feeling of one brain without creating one unbounded agent with every
credential and every capability.

## Deletion rule

Do not delete existing Foremention files merely because a new module exists.

A legacy file may be removed only when:
1. all callers have migrated;
2. exact-behavior tests cover the replacement;
3. tenant/security/evidence semantics are preserved;
4. rollback is available;
5. the replacement has passed shadow/bounded operation;
6. no open hardening branch depends on the old contract.

## Immediate implementation sequence after this inert spine

1. Supabase-native registry schema.
2. Objective/task/decision/assumption schemas.
3. Extend action policy to budget/data/reversibility classes.
4. Founder Decision Room API/UI.
5. AgentKit adapter behind a feature flag.
6. Chief-of-Staff deterministic network in shadow mode.
7. Outreach signed-event adapter.
8. Model-gateway adapter, still disabled.
9. Credential-broker adapter, still disabled.
10. Engineering/browser worker contracts, still disabled.
11. Capital/Resource/Distribution skills.
12. Eval-driven promotion from SHADOW -> BOUNDED -> AUTO.

No consequential automation becomes active merely because its code exists.
