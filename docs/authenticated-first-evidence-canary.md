# Authenticated first-evidence production canary

The production canary uses the existing customer authentication, workspace, collection, review, and evidence paths. It does not create a second auth path or a service-role browser bypass.

For local/manual use, the canary remains inert unless its enable and spend-approval switches are explicitly set. On trusted exact-`main` release workflows, `FOREMENTION_ACCEPTANCE_CANARY_REQUIRED=true` makes missing enablement or spend approval a release failure rather than a successful skip. Trusted production browser acceptance likewise sets `FOREMENTION_REQUIRE_AUTHENTICATED_ACCEPTANCE=true`, so missing dedicated acceptance credentials cannot be reported as a green authenticated release.

## What it proves when enabled

For the exact deployed `main` SHA, the trusted workflow uses the same customer authentication and mutation paths as the product to verify:

- authenticated session establishment;
- a dedicated workspace with exactly five approved baseline buyer questions;
- a real collection containing exactly one approved question and one explicitly configured live provider;
- release-scoped idempotency by repeating the same request and requiring the same run;
- a persisted provider answer with a recorded model identifier;
- the normal run human-review publication gate;
- exact Source X-Ray navigation from the reviewed run when the provider returned a mappable citation;
- visibility of the analyst source-review boundary without manufacturing analyst facts;
- ordinary UI sign-out and restoration of the unauthenticated `/app` boundary afterward.

The canary does **not** auto-save a source review or create an opportunity. A provider citation does not establish crawler access, page contents, a legitimate contribution route, feasibility, influence, or brand presence. Those facts remain human-review territory.

## Required trusted secrets

The workflow reads these only on `main` / manual trusted runs:

- `FOREMENTION_ACCEPTANCE_EMAIL`
- `FOREMENTION_ACCEPTANCE_PASSWORD`
- `FOREMENTION_ACCEPTANCE_CANARY_ENABLED=true`
- `FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED=true`
- `FOREMENTION_ACCEPTANCE_PROVIDER` — exactly one configured live provider
- `FOREMENTION_ACCEPTANCE_MAX_COST_USD` — an explicit positive acceptance ceiling no greater than `$1.00`

The two required-mode flags are workflow-owned, not secrets:

- `FOREMENTION_REQUIRE_AUTHENTICATED_ACCEPTANCE=true` for trusted production browser acceptance;
- `FOREMENTION_ACCEPTANCE_CANARY_REQUIRED=true` for the trusted exact-release first-evidence canary.

The production collection API remains authoritative for provider configuration, tenant authorization, idempotency, quota reservation, budget reservation, provider-specific controls, and `FOREMENTION_MAX_RUN_COST_USD` / the built-in maximum run cost.

## Synthetic workspace

The acceptance identity must be a dedicated non-customer synthetic account. If that identity has no workspace, the canary bootstraps one through the ordinary `/api/onboarding` customer endpoint using unmistakably synthetic fixture data. It then requires exactly five approved buyer questions. Existing customer organizations are never selected or deleted.

The acceptance identity must not be a real customer account and its secret values must never be committed, printed, archived, or pasted into logs.

## Cost and cadence

The workflow runs once per `main` release and uses `acceptance:<exact-git-sha>` as its idempotency key. Rerunning the same release must return the same run rather than queue another provider request.

No real provider call occurs until both the canary enable switch and the provider-spend approval switch are explicitly true. The canary enforces an additional explicit acceptance ceiling no greater than `$1.00`, while the normal production collection budget and quota controls remain authoritative.

Because trusted exact-release mode is fail-closed, the release will remain red until the owner has provisioned the dedicated synthetic identity and explicitly approved the bounded live-provider spend. Do not set the spend-approval switch merely to make CI green.

## Evidence retention

The workflow archives only a privacy-minimized JSON summary: stage names, counts, statuses, provider identifier, configured ceiling, and pass/skip/failure state. It does not archive the acceptance email/password, prompt text, provider answer text, citation URLs, source page bodies, cookies, tokens, or customer data.
