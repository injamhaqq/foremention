# 08 — Scale, Reliability and Unit Economics

Status: implementation + operating specification

Base audited: `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`

Build branch: `build/billion-dollar-08-scale-economics`

## 1. Truth model

Every statement in this document is one of four types:

- **Current fact** — enforced or directly observable in the repository.
- **Measured result** — produced by a repeatable test or production measurement. None is invented here.
- **Experiment** — a test that must be run before a capacity or economics claim is made.
- **Future target** — an operating objective, not a customer SLA or a measured result.

Revenue, gross margin, vendor invoice amounts, Cloudflare account limits, Supabase plan limits, Inngest account limits, restore-point retention and production restore times are **not** inferred from source code. They remain unknown until verified from the relevant commercial account or an executed drill.

## 2. Current capacity boundaries

### 2.1 Live collection admission

**Current fact**

- A run accepts 1–10 selected prompts.
- A live run accepts exactly one provider.
- The default entitlement allows at most 10 prompts per run, one provider per run and one concurrent active run per organization.
- Run creation uses an organization-scoped idempotency key and an active-request fingerprint to stop duplicate equivalent runs.
- Monthly provider-prompt units and a monthly AI-spend ceiling are reserved before queueing.
- Failed queue admission releases reserved capacity.

Relevant implementation:

- `app/api/runs/route.ts`
- `lib/collection-policy.ts`
- `supabase/migrations/20260724000100_free_beta_usage_controls.sql`
- `supabase/migrations/20260728000100_live_collection_hardening.sql`
- `supabase/migrations/20260802000100_active_run_duplicate_prevention.sql`

### 2.2 Background execution

**Current fact**

`run-multi-engine-scan` has:

- event idempotency keyed by `runId`;
- global Inngest concurrency limit: 4;
- per-organization Inngest concurrency limit: 1;
- start timeout: 5 minutes;
- finish timeout: 10 minutes;
- provider attempt timeout: 45 seconds;
- function retries: 2;
- cancellation through `foremention/run.cancelled`;
- a provider circuit that opens after failures from three distinct recent runs in the configured 15-minute window.

These are **configured boundaries**, not evidence that four workspaces have been load-tested successfully at all prompt sizes.

At the maximum 10 prompts, ten provider calls each consuming the full 45-second attempt timeout represent 450 seconds (7.5 minutes) of provider wait time in one pass before orchestration and database overhead. The function finish timeout is 10 minutes. This arithmetic exposes a narrow worst-case headroom; it is **not** a latency benchmark. Queue and failure tests must cover this boundary before increasing prompt count, provider count or timeout values.

Relevant implementation:

- `lib/jobs/inngest.ts`
- `lib/collection-policy.ts`

### 2.3 Scheduled measurements

**Current fact**

- The measurement dispatcher runs hourly at minute 17.
- It selects at most 100 due schedules per dispatch.
- It prepares those schedules serially.
- Although the database can represent more provider IDs on a schedule, the dispatcher currently requires exactly one live provider to prepare a run.
- It rechecks active runs, monthly units and monthly AI spend before creating the scheduled run.

This means “100 due schedules per hour” is an input scan ceiling, **not** a proven throughput of 100 completed measurements per hour.

Relevant implementation: `lib/jobs/measurement-schedule-dispatcher.ts`.

## 3. Provider cost controls

### 3.1 Current controls

**Current fact**

The collection path currently includes:

- provider-specific token/request rates supplied through environment configuration;
- a conservative maximum-cost reservation before queueing;
- a workspace monthly AI-spend ceiling;
- a workspace monthly provider-prompt quota;
- a per-run application ceiling through `FOREMENTION_MAX_RUN_COST_USD`;
- Groq-specific run and monthly ceilings;
- mandatory Groq browser search, preserving evidence quality rather than choosing a cheaper non-search answer path;
- exact-one-provider live runs;
- provider timeout;
- retries managed by Inngest;
- provider circuit breaking;
- duplicate-run prevention;
- cancellation;
- recorded attempt usage/cost facts.

### 3.2 Groq reservation correction in this branch

Before this branch, `GROQ_SPEND_LIMITS.maxRunCostUsd` served two semantic jobs: a per-prompt reservation estimate and a whole-run hard ceiling. The defaults were both `$0.10`, so raising one later could silently raise the other.

This branch separates:

- `reservedCostPerPromptUsd` — conservative reservation for one Groq browser-search prompt;
- `maxRunCostUsd` — whole-run hard ceiling.

The current defaults remain `$0.10` and `$0.10`. **This branch does not increase default Groq spend.** It makes future changes reviewable and prevents the two controls from drifting together by accident.

### 3.3 Caching and batching

**Current decision**

No answer-level cache is added by this build. Recommendation evidence is time-sensitive, provider/model-sensitive and methodology-sensitive. Reusing an old provider answer merely to reduce cost could invalidate observation time and comparability.

A future cache is acceptable only for data that is explicitly safe to reuse, for example static configuration or immutable normalized metadata. Provider answers, citations and observation-bearing evidence require explicit product semantics for freshness before caching.

No multi-question batching is introduced. Batching can change answer behavior, evidence provenance, latency isolation and per-question cost attribution. It must be validated as a measurement-methodology change rather than a generic optimization.

## 4. Unit economics instrumentation

### 4.1 AI provider cost truth

**Current fact**

`ai_cost_events` is the durable provider-cost event stream. It records:

- organization;
- run;
- linked run attempt;
- provider and model;
- token usage when available;
- recorded cost;
- whether cost is estimated or provider-reported;
- observation timestamp.

`runs.actual_cost_usd` provides run-level recorded provider spend.

A cost-event guard suppresses tokenless estimated failed/rate-limited attempts so an unbilled retry reservation does not automatically inflate recorded actual spend. If a future provider reports a real billed failed attempt, that fact can still be represented.

### 4.2 Service-only operational fact view

This branch adds `provider_attempt_operational_facts`.

It contains only operational dimensions required for SRE/FinOps:

- organization/project/run/prompt IDs;
- provider/model;
- attempt number/status/retryability;
- attempt latency and timestamps;
- retry/failure flags;
- recorded provider cost and source;
- run status/counts/cost;
- package key;
- billing state.

It deliberately excludes prompt text, answer text, citations, evidence payloads, raw provider response, free-form provider errors, email and contact data. Browser roles receive no access; the view is service-role only.

### 4.3 Verified infrastructure COGS ledger

This branch adds the service-only `infrastructure_cost_allocations` table for real non-AI COGS inputs:

- edge;
- database;
- storage;
- background processing;
- observability;
- egress;
- other COGS.

Each row requires:

- a real period;
- vendor;
- non-negative USD amount;
- allocation method (`direct_meter`, `provider_invoice`, or `allocated`);
- SHA-256-like source reference hash.

The source invoice or customer content is not stored in the table. `organization_id` may be null for verified shared platform cost that has not yet been allocated.

**Rule:** do not insert a cost because a public pricing page says it “should” cost that amount. Insert only a meter/invoice-backed amount attributable to the measured period.

### 4.4 Truth-safe economics calculator

This branch adds `lib/finops/unit-economics.ts`.

It can calculate:

- known COGS;
- complete COGS only when every required bucket is supplied;
- provider cost/run;
- provider cost/question;
- provider cost/Recommendation Record;
- provider cost/workspace;
- provider cost/account;
- fully allocated equivalents when complete COGS exists;
- retry cost and retry share of provider spend;
- gross profit and gross margin only when verified revenue and complete COGS are supplied.

Retry cost is a diagnostic **subset** of provider cost and is never added again to COGS.

A Recommendation Record is run-backed in the current product. For unit-economics reporting, use the distinct run/Record denominator actually represented in the reporting period; do not synthesize a separate Record count.

### 4.5 Gross margin rule

Use:

`gross margin % = (verified revenue - complete COGS) / verified revenue × 100`

The result is `null`/unknown when:

- revenue is missing or zero;
- any COGS bucket is missing;
- the period alignment is incomplete.

Billing state/package metadata does not equal recognized revenue. This build does not infer MRR, ARR, ACV or revenue from package names.

### 4.6 Cost/tier reporting

`organization_entitlements.package_key` currently distinguishes `private_beta`, `core`, `signal`, `intelligence` and `custom`. The operational fact view exposes that key, allowing real cost to be grouped by package without assuming the package price.

Cost/account can be grouped by the organization-level billing account. Revenue/account remains unavailable until a verified financial amount source is integrated.

## 5. SRE: SLIs, proposed SLOs and error budgets

The following are **future targets**, not measured results and not contractual SLAs.

| Surface | SLI | Proposed internal SLO | Primary evidence |
| --- | --- | --- | --- |
| Web/API availability | eligible successful requests / eligible requests | 99.9% monthly | edge/server telemetry + health probe |
| Queue admission | queued runs that start before the 5m start timeout | 99.5% monthly | run timestamps + Inngest events |
| Run terminalization | started runs that reach `review`, `complete`, `partial`, `failed` or `cancelled` without becoming orphaned | 99.5% monthly | `runs` |
| Provider reliability | successful provider attempts / eligible provider attempts, by provider/model | establish baseline first; target only after baseline | operational fact view |
| Provider latency | p50/p95/p99 attempt latency by provider/model | establish baseline first | operational fact view |
| Scheduled dispatch | due schedules either safely queued or explicitly skipped by a guard | 99.9% accounting completeness | dispatcher + run/schedule state |
| Webhook delivery | deliveries reaching delivered/failed terminal state without silent loss | 99.9% accounting completeness | webhook delivery table |
| Cost accounting | recorded provider cost linked to a valid attempt/run when cost exists | 100% relational integrity | `ai_cost_events` + run attempts |
| Runtime release proof | requested exact build probe executes | 100% for release gate | runtime service probes |

### Error budgets

For percentage SLOs, monthly error budget is `1 - SLO` over eligible events/time. Do not mix expected provider/business rejection with platform failure. Examples that require separate labels:

- quota/spend ceiling reached — product guard, not platform downtime;
- circuit open — controlled degradation;
- provider 429/5xx — provider dependency failure;
- malformed user request — client error;
- tenant authorization denial — security behavior;
- queue event not accepted or orphaned run — platform reliability defect.

Do not establish an external SLA until at least one full observation period has reliable SLI collection and incident accounting.

## 6. Alerting and incident response

### 6.1 Current facts

The repository already contains:

- allow-listed structured operational logging;
- correlation IDs on request paths that adopt `correlationIdFor`;
- run ID/provider/attempt/error-code safe logging;
- Sentry dependencies;
- service-only runtime release probes;
- service-only operator alert delivery evidence;
- customer/workspace webhook delivery state;
- exact-build production browser acceptance.

`structured-logger.ts` explicitly rejects arbitrary fields by allow-list. Prompt, answer, email, IP, URL query, token and secret values are not approved operational log fields.

### 6.2 Missing operational work

**Current gap**

A generalized incident alert router with queue-age, stuck-run, cost-anomaly and SLO-burn alerts is not proven by this repository audit. The existing operator alert table should be extended rather than creating a second unrelated alert system.

### 6.3 Proposed severity model

**Future target**

- **SEV-1:** tenant isolation breach, evidence corruption, secret/PII telemetry leak, destructive data-loss event.
- **SEV-2:** production unavailable, queue cannot execute, widespread run orphaning, spend guard bypass, verified provider cost double-counting.
- **SEV-3:** single-provider degradation, rising retry share, scheduled backlog, webhook delivery degradation, material performance regression.
- **SEV-4:** localized non-critical defect with safe workaround.

Escalation should be based on impact and data integrity, not customer tier.

### 6.4 Incident workflow

1. Declare incident and severity.
2. Stop unsafe writes/provider execution if integrity or spend is at risk.
3. Preserve run IDs, request/correlation IDs, build SHA and sanitized operational evidence.
4. Establish whether impact is application, Cloudflare, Supabase, Inngest, provider or integration specific.
5. Mitigate using cancellation, circuit, entitlement pause, provider disablement or exact-SHA rollback as appropriate.
6. Verify tenant isolation and evidence integrity before reopening traffic/work.
7. Record recovery evidence.
8. Write postmortem; do not delete failed-attempt evidence merely to improve metrics.

### 6.5 Postmortem template

- Incident ID / date / severity
- Detection source
- User-visible impact
- Affected organizations (IDs only in operational document)
- Start / mitigation / recovery times
- Build SHA(s)
- SLI/error-budget impact
- Provider/queue/database/edge evidence
- Cost impact from recorded facts
- Root cause
- Contributing factors
- What worked
- What failed
- Corrective actions with owners and due dates
- Test added to prevent recurrence
- Data-integrity and tenant-isolation verification

## 7. Observability contract

### Allowed operational dimensions

Prefer:

- correlation ID;
- run ID;
- organization/workspace ID only in access-controlled operational stores;
- project ID where required;
- route/method/status;
- provider/model;
- attempt number;
- sanitized error code;
- latency/duration;
- queue/run timestamps;
- package key/billing state in service-only FinOps views;
- cost amounts from real meters/events.

### Prohibited telemetry payloads

Do not log or export to general telemetry:

- prompt/question text;
- answer text;
- citation text;
- evidence content;
- raw provider responses;
- raw emails/contact details;
- access tokens/secrets;
- full URL query strings;
- free-form provider errors that may echo customer input.

### Trace shape

**Future target**

Use correlation/run IDs to join spans without copying evidence:

`request admission → quota reservation → budget reservation → queue event → run start → provider attempt(s) → persistence → source-map generation → notification/webhook → terminal run`

Each segment should record duration and a controlled outcome code. Database timing should be measured around named operations, not by logging SQL parameter contents.

## 8. Scale and chaos test matrix

No row below is a capacity claim until executed against a named environment/build with captured results.

| Test | Start boundary | Pass criteria | Stop condition |
| --- | --- | --- | --- |
| Concurrent workspaces | 4 organizations, 1 run each | no tenant bleed; runtime respects global 4 and org 1 | auth/RLS anomaly, orphaned run |
| Per-org concurrency | 1 org, 2 simultaneous requests | second request is deduped/rejected/queued safely per guard | two conflicting active runs |
| Max prompts | 10 prompts, one provider | terminal run; complete cost/attempt accounting | finish timeout/orphaning |
| Provider timeout | force 45s timeout | retry/failure recorded; no invented evidence | stuck running attempt |
| Provider outage | deterministic provider failures | circuit opens after distinct failed runs; safe terminal states | runaway retries/spend |
| Queue saturation | enqueue above global 4 across orgs | bounded start/backlog; no lost events | >5m unexplained start age |
| 100 due schedules | dispatcher input ceiling | every due row accounted as queued or safe skip | silent omission |
| Cancellation | cancel queued and running run | no later evidence writes beyond cancellation boundary | post-cancel provider persistence |
| DB contention | simultaneous quota/budget reservations | advisory-lock/unique constraints preserve limits | overspend/overquota |
| Duplicate events | replay same run/event | one logical run/result | duplicate provider spend |
| Webhook spike | replay controlled delivery burst | idempotency + terminal delivery accounting | duplicate external effect |
| Tenant isolation under load | parallel org reads/writes | zero cross-org rows | any cross-tenant access |
| Large Record | maximum realistic answers/citations | render/export within measured budget | crash/unbounded memory |
| Long comparison history | seeded long history | bounded query/render | full-table scan/regression |

### Test evidence required

For every executed scale test capture:

- git SHA;
- environment;
- seed/data shape;
- concurrency;
- request/run counts;
- provider or stub mode;
- duration;
- p50/p95/p99 where statistically meaningful;
- failures/retries;
- DB/queue/provider timings;
- cost events;
- tenant-isolation checks;
- result artifact.

Never publish “supports N customers/workspaces/runs” from configuration alone.

## 9. Disaster recovery

### 9.1 Proven in repository

- Timestamped Supabase migrations are source-controlled.
- Collection runs are idempotent at the queue/run boundary.
- Cancellation exists.
- Exact production build verification exists in browser acceptance.
- Runtime probes tie a deployed build SHA to Inngest execution.
- CI/browser/security workflows create release evidence.

### 9.2 Not proven in repository

**Current gaps / external verification required**

- Supabase backup/PITR retention actually enabled on the production project;
- Cloudflare rollback retention and operator permissions;
- D1 backup/restore configuration;
- Inngest retained event/history guarantees for the actual account;
- encrypted secret recovery process;
- measured RPO;
- measured RTO;
- a completed production-like restore drill.

Therefore Foremention must not claim a specific RPO/RTO or backup guarantee from this build.

### 9.3 Restore drill — experiment

1. Record exact production schema migration head and application SHA.
2. Take/identify a provider-supported database restore point.
3. Restore into an isolated non-production project.
4. Apply any forward migrations required by the application SHA.
5. Run tenant/RLS/security tests.
6. Verify representative runs, answers, citations, evidence, Recommendation Records, schedules, billing state and cost events.
7. Verify no jobs/webhooks/emails can escape the isolated environment.
8. Measure data-loss window (candidate RPO) and recovery duration (candidate RTO).
9. Destroy the drill environment after evidence retention requirements are met.
10. Only then promote measured RPO/RTO values into operational targets.

### Provider outage recovery

Fail closed on evidence creation. A provider outage may create a failed/partial observation; it must not trigger synthetic evidence. Recovery is a new idempotent run after provider health/circuit conditions permit, preserving the original failed attempt history.

### Queue recovery

Reconcile `queued`/`running` runs against Inngest/runtime evidence. Never blindly replay all rows. Replay only runs that are proven safe by idempotency key, active-request key, terminal status and recorded provider cost.

## 10. Customer-facing performance

### 10.1 Current facts

The repository already has browser acceptance across desktop, laptop, tablet, mobile, narrow mobile and Firefox desktop profiles. Pull requests run browser/accessibility checks and Lighthouse audits. Lighthouse currently uses warning floors, not release-blocking performance claims:

- performance: 0.75;
- accessibility: 0.95;
- best practices: 0.90.

Those floors are CI guardrails, not measured production scores for every authenticated customer state.

Database migrations already include indexes for live foreign-key and run/provider paths, including run attempts and AI cost events. This branch adds provider/time indexes needed for operator-wide reliability and cost windows.

### 10.2 Gaps

**Current gap**

The audit does not establish measured budgets for:

- authenticated large Recommendation Records;
- long Comparison history;
- large source maps;
- JavaScript bundle bytes by route;
- authenticated p75 Core Web Vitals;
- high-cardinality database queries at realistic history depth.

### 10.3 Performance experiments

Before raising data or concurrency limits:

- seed deterministic large Records and comparison history;
- capture query plans with realistic cardinality;
- measure response payload sizes;
- measure server/database p50/p95/p99;
- run browser interaction/reflow/accessibility at 320/375/768/1024/1440 widths;
- record bundle changes per route;
- reject N+1 query growth;
- paginate/stream only where product semantics remain intact.

Do not solve a slow large Record by silently truncating evidence. Pagination or progressive disclosure must preserve access to the complete evidence chain.

## 11. Capacity-change gate

Any change to one of these values requires evidence before merge/deploy:

- prompts per run;
- providers per run;
- global or organization concurrency;
- provider timeout;
- function start/finish timeout;
- retry count;
- circuit threshold/window;
- monthly AI spend cap;
- monthly provider-prompt units;
- Groq prompt reservation/run/monthly ceilings;
- dispatcher batch ceiling.

Required review:

1. cost impact;
2. worst-case runtime math;
3. provider quota/rate-limit evidence;
4. queue impact;
5. database contention plan;
6. tenant-isolation test;
7. cancellation/recovery test;
8. evidence-quality/comparability impact;
9. production rollback plan.

## 12. What this branch does and does not prove

### Implemented

- separates Groq per-prompt reservation from whole-run cap without increasing default spend;
- adds truth-safe unit-economics calculation;
- adds service-only provider attempt/cost/package operational facts;
- adds a service-only real-invoice/meter infrastructure COGS ledger;
- adds indexes for provider reliability/cost time windows;
- adds behavioral/contract tests for cost semantics, privacy and execution limits;
- establishes proposed SLI/SLO/error-budget, incident, chaos, DR and performance operating contracts.

### Not claimed

- no invented revenue;
- no invented gross margin;
- no invented Cloudflare/Supabase/Inngest/storage price;
- no invented provider quota;
- no invented backup retention;
- no invented RPO/RTO;
- no “supports X customers” claim;
- no multi-provider live-run scale claim;
- no claim that current Lighthouse warning floors are production performance SLOs.

## 13. Release evidence checklist

Before merging this branch:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- migration validation on an isolated Supabase environment
- browser acceptance workflow
- security workflow

Before making a new capacity claim:

- execute the relevant scale experiment;
- store the exact SHA and artifact;
- capture measured provider/database/queue/cost facts;
- red-team tenant isolation;
- record the tested boundary here as a **measured result**, separate from configuration.
