# FM360 Chat 05 — Security implementation and handoff (16 October 2026)

**Base** `6bf8bfda6ec0573dbbf432b831eff45688f8f47b` · **Owner** FM-AUD-07/12/23/31 · **Scope** invited-account authorization, source review only elsewhere.

## Scoped mitigation committed in this draft branch

- `app/api/team/invitations/accept/route.ts`: claim the still-pending invite by **one PostgREST conditional PATCH** (hash/id/status and expiry predicates), with `Prefer: return=representation`. If zero rows change, return 409 **before** inserting organization membership. This closes the previously reproduced mocked *revoke between read and write* authorization ordering defect.
- `tests/attach02-harness.mjs`: teach existing isolated PostgREST emulator to evaluate timestamp `gt.` filters.
- `tests/chat05-invitation-claim.test.mjs`: actual-route mocked tests for claimed-before-grant, competing revoke, token reuse, expiry, wrong/unverified mailbox, existing owner preservation, anonymous/demo, and simulated insert failure.

### Important limitation, not to omit from review

The claim and membership UPSERT are **still two database transactions**. If membership insertion fails after successful invitation claim, invite is consumed without access. A concurrent membership removal/upsert may still create a separate race. **This draft mitigation is not final acceptance** and should only ship after Chat01 resolves the all-or-nothing RPC or the owner explicitly accepts documented degraded behavior; do not classify invitation lifecycle fully fixed.

Local Node 22 standalone copied-route fixture before branch: 8/8 checks pass (including one identifying the remaining non-atomic failure). Full project tests, fresh PR CI and real isolated Supabase RLS were **not run locally** because no git checkout/pnpm and no writable disposable DB were available. Other existing 14 invite/tenant tests are subject to fresh PR CI.

## Read-only production metadata evidence (not adversarial execution)

Current connected Supabase project has public RLS enabled for checked `invitations`, `organization_members`, `runs`, `prompts`, `evidence_items`, `measurement_schedules`, `record_shares`, `support_tickets`, `account_deletion_requests`, `change_specifications`. This is RLS **configuration**, not proof of policy correctness.

The old org-only prompt RPC is not executable by `authenticated` or `anon`; project wrapper is executable by `authenticated`; deletion RPC is service-role only. These were confirmed through read-only `pg_proc` privileges, not a complete attack simulation.

Invitation table fields include `id` uuid, `organization_id` uuid, `email` text, `role` organization_role, `token_hash` text, `status` text, `expires_at` timestamptz, `accepted_at` timestamptz and `invited_by` uuid. Critical unique constraint: `UNIQUE(organization_id, email, status)`. This can collide with earlier accepted invitations; plan migration and retry handling accordingly. `organization_members` has primary key `(organization_id,user_id)`.

## Chat 01 mandatory integration task (schema-owned)

Replace the conditional two-call sequence with one serialized Postgres transaction and DB-verified identity, submitted as `Chat01_Atomic_Invite_SQL_Proposal.md`. Chat01 owns executable migrations, grants and release. The RPC should be privileged **only** for server-side service role and should never trust caller-supplied organization/role. Verify existing accepted-invite uniqueness and a safe invitation history strategy.

## Other owned backlog evidence and unknowns

- FM-AUD-07: Supabase generate_link + Resend route exists; duplicate signup returns a direct `409 account exists` response; failed-send retry may strand unconfirmed users. Actual configured TTL, mailbox receipt, replay and retry remain unknown.
- FM-AUD-12: local route harnesses are emulated; RLS-enabled tables and RPC permissions are read-only metadata, not an authenticated two-org/two-project real matrix.
- FM-AUD-23: owner-only export, delayed deletion and hashed deletion receipt implemented. Disposable deletion, retention policy and auth-user vs workspace-account distinction remain to verify.
- FM-AUD-31: `source-inspection.ts` validates URL/DNS/redirect/body limits, but preflight DNS is not network-level rebinding protection. Consent-gated Clarity/Contentsquare and separate privacy-limited product telemetry are implemented, not browser-traffic tested.

## Safety / no side effects

No customer data was read; metadata inspection only. No Supabase data writes, schema modifications, mail delivery, network scans, real accounts, merges or deployments. An inactive old restore project was discovered and intentionally not restored. Chat07 owns UI updates. Chat06 owns billing lifecycle. Chat04 owns decision-related permission proposal.

## Acceptance before calling COMPLETE

- Deploy **nowhere** until Chat01 integrates atomic claim+memb RPC in local/disposable Supabase and verifies credentials, fixed search_path, invoker/definer security, per-role EXECUTE grants and 2-org x 2-project matrix.
- Nonproduction mail capture for confirmation/recovery expiry, replay, retry and enumeration.
- Isolated source DNS flip/IPv4+IPv6 encoding, redirect, size/timeout tests with enforced egress.
- Browser consent deny/accept/revoke and product-telemetry payload redaction checks.
- Disposable account deletion and owner-export restore in approved isolated DB, with exact counts/retained receipt contract.
- Current SHA-matched typecheck, tests, lint, build, CI/CodeQL/browser security gates.

**No claim of finished full security acceptance is made by this branch.**