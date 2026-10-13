# FM-00 composition receipt — 2026-10-13 (IST)

**Integration branch:** `fm-attach-v1/00-coordinator` (draft PR #562). **Canonical base:** `main@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (re-fetched 2026-10-13; unchanged since 2026-10-12). Production is **not** on main: workflow logs show deployed `b13e5327` (13 commits behind main). Nothing here is deployed.

## 1. Worker heads composed (all re-fetched and matched the expected SHAs before merging)

Merged with `git merge --no-ff` in interface-provider order (providers first, consumers next, independent QA last). **0 textual conflicts. 0 changed paths shared by two workers** (checked pairwise over `git diff --name-only main...head`). No worker touched `package.json`, `pnpm-lock.yaml`, `.github/` or `supabase/migrations/`.

| Order | Packet | Draft PR | Exact head composed | Merge commit on 00 |
|---|---|---|---|---|
| 1 | 01 measurement | #565 | `92805b04decd80adf776dbae88a69963adfb669b` | see `git log --merges` |
| 2 | 02 security | #567 | `56d6591c301a5eca917aa1456de7879ea2d9455f` | 〃 |
| 3 | 03 billing | #566 | `22f70e9f0dc1091bc845f93e00dacd3975e89054` | 〃 |
| 4 | 06 operations | #570 | `aaecbffdd35431ef54a5b5e6609af37a0e5426bd` | 〃 |
| 5 | 04 workflow | #563 | `2af90b3c4899fc433bb0b317d341134d7a75f571` | 〃 |
| 6 | 05 website/UX | #569 | `d06061cdb751ce11a6a5126cd82ed262dd3c5987` | 〃 |
| 7 | 07 repository choices | #568 | `28fceca3cf8f776b0fc1cbf8ae82020f569cdee1` | 〃 |
| 8 | 08 commercial/finance | #571 | `2a4eaaed688fa1002d3d0b69132d8e84600f0334` | 〃 |
| 9 | 09 independent QA | #564 | `fc110af39cab8a435b99e443863452024d7500ab` | `29fe52fe` |

Held back: nothing at the worker-head level; every head is included as delivered. Held-back **proposals** are listed in §3.

## 2. FM-00 changes on top of the composition (reviewed proposals only)

| Commit | Change | Source proposal | Why sound |
|---|---|---|---|
| `858200fe` | `supabase/migrations/20261013090000_billing_checkout_reservation_settlement.sql` | Chat03 `03-proposals/migrations/…settlement.sql` @22f70e9f | **Required by composed code**: `app/api/billing/webhook/route.ts` and `app/api/billing/checkout/reconcile/route.ts` call `rpc/settle_…` / `rpc/release_paddle_checkout_reservation`. Fixes main defect (one unresolved reservation per org forever ⇒ second checkout 409). Additive: two `security definer` functions, `service_role` only, never touch `organization_entitlements`. |
| `858200fe` | `supabase/migrations/20261013100000_update_prompt_versioned_in_project.sql` | Chat02 `02-proposals/proposed-migration-update-prompt-in-project.sql` @56d6591c | A11: project-bound wrapper over `update_prompt_versioned` (row lock, project+org+active-project check, then existing role/versioning/audit). Additive; old signature untouched (phase-2 revoke is a later migration after the Chat04 caller moves). |
| `5425d1ee` | `lib/source-inspection.ts` + `tests/attach02-ssrf-url-guard.test.mjs` (todo → real test) | Chat02 `02-proposals/ssrf-guard-ipv6-gaps.patch.md` (file owner Chat01) | Blocks IPv4-compatible `::/96`, Teredo `2001:0::/32` (old rule compared the never-serialised `2001:0000:` form) and discard `100::/64`. Public IPv6 (e.g. `2001:4860::`) unaffected. 14/14 SSRF + source-inspection tests. |

## 3. Proposals reviewed and held back

| Proposal | Verdict | Reason / reopening condition |
|---|---|---|
| Chat08 `08-proposals/migrations/20261013120000_chat08_commercial_proof_fields.proposal.sql` | **Sound but held back** (scratch probe 17/17 on the 99-migration replay) | No composed code consumes it; it drops/re-adds `commercial_event_type_check` on production, whose constraint text/version lineage differs from the repo (06 ledger: 31 unmatched production rows). Reopen when (a) founder decides commercial evidence is recorded in the production DB, (b) recovery point exists, (c) production constraint name/text is verified read-only. |
| Chat04 zero-question `setup_only`, decision `save_key`, `question_set_version`, nine-field comparable context | **Not adoptable** — specified only as prose (`04-proposals/shared-contracts.md`), no SQL/caller | Owner must deliver SQL + caller + tests; FM-00 then replays. Tracked as blockers CV-05/A15 and A14/A28 gates. |
| Chat01 usage-ledger / provenance persistence (`01-proposals/*.md`) | Not adoptable yet — design docs, no SQL | Same as above. |
| Chat03 `live-pay-csp.patch.md`, `offer-299-proposal.md` | Held | Live-billing / pricing changes are outside this package (founder decisions 3/4). |
| Chat06 customer-confirmed-value drift fix, `run_status=interrupted`, email claim/settle RPC | Held | Production migrations require a recovery point first; email RPC has no SQL yet. |
| Chat02 phase-2 revoke of `update_prompt_versioned(…)` from `authenticated` | Held | Only after Chat04 caller ships and a compatibility audit shows no direct callers. |
| Adding PGlite as a repo devDependency | Not adopted | CI already replays migrations on Supabase-local Postgres; PGlite stays a scratch tool outside the lockfile. |

## 4. Migration validation (disposable, outside the lockfile, never production)

Scratch: `/workspace/work/pkg00-scratch/pglite` with `@electric-sql/pglite@0.5.9` (npm, not in repo), Chat02 replay harness (`02-proposals/rls-replay/replay.mjs`, Supabase auth/role shim).

| Check | Result |
|---|---|
| Replay all migrations on `main@6b93c88` | **97/97 applied** |
| Replay all migrations on the composed tree | **99/99 applied** |
| Chat02 two-tenant RLS probe on composed replay | **10/10** (still documents A11 on the org-only RPC — expected until the caller moves) |
| Adopted A11 migration probe (sibling-project reject, cross-org reject ×2, own-project allowed, not anon-executable) | **4/4** |
| Chat03 reservation settlement probe pointed at the adopted migration path | **8/8** (defect reproduced on main, settle/release idempotent, wrong evidence rejected, `uncertain` stays for operator, not `authenticated`-executable) |
| Chat03 capacity admission probe | **5/5** |
| Chat08 held-back proposal on composed replay | 17/17 (not adopted, §3) |
| Authenticated-callable SECURITY DEFINER set after composition | `create_prompt_versioned`, `review_source_map_entry`, `update_prompt_versioned`, `update_prompt_versioned_in_project` (new); settle/release are service_role only |

Fidelity limits: PGlite 0.5.9 is Postgres 18 with a shim; production is Postgres 17.6 (06 evidence); CI replays on Supabase-local Postgres 15 (`supabase/config.toml`). A Postgres-17 replay on a disposable Supabase project is still required before any production migration.

## 5. Composed gates (local, Node v22.23.3, pnpm, lockfile unchanged)

| Gate | Result at `5425d1ee` |
|---|---|
| `pnpm test` (`node --experimental-strip-types --test tests/*.test.mjs`) | **1530 tests: 1530 pass / 0 fail / 0 todo / 0 skipped** (Chat09's dry-run had 1529 pass + 1 todo; the todo is now a passing test) |
| `pnpm typecheck` | pass (exit 0) |
| `pnpm lint` | pass — 0 errors, 11 warnings (pre-existing files) |
| `pnpm build` (`vinext build` + worker config) | Build complete, exit 0 |

CI on GitHub: see `00-status.md` §Gates for the run IDs and conclusions at the exact pushed head.

## 6. Rebuild — 2026-10-13 ~19:00 IST (new 01 / 04 / 06 heads)

Base unchanged: `main@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (re-fetched). Resumed from `327237d6` (not restarted). All ten `fm-attach-v1/*` heads re-fetched and matched the handoff SHAs.

| Packet | PR | New head composed (`--no-ff`) | Merge commit | What changed vs the previously composed head |
|---|---|---|---|---|
| 01 measurement | #565 | `3db135ade5726d4b7a30c0984441577d87011857` | `94815ebe` | Adopts the FM-00/Chat02 IPv6 SSRF guard byte-identical to `5425d1ee` (no new hunk on 00; adds `tests/fm01-ssrf-ipv6-guard.test.mjs`) |
| 04 workflow | #563 | `69a8e053934398436ddc36a9267a84ce6e4dfb94` (code `3ea2d0a3`) | `b9c75fad` | A11 caller on `update_prompt_versioned_in_project`; CV-05/A15 decision-persistence SQL proposal + callers (`app/api/records/[id]/decision`, `lib/record-decisions.ts`, `lib/customer-value-loop-snapshot.ts`) |
| 06 operations | #570 | `99a0d9c766723e7767d507cff20a6ab2ca0c672a` | `68f1c867` | CV-12 email delivery claim/settle SQL proposal + flag-gated caller (`FOREMENTION_EMAIL_DELIVERY_LEASE`, unset) |

0 conflicts. 02/03/05/07/08/09 heads unchanged and already composed.

**Adopted by FM-00 in `2e318adc` (byte-identical copies, pinned by `tests/fm00-adopted-migrations.test.mjs`):**
- `supabase/migrations/20261013140000_chat04_customer_value_loop_persistence.sql` ← `04-proposals/migrations/…proposal.sql`
- `supabase/migrations/20261013150000_chat06_email_delivery_claim_settle.sql` ← `06-proposals/migrations/…proposal.sql` (lease caller stays **flag-off**)
- Test edit: Chat04's adoption tripwire in `tests/attach-v1-04-a11-cv05-persistence.test.mjs` asserted the migration was *absent*; it now asserts at most one adopted copy, at the README path, byte-identical to the proposal. Chat04 should mirror this on its branch.

**Still held back:** Chat08 `20261013120000_chat08_commercial_proof_fields.proposal.sql` (§3 reasons unchanged); Chat02 phase-2 revoke of the org-only `update_prompt_versioned`; live-pay CSP / offer changes.

**Disposable PGlite 0.5.9 replay** (scratch dir outside the repo and lockfile; never production):

| Check | Result |
|---|---|
| All migrations on the rebuilt tree | **101/101** |
| Chat02 two-tenant RLS probe | **10/10** (probe 9 still reproduces the A11 SQL-level finding on the legacy org-only RPC — expected until phase-2 revoke) |
| Chat04 probe, composed tree minus 04 file + adopted file as proposal | **100/100 + 17/17** |
| Chat06 probe, composed tree minus 06 file + adopted file as proposal | **100/100 + 21/21** |
| Authenticated-callable SECURITY DEFINER set | adds `save_record_decision`, `complete_record_decision_action`; the three email RPCs are service_role-only |

**Local gates at `2e318adc`** (Node v22.23.3, lockfile unchanged): tests **1560/1560 pass, 0 fail, 0 todo, 0 skipped**; `tsc --noEmit` exit 0; `eslint .` 0 errors / 11 pre-existing warnings (none in changed files; run with `--cache` because the uncached run exceeds the sandbox's 120 s limit); `npm run build` complete, exit 0.
