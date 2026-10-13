# Chat02 status — access, security and privacy

**Checkpoint:** 2026-10-13 (IST), continuation of the 2026-10-12 checkpoint (not a restart)
**Role:** Chat02 / packet 02 — auth/session/origin/security helpers, tenant/role review, privacy/deletion
**Branch:** `fm-attach-v1/02-security` · **Draft PR:** https://github.com/injamhaqq/foremention/pull/567
**Base (main, unchanged since 2026-10-12):** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`
**Last code/test/proposal commit before this status file:** `1bedee77e525c0e95ca9d911d332a8c43b6bfd24`
**Exact head:** the PR head commit (a status file cannot contain its own SHA).

## Original IDs and disposition

| ID (sources) | Disposition at this head |
|---|---|
| **CV-04** (Commercial_Backlog_18 r4) | **Implemented local evidence; live gate open.** (a) Route-level two-org/three-project denial matrix runs the real handlers (14 tests). (b) SQL-level RLS probes on a local replay of all 97 migrations whose 215 policies are **identical to production** (10/10). Live token-bound HTTP matrix against a nonproduction Supabase project still required. |
| **CV-08** (Commercial_Backlog_18 r8) | **Fixed 4 defects** (open redirects; recovery AMR binding [2026-10-12]; invitation email-confirmation; refresh-defeated step-up) with RED→GREEN tests. Live signup/recovery/expiry E2E still requires disposable identities. |
| **CV-15** data/privacy part (Commercial_Backlog_18 r15) | Deletion step-up fixed and deletion lifecycle denials tested locally. Contract/IP/payout/processor records remain founder/counsel items (no compliance claim). |
| **A06** (Backlog_24 r6, Backlog_29 r6) | #323 and #546 **closed** (owner records, not independently verified). No secret values in working tree by pattern scan. Owner log-retention confirmation outstanding. |
| **A11** (Backlog_24 r11, Backlog_29 r11) | #497/#498 merged; #402/#409 closed unmerged. Sibling-project prompt edit via `update_prompt_versioned` **reproduced in SQL**; tested project-scoped RPC proposal for FM-00. Project is not an RLS boundary anywhere (product decision). |
| **A12** (Backlog_24 r12, Backlog_29 r12) | #512 merged (login guard present). Strict Origin/Fetch-Metadata hardening [2026-10-12] + hostile-origin-before-DB test across 10 mutations [2026-10-13]. |
| **A20** (Backlog_24 r20, Backlog_29 r20) | Verified the retrieval disclosure gap: buyer questions go to Bing public RSS or Brave Search; neither is on `/subprocessors`. Copy/terms proposal; legal review required. |

Source boundary: only the package index/checklist/rules were attached; the 18 original source files were **not** available to this worker, and `Foremention_Master_Backlog_28_v2.csv` is declared missing. Work is from the index rows, current code, FOREMENTION_STATE/AGENTS/CLAUDE, PRs and read-only production metadata.

## Changes on this branch (all commits since base)

2026-10-12 (prior checkpoint): `lib/request-security.ts` strict Origin + Fetch Metadata; `lib/account-security.ts` `hasRecentRecoveryAmrClaim`; recovery AMR enforced in `app/api/auth/{session,verify,password}/route.ts`; tests `attach02-origin-hardening`, `attach02-recovery-authentication`.

2026-10-13 (this continuation):
1. `e1689b31` **open redirect fix (CV-08/A12)** — `lib/google-auth.ts` `safeAuthNext` returned `//evil.example` for `/.//evil.example` (dot-segment normalization), which `/api/auth/refresh`, `/api/auth/google` and the post-verification `components/auth-callback.tsx` then navigated to cross-origin; SSO `safeNext` accepted `/\evil.example`. Now rejects control chars/backslashes, scheme-relative normalized paths and overlong values; new `safeAbsoluteAuthNext` for SSO. Test: `tests/attach02-auth-redirect-safety.test.mjs` (RED 4/6 on base helper → GREEN 6/6).
2. `6f3bdbc3` **deletion step-up fix (CV-15/CV-08)** — `isRecentAccessToken` used `iat`, which every silent refresh resets, so "sign in again before deletion" accepted a 30-day-old session. New `hasRecentInteractiveAuthentication` / `hasRecentStepUpAuthentication` require an interactive `amr` method (password/otp/oauth/totp/sso/saml/magiclink) within 10 min; enforced on deletion POST/PUT/DELETE. Test: `tests/attach02-step-up-authentication.test.mjs`.
3. `e6f43450` **invitation acceptance (CV-08/A11)** — `lib/auth.ts` exposes `emailVerified` (from `email_confirmed_at`); `app/api/team/invitations/accept/route.ts` refuses unconfirmed accounts and never downgrades an existing membership (an owner opening a stale viewer invite previously became viewer, which could remove the last owner).
4. `26f7f0dd`, `cbbace83` **two-tenant route matrix (CV-04/A11)** — `tests/attach02-harness.mjs` + `tests/attach02-two-tenant-denial.test.mjs`: real handlers for team members, invitation revoke/accept, project switch, run cancel (jobs), billing portal, Record share/revoke, Record CSV export, account deletion; actors A-owner/A-analyst/A-viewer/B-owner/B-analyst/revoked/invitee/anon. Each denial asserts status **and** unchanged cross-tenant state; hostile origins produce zero DB calls. `tests/attach02-ssrf-url-guard.test.mjs`: bounded SSRF fixtures + 1 `todo` (known gaps).
5. `1bedee77` proposals (below).

Not changed: migrations/shared SQL, CI/build config, other owners' files (source-inspection, billing, prompts, public pages), production, credentials.

## Tests actually run (Node v22.23.3, pnpm 10.25.0, local, at `1bedee77`)

| Command | Result |
|---|---|
| `node --experimental-strip-types --test --test-concurrency=8 tests/*.test.mjs` (full repo suite) | **1354 tests: 1353 pass, 0 fail, 1 todo** (inherited head a2e6e50d: 1324/1324) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint .` (repo lint config) | 0 errors; 14 pre-existing warnings, **none** in Chat02 files |
| RED checks | redirect tests on base helper: 4 fail; denial matrix with the three fixed files reverted: tests 4, 6, 10 fail; mutation removing the org predicate from team members → fail; removing the project predicate from run cancel → fail |
| RLS replay (`docs/execution/attach-v1/02-proposals/rls-replay`, PGlite 0.5.9, scratch dir) | migrations **97/97**; RLS probes **10/10**; proposal RPC probes **4/4** |
| SSRF guard patch proposal (applied temporarily, reverted) | todo test passes; 36/36 related tests pass |

Not run: browser/Playwright acceptance, `vinext build`, live Supabase/GoTrue/PostgREST, real email delivery, CI at this head (check PR checks), peer-composed integration.

## Read-only production metadata used (Supabase Management API; no writes, no row data, no secret values)

- Auth config (non-secret fields): autoconfirm off; redirect allow-list = foremention.com + www (no wildcard); refresh rotation on; sessions timebox/inactivity unlimited; HIBP off; captcha off; TOTP enroll on.
- `pg_policies` 215 = local replay 215, 0 diffs. Authenticated-callable SECURITY DEFINER RPCs: the same 3 locally and in production; none anon-callable. anon: SELECT on 0/126 tables. Definer-set drift: `rls_auto_enable` (prod only) vs `validate_customer_confirmed_value_evidence` (replay only).
- Migration ledger: 100 versions in production vs 97 repo files with different version stamps.

## Proposals for FM-00 (`docs/execution/attach-v1/02-proposals/`)

- `proposed-migration-update-prompt-in-project.sql` — project-bound `update_prompt_versioned_in_project`; phase-2 revoke of the old signature. Caller change belongs to Chat04 (`app/api/prompts/route.ts`).
- `rls-replay/` — reproducible replay + probes; optional FM-00 adoption as a CI job (needs PGlite as devDependency → Chat07 license check, FM-00 CI).
- `auth-configuration-and-credentials.md` — session timebox/inactivity, HIBP (plan cost), captcha; A06 owner steps.
- `ssrf-guard-ipv6-gaps.patch.md` — Chat01 owner patch for `::/96`, Teredo (dead rule due to normalization), `100::/64`.
- `authorization-and-privacy-gates.md` — nonproduction HTTP matrix, lifecycle cases, processor/IP/legal questions, A20 retrieval disclosure.
- Contracts provided: `safeAuthNext`/`safeAbsoluteAuthNext` (canonical return-path validator), `hasRecentStepUpAuthentication` (destructive actions), `Viewer.emailVerified`, `isTrustedMutationOrigin` (strict). Requested: Chat04 adopt the project-scoped RPC; Chat05 subprocessor/privacy copy; Chat01 SSRF patch + retrieval provider confirmation; Chat09 reuse `tests/attach02-harness.mjs` for composed acceptance.

## Unresolved risks / gates

1. **Live isolation unproven** — needs a disposable nonproduction Supabase project (2 orgs, 3 projects, synthetic users) for the token-bound PostgREST/RPC/Storage/HTTP matrix. Production was intentionally not used.
2. **Project is not an authorization boundary** in the database; any org member can read all org projects via PostgREST. Founder/FM-00 decision (matters for agency client-viewer use).
3. `update_prompt_versioned` sibling-project edit (A11) open until FM-00 migration + Chat04 caller.
4. ≈115 public tables covered only statically (all policies org-scoped), not row-probed.
5. Unlimited session lifetime; HIBP and captcha off (live config changes need approval).
6. Recovery and step-up depend on GoTrue `amr` claims at runtime — confirm with real recovery and password logins in nonproduction (missing AMR fails closed → user must sign in again).
7. A20: Bing/Brave retrieval undisclosed; Bing public RSS terms question; processor/DPA/retention/backup purge/IP/contracting-entity records unverified (counsel/founder).
8. A06: historical log/artifact retention confirmation is owner-only.
9. CI/browser results for this exact head pending at time of writing.

## Rollback

Each fix is an isolated commit: `e1689b31` (redirects), `6f3bdbc3` (step-up), `e6f43450` (invitations), 2026-10-12 commits (origin/recovery). Revert individually; no DB rollback needed — no migration executed, no live config changed.

## Next action on "continue"

Refresh PR #567 checks at the exact head; re-read FM-00 and Chat04/Chat09 status; if a nonproduction Supabase project exists, execute the HTTP matrix from `authorization-and-privacy-gates.md` and record receipts; otherwise keep the gate open. Do not restart the audit.
