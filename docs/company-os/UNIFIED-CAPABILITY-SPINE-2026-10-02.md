# Foremention Unified Company OS Capability Spine

Date: 2026-10-02

## Decision

Foremention remains the company kernel.

Do **not** merge multiple upstream repositories wholesale into one source tree.
Do **not** add another durable workflow orchestrator beside Inngest.
Do **not** let an external agent framework become authoritative for tenant scope,
customer truth, approvals, billing, security, evidence, or production changes.

The target is **one company operating system with replaceable capability modules**:

```text
Founder
  -> Foremention Constitution / Governor
  -> Foremention Agent OS
  -> Inngest (only durable orchestrator)
  -> AgentKit networks inside governed jobs
  -> capability adapters/services
  -> Foremention action proposal
  -> policy / approval
  -> executor
  -> receipt / evidence / audit
  -> measurement / learning
```

## Why not combine five repositories by copying their files?

That produces five different assumptions about:
- orchestration;
- persistence;
- identity;
- authorization;
- audit;
- retries;
- secrets;
- model configuration;
- dashboards;
- databases;
- deployment;
- tenant scope.

Copying entire repositories also imports demos, screenshots, docs sites, local dev
stacks, CI pipelines, package managers, example credentials, provider-specific
assumptions, and update debt that Foremention does not need.

Instead, each upstream project gets one of five treatments:

1. **Native** — Foremention owns the implementation and database truth.
2. **In-process package** — imported as a normal dependency behind a Foremention adapter.
3. **Sidecar service** — isolated process with a narrow authenticated API.
4. **CI tool** — runs only in build/evaluation pipelines.
5. **Reference/quarantine** — architecture or skills are studied, but code does not execute.

The canonical machine-readable decision is
`lib/company-os/capabilities.ts`.

## First implementation set

### 1. Inngest AgentKit — integrate in process

Keep:
- agents;
- networks;
- typed shared state;
- deterministic routing;
- MCP tool support;
- lifecycle hooks.

Drop:
- demo servers;
- example apps;
- duplicate deployment assumptions.

Foremention rule:
AgentKit is a collaboration library **inside Inngest jobs**. It does not own
scheduling, retries, customer scope, approvals, or action execution.

### 2. Agent Registry — adapt the schema, do not deploy the full control plane yet

Keep concepts:
- versioned Agents;
- Skills;
- Prompts;
- MCP servers;
- Models;
- provenance;
- status/promotion lifecycle;
- dependency metadata.

Do not initially import:
- Kubernetes controller;
- separate Postgres database;
- its web UI;
- deployment controller;
- CLI daemon.

Foremention will implement the minimal registry in Supabase so there is only one
authoritative company database during Stage 0.

### 3. AgentGate — adapt policy/approval semantics into Foremention

Keep concepts:
- auto-allow;
- auto-deny;
- require-human;
- approval expiry;
- actor/action audit;
- rate limits;
- notification hooks.

Do not deploy a second approval database/dashboard in Stage 0.

Foremention already has:
- action proposals;
- risk/effect classes;
- pending approval;
- execution receipts;
- audit logs;
- fail-closed execution.

The Founder Decision Room should extend those primitives.

### 4. Infisical Agent Vault — separate security sidecar

Keep as an isolated service because credential isolation is a security boundary,
not merely a convenience abstraction.

Agents get proxy access or temporary scoped tokens. Raw credentials never enter:
- prompts;
- Supabase company memory;
- agent histories;
- logs;
- GitHub;
- support tickets;
- model traces.

### 5. LiteLLM — separate company-agent model gateway

Use for:
- model aliases;
- fallback;
- quota routing;
- budget routing;
- provider health;
- company-agent model selection.

Do **not** route Foremention Recommendation Record measurement through this
abstraction when exact provider/model provenance would be obscured. The existing
Foremention provider adapters remain canonical for product measurement.

### 6. Graphiti — derived temporal memory

Supabase remains authoritative.
Graphiti may store derived temporal relationships and historical context.

It may never override:
- customer ownership;
- organization/project scope;
- billing;
- permissions;
- approval status;
- evidence truth;
- financial truth.

### 7. OpenHands Software Agent SDK — isolated engineering worker

Use only from disposable/ephemeral workspaces.

Allowed:
- inspect repo;
- plan;
- edit branch;
- run tests;
- produce patch;
- open PR.

Not allowed without higher authority:
- merge;
- production deploy;
- secret mutation;
- destructive database work;
- policy weakening;
- branch-protection changes.

### 8. Stagehand — browser execution tool

Use AI for unknown UI states.
Cache or convert stable flows into deterministic steps.

Every browser run needs:
- domain allowlist;
- SSRF/network restrictions;
- credential broker;
- idempotency where possible;
- action receipt;
- policy classification;
- rollback/containment plan for consequential actions.

### 9. Acontext — borrow skill-learning design first

Do not add another Postgres/S3/Redis/RabbitMQ stack during Stage 0.

Adopt the principle:
successful and failed runs can produce inspectable proposed skills, but learned
skills enter quarantine and require tests/evals/security/provenance before
promotion.

### 10. Promptfoo + agent security scanning — CI only

Use evaluation/security tools to test:
- prompt injection;
- tool misuse;
- secret exfiltration;
- unsafe external actions;
- tenant crossover;
- malicious documents/web pages;
- model/provider drift;
- cost explosions;
- approval bypass.

## Target Foremention tree

```text
lib/company-os/
  capabilities.ts
  constitution/
  objectives/
  strategy/
  registry/
    agents/
    skills/
    tools/
    mcp/
    prompts/
    models/
  governor/
    policy/
    risk/
    approvals/
    budgets/
    kill-switches/
  orchestration/
    networks/
    routing/
    tasks/
    events/
  memory/
    truth/
    temporal/
    procedural/
  intelligence/
  engineering/
  customer/
  revenue/
  capital/
  distribution/
  finance/
  security/
  evolution/
  adapters/
    agentkit/
    agent-vault/
    litellm/
    graphiti/
    openhands/
    stagehand/

lib/jobs/company-os/
app/app/company-os/
app/api/company-os/
supabase/migrations/*company_os*
tests/company-os-*.test.mjs
```

## Promotion path for every imported capability

```text
DISCOVERED
  -> LICENSE_REVIEW
  -> SECURITY_REVIEW
  -> QUARANTINED
  -> SANDBOX
  -> EVALUATED
  -> SHADOW
  -> DRAFT
  -> BOUNDED
  -> APPROVED
  -> PRODUCTION
  -> DEMOTED / DEPRECATED / RETIRED
```

External code never jumps directly from GitHub discovery to production.

## Stage-0 boundary

This spine is intentionally inert.

It must not:
- broaden autonomous outreach;
- send messages;
- create paid spend;
- submit applications;
- deploy production;
- mutate secrets;
- change customer data;
- weaken tenant isolation;
- fabricate traction.

The current company bottleneck remains customer proof. The OS may be built behind
flags and in shadow mode while customer proof continues.

## Next implementation order

1. Native capability registry + provenance schema.
2. Extend policy/approval schema into Founder Decision Room.
3. AgentKit adapter for deterministic department networks.
4. Credential broker adapter.
5. Company-agent model gateway adapter.
6. Engineering worker adapter.
7. Browser worker adapter.
8. Temporal/procedural memory.
9. Capital and distribution workflows.
10. Evaluation-driven autonomy promotion.

No external runtime is enabled merely because its adapter exists.
