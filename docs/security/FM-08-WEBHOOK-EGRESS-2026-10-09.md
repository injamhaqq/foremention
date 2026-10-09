# FM-08 — Outbound workspace webhook safety gate (2026-10-09)

**Authority:** FM-00 coordinates deployment. **Status:** draft-only; no main merge, environment change or production endpoint request authorized by this patch.

## Observed boundary and exact fix
Existing `validateWebhookDestination` rejects non-HTTPS, private IP literals and reserved hostname forms, but it does **not** bind hostname resolution to the outbound `fetch()`. A user who can create a workspace endpoint can submit a public-looking hostname whose DNS resolution may later point to a private address. Cloudflare's runtime/network policy may block some destinations, but this code did not prove that property.

The new `WORKSPACE_WEBHOOK_ALLOWED_ORIGINS` server-only environment setting is an **operator-approved, exact HTTPS origin allowlist**. Unset, malformed or partly malformed lists produce no approved destinations. Registrations are rejected before a database write, and deliveries are checked again before any outbound request, including legacy endpoints. The feature is off by default until specific destinations are approved.

An approved origin may have arbitrary paths or query parameters on that same origin. No wildcard domain support is permitted. No credentials, reserved addresses or nonstandard ports are permitted. The signing secret and event payload are unchanged. The demo remains disabled.

## Limits: not a complete SSRF or idempotency remedy
- Hostnames in the allowlist still need controlled ownership, DNS governance and an enforceable outbound network policy. Allowlisting a malicious/rebindable domain does not eliminate DNS rebinding.
- The current delivery receipt uniqueness constraint prevents duplicate receipt rows, **not simultaneous sends**: two workers may both read a pending row and call the destination before either sets `delivered`. This PR does not alter that database behavior.
- A successful external POST followed by a failed receipt update may still be retried. Clients must use the event ID to deduplicate. The solution is at-least-once delivery with an atomic claim/lease, not a claim of exactly-once external side effects.
- Existing registered webhook endpoints not in the allowlist will fail closed during delivery. FM-06 should review migration/visibility and operator alerting before enabling.

## Verification
- Synthetic unit cases: unset setting, exact approved hosts, sibling/subdomain confusion, private IPs, malformed entries, HTTP, userinfo and unexpected ports.
- Source contracts assert the allowlist guard occurs before endpoint database write and outbound fetch.
- Fresh PR CI must confirm existing webhook contract, frozen install, build, CodeQL, Security, browser and isolated auth acceptance.
- No real customer webhook destination, public internet probe, production mutation, provider spend or production network scan is part of the test.

## Release prerequisites
1. FM-00 and FM-06 approve the deliberate opt-in behavior and customer disclosure.
2. Confirm `WORKSPACE_WEBHOOK_ALLOWED_ORIGINS` is explicitly set only to reviewed destinations if workspace webhook delivery is needed.
3. Add per-request destination/IP controls in the outbound network layer, and review enforcement against rebinding.
4. Implement the atomic attempt-claim / crash recovery lease in an independently reviewed FM-06 + FM-05 migration, test parallel workers and confirm retries preserve source event identity.
5. Verify an exact-SHA release, and use a dedicated synthetic endpoint before sending any customer webhook.
