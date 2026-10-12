# Proposal (Chat01 -> FM-00 / Chat06): durable usage receipts for internal model work

Implemented on this branch: `admitInternalModelCall` gives each internal attempt a durable admission unit (D1 counter `internal:<purpose>:<provider>:day:<date>`) and `enrichOnboardingDraft` returns a receipt `{provider, model, requestId, collectedAt, usage, admissionPeriodKey}`.

Not implemented (needs shared schema): persisting that receipt. `ai_cost_events` requires `organization_id` and `run_attempt_id`, but onboarding analysis can run before an organization exists. Options for FM-00:
1. New table `internal_model_usage(id, purpose, provider, model, request_id, admission_key, input_tokens, output_tokens, total_tokens, estimated_cost_usd, cost_source, viewer_id, organization_id null, observed_at)`.
2. Make `ai_cost_events.run_attempt_id`/`organization_id` nullable with a `purpose` column.
Also add the internal counter to the operator capacity readout (`readEvidenceCapacity`).

Operations: keep `FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP` **unset** in production (and free-only mode on). Setting it is a spend decision for the founder, not a deploy default.
