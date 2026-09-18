# Foremention Agent OS

Status: Phase 1 operating-control foundation. Disabled by default until `FOREMENTION_AGENT_OS_ENABLED=1` is configured in the server environment and the production Inngest sync is verified.

## Purpose

Foremention already has a measurement Agent Control Plane for collecting provider evidence. Agent OS adds a separate company-operating layer for bounded Research / Insight, Customer Success, CEO, and later Sales, Support, Marketing, Product, QA, Engineering, and Finance / Ops workflows.

The operating rule is **manage by exception, not unconstrained autonomy**.

## Phase 1

A human-approved run emits `foremention/run.reviewed`. Only then:

1. Research / Insight records a grounded reviewed-evidence observation.
2. Customer Success derives the next activation/retention step from Foremention's existing transparent state machines.
3. A daily CEO job compiles first-party company/customer-value scorecards plus pending approvals and recorded run failures.

No new LLM call is required for these three Phase 1 agents. That is intentional: deterministic company truth should remain deterministic.

All output is written to `agent_actions`, a service-only, idempotent, RLS-protected ledger.

## Autonomy policy

| Effect | Default |
| --- | --- |
| Low-risk observation | Record automatically |
| Low-risk internal control-plane write | Record automatically |
| Medium+ internal action | Human approval |
| External communication | Human approval |
| Commercial commitment / pricing | Human approval |
| Financial action | Human approval |
| Production change | Human approval |
| Destructive action | Human approval |
| Legal/compliance action | Human approval |

The database also enforces the consequential-effect approval boundary. Application code cannot silently classify an outbound, financial, production, destructive, or legal action as approval-free.

## Truth boundaries

- Research / Insight is triggered only after the existing human review route finalizes a run.
- Customer Success reuses `deriveActivationStage` and `deriveRetentionHealth`.
- Exact second-cycle comparability remains owned by the existing intelligence layer; the CS agent does not infer it.
- CEO metrics come from the existing first-party company scorecards. Missing or statistically insufficient values stay missing/N/A.
- `confidence` is nullable. Phase 1 uses NULL rather than inventing a probability.
- A recorded agent action is not proof that an external action occurred.

## Founder approval

Only an authenticated email in `FOREMENTION_COMPANY_OPERATOR_EMAILS` may decide a pending company operating action through the Agent Control Plane. The decision endpoint is same-origin protected and records an organization audit entry when the action belongs to a workspace.

Approval changes an action from `pending_approval` to `approved`. It does **not** automatically execute a consequential effect. Dedicated executors must be added per action type with their own permissions, idempotency, rollback, and verification contract.

## Agent-runtime evolution

Phase 1 deliberately has no new agent-framework dependency, preserving the repository's frozen pnpm lockfile and Cloudflare build gates.

The next reasoning layer should plug into this control plane rather than replace it:

```text
Foremention events
    -> durable workflow (current Inngest; Temporal can be introduced later)
    -> reasoning runtime (OpenAI Agents SDK TypeScript)
    -> AgentAction proposal
    -> policy engine
    -> low-risk internal record OR founder approval
    -> dedicated executor
    -> measurement / QA
```

This keeps model choice and orchestration replaceable while the durable action, approval, evidence, cost, and audit contracts remain Foremention-owned.

## Activation

1. Merge only after the normal CI, migration replay, tests, eval gate, typecheck, build, and Cloudflare dry run pass.
2. Deploy the migration.
3. Set `FOREMENTION_AGENT_OS_ENABLED=1` in the server environment.
4. Ensure `FOREMENTION_COMPANY_OPERATOR_EMAILS` contains the founder/operator email.
5. Sync Inngest functions and run the existing production probe.
6. Human-review a real collection and verify two idempotent actions appear: Research / Insight and Customer Success.
7. Verify the daily CEO brief appears on the next scheduled cycle without invented commercial metrics.
