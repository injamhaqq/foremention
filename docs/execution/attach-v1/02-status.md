# Chat02 status — access, security and privacy

**Checkpoint:** 2026-10-12
**Role:** Chat02 / packet 02
**Branch:** `fm-attach-v1/02-security`
**Immutable base (main at inspection):** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`
**Source code + test commit:** `04b4519b23d8ec803ebf07a800e47ce515e7b3c2` (preceded by security helper commit `d621bd2ac647ef90bc34b68bd6fb9a413aa345f5`)
**Proposal commit before this status file:** `d65659ef813b65e6b6aba66687e8a886c0e39f8a`
**Final actual PR/branch head:** use the current GitHub PR head commit SHA, because a status file cannot include its own commit's computed SHA; do not substitute the historical code snapshot for that exact head.

## Original assigned IDs / disposition

| Original ID | Current Chat02 disposition |
|---|---|
| CV-04 | Read-only RLS audit and privileged function definitions checked. Actual two-org/two-project token-bound denial matrix **not executed**; nonproduction environment and fixture accounts unavailable. See proposal. |
| CV-08 | Checked code contracts for login/signup/verify/recovery/session cookies/project switch; no end-to-end new-account lifecycle under disposable identities. Origin hardening implemented and locally tested. |
| CV-15 | Reviewed public privacy/trust/subprocessor text; contractual entities, processor legal records, actual termination/deletion/retention and payout proofs not verified. |
| A06 | Historical issue #323 is closed after reported owner secure rotation/revocation and new-secret browser acceptance (runs 38229264836, 38230159562). This worker did not touch keys. Residual historical logs/retention review requires restricted owner evidence. |
| A11 | #497/#498 merged; #402/#409 unmerged/closed historical drafts. Production metadata shows 3 callable `SECURITY DEFINER` RPCs; `update_prompt_versioned` has no project predicate and needs FM-00 + Chat04 authorization contract decision. |
| A12 | #512 merged on main, initial report obsolete; implemented narrower strict-Origin and Fetch Metadata hardening for current code. |
| A20 | Reviewed public disclosures and retention/deletion code. Actual active processor register, retention schedules, backup purge, legal policies and user-exercised deletion are unverified. |

Both the 24-row and 29-row original CSV references for A06/A11/A12/A20 are preserved in the supplied index; CV items stem from Commercial_Backlog_18. Only 7 directly attached manifests/indexes were accessible; checklist describes 18 original source files that were not uploaded with this execution. The `Foremention_Master_Backlog_28_v2.csv` original was explicitly missing in the package manifest. No unchecked historical source was treated as direct proof.

## Changes made (branch only)

1. `lib/request-security.ts`: require a syntactically canonical http(s) Origin, do not use Referer when an explicit invalid Origin was supplied, reject `Sec-Fetch-Site: cross-site`. Keep the legitimate configured-host/worker-host flows.
2. `tests/attach02-origin-hardening.test.mjs`: five targeted groups for valid flows, conflicting fetch metadata, malformed Origin, malformed-origin fallback, and forwarded-header spoof.
3. `docs/execution/attach-v1/02-proposals/authorization-and-privacy-gates.md`: actual RLS/function findings, two-tenant nonproduction fixture plan, lifecycle/processor/IP questions, coordination and rollback.
4. This status file.

No other-owner code, DB schema/migration, CI/global build file, credentials, customer data, main, production, billing or outreach changed.

## Verification and exact coverage

- **RED:** local Node `v22.16.0` `node --experimental-strip-types --test tests/attach02-origin-hardening.test.mjs` against the fetched baseline origin-helper equivalent: **2 passed / 3 failed** groups (expected regression signal).
- **GREEN:** same five groups after patch: **5 passed / 0 failed**.
- **Compatibility:** locally reconstructed behavior assertions from existing `tests/request-security.test.mjs`: **1 passed**. Total local 6/6 groups.
- The committed helper is byte-for-byte verified locally with `git hash-object` = `ebcadd168fca0c7cdcd13389ada35316c20eb17d` (GitHub blob hash returned for this PR file). Tests were run on that exact helper; the compatibility assertions were reconstructed, not an execution of the full remote repository.
- **Not run:** full repository tests/lint/typecheck/build, browser CI, local Supabase SQL replay, authenticated tenant denial/lifecycle, actual production canary, full peer integration. Container cannot resolve github.com to clone, and only isolated source/test files were reconstructed locally. The connected GitHub account does provide branch write and PR operations.
- **Read-only connected Supabase metadata:** 126/126 public and 8/8 storage tables show RLS enabled. Security Advisor: 3 `authenticated`-callable `SECURITY DEFINER` public RPCs, disabled leaked-password-protection warning, and 36 INFO no-policy tables (may be intentionally service-only). No row contents were read or mutated; no proof of tenant denial derived from this metadata.
- Review of direct SQL definitions: `create_prompt_versioned` checks organization writer role + project/org association; `review_source_map_entry` checks org writer + joined entry/project/category/map; `update_prompt_versioned` checks org writer + prompt org only. Exact behavior and intended same-org project policy need nonproduction direct-RPC testing.

## Contracts supplied / blockers

- **Provided to FM-00:** canonical-origin code guard patch + tests; SQL RPC/project boundary decision request; nonproduction two-tenant acceptance matrix; privacy/processor/credential evidence checklist.
- **FM-00** owns migration, shared schema, CI/release and merge. **Chat04** owns prompt editing and selected-project route contract; **Chat03** billing entitlements; **Chat06** jobs; **Chat08** commercial/legal source records; **Chat09** independent acceptance. No cross-owner file was changed.
- Pending secure nonproduction environment with 2+ orgs, 3 projects, synthetic membership roles and test tokens; exact release head CI/browser compatibility; actual RLS/service-role/storage and redirection denial receipts; legally reviewed processor/IP/retention records. Production Supabase was intentionally not used for intrusive fixtures.
- Security Advisor notices are not automatic vulnerabilities; document intentional service-only exceptions and inspect privileged RPCs before altering grants.

## Rollback and next action

Revert this PR's scoped origin-helper change if an approved legitimate client flow breaks; retain original helper as base reference `695518f70118cc9fcc48d9b9b97bb851d62b2258`. No DB rollback needed: **no migration executed**.

FM-00 should review proposed RPC active-project decision; run full exact-head CI and authenticated browser checks on this draft branch; arrange a disposable nonproduction Supabase project and then execute and record the denial/lifecycle matrix. On `continue`, refresh this PR's exact head, FM-00 coordination and peer work before new implementation; do not infer post-turn background activity.


## 2026-10-12 — continuation: exact-head CI and recovery-privilege repair

**Peer refresh:** FM-00 coordination branch exists and its status says integration PENDING; Chat04's `04-status.md` and Chat09's `09-status.md` are published. All ten `fm-attach-v1/` branches are discoverable. Chat04 keeps direct prompt-edit server validation on `organization_id + project_id`; SQL `update_prompt_versioned` itself remains callable to same-org writer members without a project argument, so FM-00 must decide authorization semantics before changing shared SQL.

**Previous PR head green:** `781a699ee14cbba28baa8965a566c22fa9eddad0`, workflow runs CI `38273646486`, Browser Acceptance `38273646452`, Security `38273646591`, CodeQL `38273646776`, AI Safety/Code Health `38273646616`, Semgrep `38273646627`, Isolated Authenticated Journey `38273647978` all reported `completed/success` via GitHub Actions. This verifies that previous head only; it cannot certify this later continuation commit.

**Newly found CV-08 recovery issue:** `/api/auth/session` accepted client `recovery: true` after `/auth/v1/user` validated any ordinary bearer token, and `/api/auth/password` relied on a plain `foremention-recovery=1` cookie plus a bearer token. A recovery-only cookie/state was therefore not bound to the actual recovery authentication method. Existing CSRF/Origin and HttpOnly-cookie safeguards are separate controls and do not supply that missing purpose proof.

**Chat02 scoped repair committed before this status file at head `2572b96829f47171844f4f91710187076ef24e3e`:**
- `lib/account-security.ts` adds `hasRecentRecoveryAmrClaim`, a fail-closed **eligibility** check on an authenticated-role Supabase JWT with an unexpired token and an `amr` entry of method `recovery` within 15 minutes (30-second future clock tolerance). This parses unverified JWT bytes and MUST NOT alone authorize anything: Supabase still validates the same token on `/auth/v1/user` before session adoption and on the authenticated password PUT endpoint before mutation.
- `app/api/auth/session/route.ts` refuses client-requested recovery escalation unless the just-provider-verified bearer token carries a recent recovery AMR.
- `app/api/auth/verify/route.ts` refuses to mint a recovery cookie unless GoTrue's successful recovery verification returned a session with the recent recovery method.
- `app/api/auth/password/route.ts` refuses password updates even with a forged/plain recovery cookie unless the bearer token also has the fresh recovery AMR, and GoTrue accepts the password PUT.
- `tests/attach02-recovery-authentication.test.mjs` adds 3 groups: recent method positive, expired/ordinary/malformed negatives, and source-level route gating.
- Supabase JWT Claims Reference explicitly lists `recovery` as an `amr.method`: https://supabase.com/docs/guides/auth/jwt-fields. This supports the chosen provider claim, but an actual recovery-email->session->password end-to-end test is still necessary to confirm runtime/provider-version behavior; any missing AMR must fail closed and trigger a new recovery link, not silently downgrade checks.

**Local execution:** strict helper unit test groups under Node `v22.16.0`, `node --experimental-strip-types --test --test-name-pattern='Chat02 recovery: (only|missing)' tests/attach02-recovery-authentication.test.mjs` on an isolated copy of the **new helper**: 2 passed / 0 failed. The third route-source check was not run locally against the complete repository. The earlier RED baseline had 1 failed test module because the new helper did not exist. This is not local authenticated runtime validation.

**New continuation head CI state at observation:** Security `38277297738` and experimental Semgrep `38277297792` succeeded against `2572b968...`; CI `38277297848`, Browser Acceptance `38277297795`, CodeQL `38277297793`, AI Safety/Code Health `38277297811` and Isolated Authenticated Journey `38277297711` were still running. The status-document commit creates a later head: refresh exact-head workflow evidence before any merge/release decision. No live identity, secret, configuration, DB, migration, outbound email or production change made.

**Residual security testing:** In nonproduction, use a genuine signed Supabase password-login token, a genuine single-use password-recovery link and a post-refresh recovery token. Assert ordinary token+client `recovery=true` -> denied; manually supplied plain recovery cookie+ordinary token -> denied without password mutation; valid recovery AMR -> allowed only within the 15-minute window; expired/reused/revoked recovery -> denied. After reset, check recovery cookie cleared, new password login works, and rejected attempts leave password unchanged. Cover both implicit-fragment and `token_hash` recovery links with the Supabase Auth configuration actually deployed. Never use active customer identities for these tests. These receipts remain **PENDING**.
