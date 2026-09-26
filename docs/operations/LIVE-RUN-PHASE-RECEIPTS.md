# Live collection stage receipts — operator interpretation

These receipts describe **execution duration inside a single Inngest durable step body**. They do not directly measure how long the event waited in the Inngest queue, network delivery time, the entire function invocation, browser polling, customer activation, or time to an externally reviewed decision.

## Receipt contract

The existing strict operational logger emits `event=run_phase_timing` with the internal `runId`, one of the fixed `phase` names below, `status=200` on success or `500` on thrown failure, and bounded `durationMs` (0–3,600,000). No prompt, answer, citation URL, email, tenant identity, API key, full exception or error message may be added. Individual receipt durations may be repeated if Inngest reruns an interrupted step body; **count actual executions, not unique run IDs or user-visible completions**.

## Covered phases

| Phase | Existing durable step | Interpretation |
| --- | --- | --- |
| `load_run` | `load-and-revalidate-run` | Load the queued run and validate its state. |
| `start_supervisor` | `start-run-supervisor` | Record the supervisor's running state. |
| `load_prompts` | `load-run-prompt-snapshots` | Read immutable run question snapshots. |
| `load_identity` | `load-workspace-identity` | Read the active brand/competitor configuration. |
| `record_question_scout` | `record-question-scout` | Persist the preflight question-scout job result. |
| `check_provider_circuit` | `check-provider-circuit` | Read recent safe operational failures. |
| `mark_running` | `mark-run-running` | Mark the run as running after preflight. |
| `start_collector` | `start-answer-collector` | Record the collector's running state. |
| `persist_answer` | existing `persist-${providerId}-${prompt.prompt_key}` | Persist returned answer, attempt receipt, cost and citations; excludes the provider request itself. May execute once per selected prompt. |
| `record_collector` | `record-answer-collector` | Record terminal collector job state. |
| `count_sources` | `count-run-sources` | Count distinct persisted sources for the run. |
| `mark_for_review` | `mark-run-for-human-review` | Make the recorded observation available for review. |
| `generate_source_map` | `generate-observed-source-map` | Attempt post-collection Source Map creation; failure may be retried later. |
| `notify_owner` | `notify-run-owner` | Persist the in-app notification; does not measure email or external webhook delivery. |

A real provider request has its own `provider_request_started` and `provider_request_completed` or `provider_request_failed` operational markers. **Never combine the provider collection step with `persist_answer`** to obtain a cleaner-looking timing statistic: that destroys the retry boundary protecting against duplicate paid requests.

## Attribution procedure

1. Restrict observations to an authorized, specific deployment SHA and narrow time window. Separate internal synthetic canaries from independently classified external customer runs using existing protected service-only operational records; do not send customer labels into general logging.
2. Correlate `runId` across recorded run timestamps, durable `jobs` phase timestamps, existing `provider_request_*` markers and these `run_phase_timing` receipts. A missing receipt indicates missing evidence, **not a zero-millisecond phase**.
3. `runs.started_at - runs.created_at` includes ingress/worker wait **and** preflight, so it is not a pure queue-delay measurement. `runs.completed_at` may precede post-review supervisor reconciliations. For internal-canary stage analysis, show small-sample counts and individual values before any p50/p90.
4. If durable steps replay, retain each phase receipt's execution event separately. Do not sum individual durations and call the remainder queue latency: parallel steps, scheduling and inter-step waits require explicit ingress/worker timestamps and may overlap.
5. Diagnose the dominant measured stage before tuning concurrency, retries, paid capacity or provider spending. Do not declare customer SLOs or unit-economics completeness from synthetic evidence.

## Release checks and privacy

Run `pnpm test`, `pnpm typecheck`, the isolated Supabase replay, security/quality gates and independent PR browser acceptance for an exact candidate SHA. No production SQL migration is required. Preserve the strict logger allowlist. Do not expose log text, aggregate across arbitrary tenants, launch new AI calls merely to increase sample size, or use these phases as a customer-outcome claim.
