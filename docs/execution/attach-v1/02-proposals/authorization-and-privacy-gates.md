# Chat02 proposal — tenant denials, privileged RPCs, auth lifecycle, privacy

**Prepared:** 2026-10-12. **Repository baseline:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`.
**Owner:** Chat02; shared migration/DB interface decisions belong to FM-00. This is a proposal, **not** an applied migration, a production penetration test, legal approval, or a completed customer journey.

## Evidence and scope

- Original assigned source IDs: **CV-04, CV-08, CV-15, A06, A11, A12, A20**. A06/A11/A12/A20 occur in both Backlog_24 and Backlog_29; retain both source references. Available CSV index has 71 historical rows, not 71 verified defects.
- Only the seven directly attached package/manifest files were accessible; the 18 original files claimed in the checklist were **not attached**. `Foremention_Master_Backlog_28_v2.csv` is explicitly recorded missing. Do not imply that the unavailable reports were independently inspected here.
- GitHub current main has the FM-08 origin guard merged (PR #512), and FM-04/05 integration PRs #497/#498 merged. Source-only tests in `tests/a12-auth-origin-all-mutations.test.mjs`, `tests/customer-project-boundary.test.mjs`, `tests/gdpr-deletion.test.mjs`, and `tests/run-review-audit-authorization.test.mjs` are not substitutes for current authenticated denials.
- Supabase read-only metadata on 2026-10-12: 126/126 public tables and 8/8 storage tables have RLS enabled; this is **not** policy correctness or two-tenant proof. Security Advisor warns of 3 authenticated-callable `SECURITY DEFINER` functions and disabled Auth breached-password screening. 36 RLS-on/no-policy tables were INFO, not proof of an exposure; service-only tables can intentionally have no authenticated policies. Do not add policies merely to silence those notices.
- Only the `Foremention` project is active in the connected Supabase account; `Foremention Restore Drill 2026-08-14` is inactive. Do not add test tenants, mutate production identities, send messages, or use live billing to satisfy fixtures.

## P0 candidate: active-project safety of privileged SQL RPCs (A11, CV-04)

Direct read-only `pg_get_functiondef` inspection of production found:

| RPC | Current callable role | Observed isolation / open question |
|---|---|---|
| `public.create_prompt_versioned` | authenticated, not anon | `auth.uid()` + org writer role; validates `projects.id + organization_id`, `categories.organization_id`, and optional cluster project. Test direct RPC across organizations; project authorization is workspace-wide by current role design. |
| `public.review_source_map_entry` | authenticated, not anon | `auth.uid()` + org writer role; verifies published reviewed map and entry/run/project/category/source join, including `r.project_id=p_project_id`. Test direct guessed IDs, fake project/category and revoked membership. |
| `public.update_prompt_versioned` | authenticated, not anon | `auth.uid()` + org writer role; loads `prompts` using **id + organization_id only**, without a project predicate/argument. A logged-in organization analyst may invoke the REST RPC directly with the ID of a sibling project prompt, even if UI currently selects another active project. This conflicts with the package's active-project mutation contract; it is not evidence of cross-organization access. |

FM-00 + Chat04: choose whether active project is an authorization boundary within an organization or only a UI scoping state. If it is a hard boundary, add a new project-scoped RPC signature accepting `p_project_id`, verify a genuinely authorized project context and prompt's `project_id` under the same row lock, require matching organization+project on mutation/version rows, adjust the application caller, test direct authenticated REST/RPC, then revoke and retire the previous callable signature after a compatibility audit. Merely checking a client-supplied `p_project_id` against an existing row does **not** enforce the active-project cookie server-side: define a server-backed project permission or exclusively invoke the RPC from a trusted server following `loadWorkspaceContext`. Avoid altering this function on production without a versioned FM-00 migration and rollback. Existing RPCs grant intentional privileged access; do not blindly revoke them before their callers have replacements.

## Required nonproduction execution matrix (CV-04, A11)

Provision **disposable** organizations `Org A`, `Org B`, active projects `A1`, `A2`, `B1`, users `A-owner`, `A-analyst`, `A-viewer`, `B-owner`, `revoked-A`, plus an unrelated anon session. Make explicit whether one organization member may use both A projects; separately test the selected active-project contract. Use token-bound HTTP/PostgREST requests, never `service_role` as the test actor; run any service-only fixture with a separate privileged role and assert the preceding server authorization step. All fixtures must roll back or be deleted on the disposable environment.

| Subject | Approved access | Denials that must be demonstrated with actual HTTP code + persisted before/after state |
|---|---|---|
| Membership and active project | A owner selects A1/A2; B owner selects B1 | A cannot choose B1 or claim B org; revoked member cannot retain old access; bogus cookie/ID cannot select unauthorized context |
| Runs, answers, sources, reviews | A1 analyst can read/write only per designed A1 permissions | B1 guessed run/source/map and writes denied; viewer write denied; A2 wrong-current-project read/write matches approved policy |
| Recommendation Records, Change Specifications, decisions | Authorized A1 role saves/reviews/decides its A1 record | Cross-org and cross-project guessed IDs fail through direct API, joins, RPC and export |
| Exports and integration credentials | A1 export uses A1 integration and scoped records | No sibling project's rows or Google Sheets credentials; no org-wide fallback; HTML/ZIP/download links are authorization-gated |
| Jobs, retries, notifications | Actor can operate allowed A1 job | Cannot cancel/retry/trigger guessed B1 IDs; worker proves server ownership before service-role write; URLs cannot drive private egress |
| Billing, entitlements, customer portal | A sees A's own entitlement and portal | B org invoice/checkout/portal/event IDs denied; webhook signature + durable server reconciliation required; no unsigned redirect entitlement |
| Authentication and lifecycle | New signup/verify/recover/relogin, session expiry, invite role, project switch, sign-out | Expired/revoked user denied after invalidation; recovery-only token cannot bypass normal authorization; failed verification does not create login; hostile Origin/redirect denied before side effects |
| Deletion and retention | Reauthenticated owner: request → 7-day wait → second confirmation → scoped receipt | Viewer, revoked member, other-tenant request, early execution, guessing receipt/organization, replay and cancellation races denied |

For each cell log: exact schema/migration SHA, API commit, role/JWT identity pseudonym, organization/project pseudonym, HTTP method, expected vs actual code, affected row count, table/RPC authorization result, and network/log absence of sensitive fields. A 200 with zero rows requires explicit design review; no row returned is not automatically a denial. Do not synthesize a GREEN result from mocks.

## Auth/browser controls (CV-08, A12)

Chat02 branch hardens `lib/request-security.ts` to reject malformed explicit `Origin`, a forged Referer fallback after any supplied invalid `Origin`, and explicit `sec-fetch-site: cross-site`. Valid configured origin, Cloudflare worker runtime URL, and same-origin Referer fallback remain accepted by local regression. No auth secrets, sessions, customers, or production URLs were called during local test. Browser/integration checks and Cloudflare headers still need exact-head CI.

Scope new acceptance of supported flows: signup email confirmation, verification callback, password reset purpose/15-minute cookie boundary, replay, sign-out local versus global revocation, expired refresh, invitations/role downgrade, project switch, invalid `next`, Google SSO state/nonce, direct and forwarded host/origin, 320px accessible error messaging. Coordinate UI with Chat05 rather than editing public/feature files.

## Authentication secret historical item (A06)

GitHub issue #323 was **closed 2026-10-12**, with owner comments reporting the active synthetic user's password rotated using maintenance run `38229264836`, old acceptance sessions revoked, stale user banned, temporary hash artifact deleted, and temporary token/secret retired in #546. New-secret browser acceptance run `38230159562` was reported green against production `0e25c8d...`. These are issue/run **records**, not this Chat02's independent secret inspection or a green test at the Chat02 branch head. Avoid creating, retrieving or outputting credentials. Confirm residual old URL/access logs and retention/redaction via restricted owner process if still applicable, with an incident-ticket closure receipt; do not reopen issue by claiming unchanged historical state.

## Privacy/data/contract review (CV-15, A20)

Public `/privacy`, `/subprocessors`, and `/trust` explicitly distinguish active from optional processors and avoid certification claims. This is useful copy discipline, **not** proof that contractual records exist. The disclosure identifies Cloudflare, Supabase Seoul, Inngest, Resend, Workers AI, configuration-dependent Paddle/Groq, US PostHog, optional Clarity/Contentsquare, and notes unverified authentication relay/Sentry activation. Require a per-processor **actual configuration + purpose + data categories + transfer location + subprocessors + DPA + retention + opt-out/consent state + deletion/backup cycle + incident channel** record signed off by the appropriate owner. Cross-check live configuration; do not assume the marketing list proves activation. For each connected integration, prove revocation and token/key deletion, audit retained data, third-party retention limitations and pending jobs. Retention windows/backups and billing/legal holds need counsel-reviewed policy; never promise immediate physical deletion of every backup when unverified.

Legal/company/merchant questions needing real records/qualified review: registered contracting entity and authorized signatory; jurisdiction/privacy notice and customer data-controller/processor roles; IP and third-party code/license ownership; employee/contractor assignment agreements; contract terms, DPA, subprocessor notices, breach contact; international transfer arrangements and database region; merchant-of-record eligibility and payouts; refund/cancellation/data retention on termination. No conclusion or certification is given here.

## Integration gates and rollback

FM-00 must review proposed SQL and assign owning Chat04/03/06 changes before integration; Chat09 owns independent acceptance. Require current exact-head tests, isolated two-tenant HTTP/SQL denial receipts, safe account lifecycle, security advisory disposition, lint/typecheck/build, CI and nonproduction migration replay. Chat02 guard patch rollback is a revert of `lib/request-security.ts` change on its isolated branch; RLS/function edits are **not** in this PR and require separately planned database forward/rollback migration. No main merge or live deployment is authorized by this document.
