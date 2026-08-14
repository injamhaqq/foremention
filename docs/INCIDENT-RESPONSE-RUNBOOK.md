# Foremention incident-response runbook

Applies to the controlled private beta. Primary owner until delegated: **Founder / Operator**.

This runbook is operational guidance, not a substitute for any notice, reporting, preservation, or contractual obligation that applies to a specific incident or jurisdiction.

## Severity

### P0 — critical

Use P0 for a confirmed or credible risk of:

- cross-organization data exposure or write access;
- exposed production credentials or provider secrets;
- unauthorized account/session control affecting multiple users;
- destructive production data loss without a verified recovery path;
- active compromise that is still expanding.

### P1 — high

Use P1 for:

- a tenant-scoped security incident;
- a broken authentication or authorization control without observed cross-tenant exposure;
- materially corrupted evidence, exports, provider attribution, or billing/entitlement state;
- a production outage that blocks core customer work and has no immediate workaround.

### P2 — normal production defect

Use P2 for a bounded defect that does not create a material confidentiality, integrity, availability, or commercial risk. Fix through the normal branch → tests → PR → CI → exact-release verification path.

## Immediate response

1. **Identify the exact release.** Record the live build SHA and relevant timestamps before changing anything.
2. **Contain the affected path.** Pause or disable only the smallest unsafe collection, integration, account, or workflow boundary. Do not erase evidence to make an alert disappear.
3. **Revoke access when appropriate.** Rotate exposed secrets, revoke affected refresh sessions, and remove integration access if compromise is suspected.
4. **Preserve evidence safely.** Keep audit IDs, request/run IDs, provider/model labels, event times, hashes, and error codes. Do not paste passwords, access/refresh tokens, provider keys, or unnecessary customer content into tickets, chat, or alerts.
5. **Establish tenant scope.** Explicitly test whether the problem crosses organization boundaries before calling it isolated.

## Investigation checklist

- Authentication/session boundary
- Organization/RLS and application-level tenant boundary
- Export/search boundary
- Provider/model/request boundary
- Evidence/citation/source provenance
- Secret and integration access
- Database integrity and recent migrations
- Cloudflare deployed SHA
- Inngest synchronization/execution state
- Operator-alert receipt
- Relevant Supabase/Auth/application logs

## Recovery

- Prefer a known-good forward fix over destructive rollback when data migrations or customer writes may have occurred.
- Use the verified application-data restore procedure only against an isolated target during drills.
- Never overwrite production as part of a drill.
- After recovery, rerun the acceptance tests that correspond to the failed boundary: auth, tenant isolation, export, provider collection, mobile/browser, exact release, or alert delivery.

## Communication

For an actual incident, communicate only what evidence supports:

- what happened;
- when it happened;
- which systems/data are confirmed in scope;
- what containment has occurred;
- what the customer/operator should do next;
- when the next update will be provided if the investigation is ongoing.

Do not claim that no data was accessed, that an incident was harmless, or that a third party caused it unless the evidence supports that conclusion. Escalate notification timing/content for legal or contractual review when required by the actual customer agreement and applicable law.

## Closure criteria

An incident can be operationally closed when:

- containment is verified;
- root cause is documented;
- affected controls are fixed or intentionally disabled;
- regression coverage exists where practical;
- the exact production release is proven;
- relevant live acceptance tests pass;
- customer/operator communication obligations are completed or assigned;
- follow-up work has explicit owners rather than being left implicit.

## Monitoring boundary

The currently proven production alert control is Foremention’s service-only operator-email alert path. Sentry SDK presence must not be represented as an active alerting control unless production configuration and a received Sentry alert are separately verified.
