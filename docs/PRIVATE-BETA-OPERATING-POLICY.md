# Foremention controlled private-beta operating policy

Status: operator-approved operating posture for the current production release.

This record is an internal product/operations decision. It is not a legal opinion, a representation of outside counsel review, or permission to invent legal-entity, tax, jurisdiction, payment, or contractual facts that have not been verified.

## Release posture

Foremention is approved for a controlled private beta on the evidence-backed production stack.

- New workspaces begin on the enforced `free_beta` / founder-granted entitlement unless a verified billing event later activates an approved package.
- Creating a workspace does not activate a paid subscription or charge a payment method.
- Core, Signal, and Intelligence describe software package scopes. The repository does not fabricate public dollar pricing.
- Hosted Core/Signal Stripe Checkout and Customer Portal code may exist in production while remaining unavailable. Self-serve billing stays fail-closed unless the real Stripe secret, webhook secret, approved package Price ID, customer billing state, and production configuration are present.
- A browser success redirect never grants a paid entitlement. Paid state is written only after a verified asynchronous billing-provider event passes replay/idempotency controls.
- Enabling actual paid checkout for customers still requires approved tax/entity details, order-form/terms language, cancellation/refund handling, and production validation for the target contracting setup.
- No product copy, sales process, or support response may imply that an unavailable paid control, certification, contract, or legal fact is already active.

## Data retention and deletion posture

- The current free-beta entitlement exposes a 90-day history setting. That is a product-history limit, not a claim that every underlying record is automatically destroyed at day 90.
- Customer/workspace data is retained while needed to operate the beta and for security, recovery, support, legal, billing-readiness, and documented operational purposes.
- Workspace owners have an implemented export path and an owner-confirmed deletion flow with a seven-day safety window and a non-identifying deletion receipt.
- Backups must not be represented as immediately erasable when the underlying platform cannot guarantee that behavior. Deletion communications must distinguish live-record deletion from backup-cycle expiry.
- Raw public page bodies are not retained by default by the source-snapshot design; bounded retrieval/evidence metadata is retained instead.

## Service-provider / subprocessor posture

Maintain a public operational transparency list at `/subprocessors`.

The list must:

- name only providers whose role is supported by current code/configuration evidence;
- distinguish core providers, optional-consent analytics, AI providers used only when selected/configured, and configuration-dependent services;
- avoid claiming that every listed provider receives every data category;
- avoid claiming a DPA, transfer mechanism, data location, certification, or contractual term unless separately verified;
- state that an enterprise/customer-specific contractual processor list can be supplied as part of a signed order form or DPA process.

Changes to a provider that materially changes customer-data processing should update the transparency page and, when contractually required, customer notice/authorization before the new provider is used for that customer.

## Incident ownership and monitoring

Primary incident owner: **Founder / Operator** until a named security or operations role is formally delegated.

Production monitoring uses:

- exact-build Cloudflare release verification;
- live Inngest sync/execution probes;
- Supabase/Auth/database logs and durable application audit records;
- the service-only first-party operator alert channel delivered through the configured application-email provider;
- GitHub CI/release evidence;
- Sentry only when its production configuration and alert receipt are independently verified. Sentry SDK presence alone is not treated as an active control.

Operational alerts must not contain passwords, access/refresh tokens, provider API keys, raw customer answers, customer evidence bodies, or unnecessary personal information.

## Incident response minimum

For a suspected P0/P1 security or data-integrity incident:

1. Contain: stop the affected collection/integration path, revoke compromised sessions/secrets when relevant, and prevent further writes or cross-tenant access.
2. Preserve evidence: record exact build SHA, timestamps, affected service, log/audit identifiers, and observed scope without copying secrets into tickets or chat.
3. Assess scope: determine affected organizations/data classes and whether the issue is confidentiality, integrity, availability, billing, or provider-output correctness.
4. Recover: use the verified deployment and application-data restore procedures; never restore a drill over production.
5. Communicate: issue customer/operator notices when required by contract or applicable law; do not speculate about impact before evidence exists.
6. Verify: rerun the relevant tenant/auth/export/provider/release acceptance tests before reopening the affected path.
7. Follow up: document root cause, corrective action, regression coverage, and any policy/provider changes.

## Commercial and legal boundary

The current public Privacy and Terms pages are operating notices for the beta. They do not constitute evidence that an outside lawyer has approved a particular legal entity, governing law, tax treatment, DPA, transfer mechanism, or enterprise procurement package.

For the controlled private beta, the safe default is therefore:

- no automatic paid checkout as a consequence of signup, onboarding, or a browser redirect;
- self-serve Core/Signal checkout remains hidden unless its real billing configuration and commercial gate are satisfied;
- no invented legal-entity or jurisdiction statement;
- no promise of an enterprise DPA until one is reviewed for the actual contracting entity and customer;
- no ranking, citation, traffic, lead, pipeline, or revenue guarantee;
- provider and model claims must come from captured production evidence;
- any paid/general-availability launch must reopen the commercial/legal gate for the actual entity and target jurisdictions.

## Sign-off interpretation

The operator's instruction to finish and deploy the product authorizes this conservative private-beta posture and the engineering/operational defaults above. It does **not** authorize the product to fabricate facts that only a contracting entity, payment processor, tax adviser, customer, or legal counsel can establish.
