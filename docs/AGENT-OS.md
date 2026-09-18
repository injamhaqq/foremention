# Foremention Agent OS

Status: Phase 4 support-agent foundation. Agent OS and model reasoning remain independently disabled by default until their server flags are enabled and production verification is complete.

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

## Phase 2 reasoning layer

Phase 2 adds a bounded read-only reasoning adapter on the OpenAI Responses API without adding an npm dependency. This preserves the repository's frozen pnpm lockfile while providing the same owned control-plane boundary that a future Agents SDK runtime will use.

The reasoning runtime is independently gated by `FOREMENTION_AGENT_REASONING_ENABLED=1`. It:

- sends only bounded, already human-verified run evidence or deterministic customer-success facts;
- exposes no tools, browser, email, payment, production, shell, or destructive capability to the model;
- uses strict JSON Schema output;
- validates every research evidence key against records actually supplied to the model;
- treats provider answers and page metadata as untrusted data, never instructions;
- records input hash, model, token usage, latency, output, and cost in a service-only reasoning ledger;
- atomically reserves a global daily reasoning-cost budget before a call;
- keeps operating-agent reasoning cost separate from customer collection cost.

The default model is `gpt-5.6-luna`; changing the model requires explicit input/output pricing configuration or reasoning fails closed.

### Phase 2 outputs

1. **Research / Insight decision memo** — an internal low-risk synthesis of reviewed evidence. It may recommend reversible investigation/review/experiment steps but cannot execute them.
2. **Customer Success message draft** — a concise draft built only from the deterministic activation/retention state. It is classified as external communication and therefore enters the founder approval queue. Approval still does not send it.

## Phase 3 controlled execution

Phase 3 adds the first dedicated consequential executor: **Customer Success email**. It does not broaden agent permissions generally.

The execution path is deliberately two-step:

```text
pending approval
    -> founder/operator approves
    -> approved
    -> founder/operator explicitly executes
    -> atomic execution claim
    -> recipient + opt-in + unsubscribe re-check
    -> idempotent provider request
    -> execution receipt
```

Controls:

- Only `customer-success / customer_success_message_draft / external_communication / medium` actions are executable.
- The primary workspace owner user ID and email are frozen into the draft payload before approval.
- Immediately before send, the executor confirms the same user is still an owner and the same email is still attached.
- Product email must still be explicitly enabled and the recipient must not have unsubscribed.
- The existing signed one-click unsubscribe system is appended to the approved message.
- Resend receives a deterministic provider idempotency key.
- `agent_action_executions` is service-only and permits one execution claim per action.
- Provider rejection records a failed receipt; policy/config/preference blocks record a blocked receipt and cancel the action.
- Network ambiguity or provider acceptance without a trustworthy receipt records `uncertain`. The action deliberately stays `executing` and is not automatically retried.
- A provider-success / receipt-persistence race never triggers another send. Manual reconciliation is required instead.

Approval is therefore permission to execute, not execution itself.

## Phase 4 Support Agent

Phase 4 adds a customer-initiated support loop without treating support diagnostics as Recommendation Intelligence evidence.

### Support flow

```text
authenticated workspace member
    -> creates support ticket
    -> requester-scoped persisted ticket
    -> durable foremention/support.requested event
    -> deterministic workspace diagnostic snapshot
    -> optional bounded Support reasoning
    -> support_reply_draft
    -> operator approval
    -> explicit Send approved email
    -> transactional email receipt
    -> ticket responded
```

Controls:

- Support tickets are tenant-scoped and readable by the authenticated requester; company operators use a service-only Support inbox.
- Internal `support_ticket_diagnostics` records are service-only and never become Recommendation Intelligence evidence.
- Support reasoning can be anchored directly to a real active support ticket. It does not fabricate a collection run when none exists.
- The Support Agent shares the existing global reasoning-cost reservation and idempotency ledger.
- Customer ticket text is treated as untrusted data, never model instructions.
- The model is forbidden from inventing root causes, fixes, outages, billing states, entitlements, refunds, credits, SLAs, deadlines, or resolved status.
- A Support reply is `external_communication / medium` and always requires a human decision.
- Approval still does not send. The operator must use the separate controlled execution step.
- Support reply execution requires the same requester identity/email, a still-active workspace membership, and the same `reply_pending` ticket.
- Support replies are transactional responses to customer-initiated requests. They do not depend on product-alert opt-in/unsubscribe state and do not carry marketing unsubscribe headers.
- Customer Success emails retain their existing product-email preference and one-click unsubscribe requirements.
- Rejected, blocked, or definite pre-send failed Support actions return the ticket to `triaged`.
- Provider uncertainty remains non-retryable and leaves the ticket/action pending manual reconciliation.
- A successful provider send is receipt-protected from duplicate execution; ticket-state persistence is attempted afterward without issuing a second email.

The operator Support inbox reads persisted tickets directly, so customer requests remain visible even when Agent OS reasoning is disabled or unavailable.

## Agent-runtime evolution

The OpenAI Agents SDK should plug into this control plane rather than replace it once its dependency lock is generated reproducibly:

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
6. Human-review a real collection and verify two deterministic idempotent actions appear: Research / Insight and Customer Success.
7. If Phase 2 reasoning is desired, deploy the reasoning migration, set `FOREMENTION_AGENT_REASONING_ENABLED=1`, and verify the configured cost caps/rates.
8. Verify one Research decision memo appears and one Customer Success draft enters the approval queue; confirm approving the draft does not send it.
9. For Phase 3, verify Resend application email, `NEXT_PUBLIC_SITE_URL`, and `EMAIL_UNSUBSCRIBE_SECRET` are configured. Confirm the target workspace owner has product email enabled and is not unsubscribed.
10. Approve a Customer Success draft, verify the frozen recipient is correct, then use the separate **Send approved email** control. Confirm one execution receipt is recorded and a repeated execute attempt does not send a second message.
11. Verify blocked recipients (email disabled/unsubscribed/owner changed) create no external effect, and an uncertain result remains non-retryable.
12. Verify the daily CEO brief appears on the next scheduled cycle without invented commercial metrics.
13. For Phase 4, submit a real support request from `/app/support` and verify it appears immediately in the operator Support inbox.
14. Confirm the Support diagnostic action is observation-only and the diagnostic ledger is inaccessible to authenticated customers.
15. With reasoning enabled, verify a `support_reply_draft` enters the approval queue. Confirm customer ticket text cannot inject instructions into the Support model.
16. Reject one Support draft and verify the ticket returns to `triaged`.
17. Approve a new Support draft, then use the separate send control. Confirm the ticket changes to `responded`, one execution receipt is recorded, and a repeated execute attempt cannot send a second email.
18. Verify a customer who has disabled product alerts can still receive the explicitly requested transactional Support reply, while Customer Success product emails remain preference-gated.
