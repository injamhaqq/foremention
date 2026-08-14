# Authenticated first-evidence production canary

The production canary is deliberately inert until a dedicated synthetic acceptance identity and explicit provider-spend approval are configured.

## What it proves when enabled

For the exact deployed `main` SHA, the trusted workflow uses the same customer authentication and mutation paths as the product to verify:

- authenticated session establishment;
- a dedicated workspace with exactly five approved baseline buyer questions;
- a real collection containing exactly one approved question and one explicitly configured live provider;
- release-scoped idempotency by repeating the same request and requiring the same run;
- a persisted provider answer with a recorded model identifier;
- the normal run human-review publication gate;
- exact Source X-Ray navigation from the reviewed run when the provider returned a mappable citation;
- visibility of the analyst source-review boundary without manufacturing analyst facts.

The canary does **not** auto-save a source review or create an opportunity. A provider citation does not establish crawler access, page contents, a legitimate contribution route, feasibility, influence, or brand presence. Those facts remain human-review territory.

## Required trusted secrets

The workflow reads these only on `main` / manual trusted runs:

- `FOREMENTION_ACCEPTANCE_EMAIL`
- `FOREMENTION_ACCEPTANCE_PASSWORD`
- `FOREMENTION_ACCEPTANCE_CANARY_ENABLED=true`
- `FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED=true`
- `FOREMENTION_ACCEPTANCE_PROVIDER` — exactly one configured live provider
- `FOREMENTION_ACCEPTANCE_MAX_COST_USD` — an explicit acceptance ceiling used as an additional assertion

The production collection API remains authoritative for provider configuration, tenant authorization, idempotency, quota reservation, budget reservation, provider-specific controls, and `FOREMENTION_MAX_RUN_COST_USD` / the built-in maximum run cost.

## Synthetic workspace

If the dedicated acceptance identity has no workspace, the canary bootstraps one through the ordinary `/api/onboarding` customer endpoint using unmistakably synthetic fixture data. It then requires exactly five approved buyer questions. Existing customer organizations are never selected or deleted.

## Cost and cadence

The workflow runs once per `main` release and uses `acceptance:<exact-git-sha>` as its idempotency key. Rerunning the same release must return the same run rather than queue another provider request.

No real provider call occurs until both the canary enable switch and the provider-spend approval switch are explicitly true. The canary should remain disabled until the owner has created the dedicated acceptance identity and approved the bounded live-provider spend.

## Evidence retention

The workflow archives only a privacy-minimized JSON summary: stage names, counts, statuses, provider identifier, configured ceiling, and pass/skip/failure state. It does not archive the acceptance email/password, prompt text, provider answer text, citation URLs, source page bodies, cookies, tokens, or customer data.
