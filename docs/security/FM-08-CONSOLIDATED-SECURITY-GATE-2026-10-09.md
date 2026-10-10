# FM-08 — Consolidated authentication + outbound webhook hardening gate

**Date:** 2026-10-09. **Status:** DRAFT ONLY; no merge/deploy/production configuration change.
**Canonical base:** `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
**Integration authority:** FM-00.

## Why this candidate exists

The independently verified FM-08 drafts alter related surfaces. Merging them separately would create avoidable collisions:
- #470: fictional-demo origin guard, no-store responses and production cookie flags.
- #471: canonical origin checks for eight browser auth POST routes, removal of untrusted forwarding-header authority, incorporation of #470.
- #477: fail-closed public-DNS preflight before webhook registration and every delivery.
- #478: operator-approved exact HTTPS origin allowlist, disabled by default.

This candidate is built on the latest #471 head and combines only the applicable #477 and #478 changes, with all individual synthetic tests preserved plus a combined order contract. It is not a production branch.

## Security invariants

1. Browser authentication and demo state changes require a trusted request origin before cookie/session/provider side effects.
2. A custom outbound webhook destination is unavailable without an explicitly configured `WORKSPACE_WEBHOOK_ALLOWED_ORIGINS` allowlist.
3. The allowlist rejects wildcards, non-HTTPS origins, non-root paths, credentials, query strings, nonstandard ports, private addresses and malformed configurations; one invalid entry invalidates the entire setting.
4. Both registration and each delivery require passing the operator allowlist AND a public-only DNS resolution preflight.
5. Redirects during delivery are not followed. Demo stays isolated.
6. No test in this candidate contacts paid AI or sends a customer webhook.

## Important limitations, not claims of release readiness

- DNS answers can change between preflight and `fetch()`; a separate Cloudflare egress policy/private-network block is required before relying on user-configurable hostnames.
- Receipt uniqueness prevents duplicate database rows, not simultaneous webhook sends. FM-06/FM-05 must implement durable atomic claim, lease/fencing and recovery before claiming at-most-once execution per attempt.
- A successful external send followed by failed receipt persistence can be retried; recipients must deduplicate event IDs. Do not advertise exactly-once external effects.
- Existing production webhook endpoints cannot deliver while allowlist is unset. Enabling reviewed destinations is an intentional operator action requiring authorization.
- This candidate does not modify privileged `update_prompt_versioned` project scoping, production password checks, rulesets or billing.
- GitHub `main` currently requires CI but does not require all standalone security/browser checks. FM-00/FM-11 must change governance separately with approval.

## Exact-head acceptance

Require successful:
- Frozen dependency install, local Supabase migration replay, tenant-isolation and application tests, lint, typecheck, build and Cloudflare dry runs.
- Security/Gitleaks/OSV/Trivy, CodeQL, AI quality gate, Browser Acceptance, and isolated authenticated local journey.
- No unexpected provider, production, or external-webhook activity.
- Owner review of the origin semantics under Cloudflare edge forwarding and approved externally routed hostnames.

Do not merge #470, #471, #477 and #478 independently after approving this consolidated candidate. FM-00 must either select this candidate or explicitly reconcile a different combined tree; track exact commit and checks.

## Other handoffs

- FM-05: database RPC role/project authorization and migration hash crosswalk; #479 is in draft.
- FM-06: webhook atomic delivery receipt claim, idempotency fencing, crash recovery and retry contract.
- FM-04/FM-07: model/tool-effect injection evaluation; prompt content is untrusted evidence, never execution authority.
- FM-11: required status checks, CODEOWNERS/review policy and immutable release provenance.
- FM-09: any provider-neutral billing adapter must preserve signed event and atomic entitlement integrity.

No production changes, keys, customer records, webhook sends, merges or deploys were made while preparing this candidate.
