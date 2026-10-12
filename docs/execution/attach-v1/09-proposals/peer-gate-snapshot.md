# Chat09 — exact-ref peer gate inspection (2026-10-12)

**Decision: COMPOSED ACCEPTANCE BLOCKED; Chat09 standalone source/CI baseline GREEN.** FM-00 controls integration, migrations and shared CI. Review [Chat09 draft PR #564](https://github.com/injamhaqq/foremention/pull/564) and [coordinator PR #562](https://github.com/injamhaqq/foremention/pull/562). All ten candidate branch refs descend from starting main `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`; no changes to main were performed here.

| Packet | PR | Exact examined HEAD | Exact-head CI | Independent role finding |
|---|---|---|---|---|
| FM-00 | [#562](https://github.com/injamhaqq/foremention/pull/562) | `2aa0c3356e06f94b7cbb9d240cf61dcb8cad4410` | SUCCESS | Coordinator status says no composite release candidate yet |
| 01 | [#565](https://github.com/injamhaqq/foremention/pull/565) | `6d0c56a7c1e2aeda4b675941022f6241b7b22554` | IN PROGRESS at inspection | Measurement providers / relevance / cost needs composed contract receipt |
| 02 | [#567](https://github.com/injamhaqq/foremention/pull/567) | `781a699ee14cbba28baa8965a566c22fa9eddad0` | SUCCESS | Source guard improved; direct two-tenant RLS still not proved |
| 03 | [#566](https://github.com/injamhaqq/foremention/pull/566) | `1efcd592945ace7f3af1d7332253da4fd7d7bea9` | **FAIL** | Paddle existing source contract does not recognize delegated subscription/customer identity guard. Billing Provider Contract SUCCESS does not override CI failure |
| 04 | [#563](https://github.com/injamhaqq/foremention/pull/563) | `f34620b4e7eea6c066bf21a1cc4e7ddb2df26f9a` | **FAIL** | Lint `react-hooks/set-state-in-effect` (see below); 1320 tests passed |
| 05 | [#569](https://github.com/injamhaqq/foremention/pull/569) | `5359b753db6c416ee154e57f43e03d5da6d71017` | **FAIL** | Approved hero-source/copy assertions and intake-failure contract mismatch |
| 06 | [#570](https://github.com/injamhaqq/foremention/pull/570) | `327289c4305934034341994c0639014f6567edcc` | SUCCESS | Requires live idempotent delivery/recovery proof (not attained) |
| 07 | [#568](https://github.com/injamhaqq/foremention/pull/568) | `adbc49de9574810680bf51a700ce4c06fb5424ae` | SUCCESS | Proposal/repository register only; no new library adoption |
| 08 | [#571](https://github.com/injamhaqq/foremention/pull/571) | `50d64a93392268f859f3c84e0bb04f79cf1f5f75` | SUCCESS | Read-only commercial proof evaluator; no real traction |
| 09 | [#564](https://github.com/injamhaqq/foremention/pull/564) | `9e8c14d2e7335c89a7e14938b4ff559dc70e9a50` | SUCCESS | Isolated regression fixtures/matrix only; pending peer composition |

These SHA/results are *point-in-time* facts. Re-query branch/PR HEAD and Actions before reuse. Compare `main...each head` yielded **zero direct overlapping modified filenames** among ten branches; logical provider/onboarding/auth and shared schema integrations still require composite acceptance.

## Reproducible failed peer gates; owner comments posted

1. **Chat03** — [CI run 38273586543](https://github.com/injamhaqq/foremention/actions/runs/38273586543); `Run tests`: 1319 pass / 1 fail. `tests/paddle-checkout-reservation-contract.test.mjs:72` still expects direct `rows[0].external_customer_id === parsed.externalCustomerId`; code delegates uniqueness/org/customer/subscription matching to `paddleSubscriptionIdentityMatches`. Preserve complete negative invariants in helper-level tests; update caller/source contract without weakening admission. Owner informed on PR #566.
2. **Chat04** — [CI run 38274493514](https://github.com/injamhaqq/foremention/actions/runs/38274493514); 1320/1320 tests pass, lint fails at `components/retention-surface-bridge.tsx:77:5` for synchronous `setEligibility("checking")` inside effect. Refactor pending/retry to satisfy React hook lint while retaining fail-closed record actions. Owner informed on PR #563.
3. **Chat05** — [CI run 38273763324](https://github.com/injamhaqq/foremention/actions/runs/38273763324); 1311 pass / 9 fail. Existing approved homepage strings `Track recommendations, inspect supporting sources, and decide what to improve.` and `See where AI recommends your brand` absent from edited source in 8 contracts; `We could not verify a saved application` absent from modified contact state in another contract. Do not blindly disable tests or override founder's locked brand/copy policy; reconcile actual approved wording and evidence truth. Owner informed on PR #569.

## Chat09 exact-head positive proof and its limits

- [CI run 38273528931](https://github.com/injamhaqq/foremention/actions/runs/38273528931) succeeded on `9e8c14d…`: isolated Supabase migration reset, SQL tenant-isolation and second-cycle verification, **1319 tests / 1319 pass**, quality gate, lint, typecheck, build, Wrangler dry runs. These are disposable controlled tests and do not constitute real tenant access testing in production.
- [Isolated Authenticated Journey run 38273528855](https://github.com/injamhaqq/foremention/actions/runs/38273528855) succeeded against **LOCAL** Auth, PostgREST and Worker. Do not convert into production/customer acceptance.
- [Browser Acceptance run 38273528885](https://github.com/injamhaqq/foremention/actions/runs/38273528885) succeeded against local PR candidate. It performed **70 public page/browser observations** across Chromium desktop/laptop/tablet/mobile/narrow plus Firefox/WebKit and zoom/reflow/Lighthouse. Log explicitly says **authenticated browser routes SKIPPED because dedicated acceptance credentials were not configured.**
- [Security run 38273528939](https://github.com/injamhaqq/foremention/actions/runs/38273528939) and [CodeQL run 38273528826](https://github.com/injamhaqq/foremention/actions/runs/38273528826) succeeded.
- Live production exact-SHA mismatch previously observed on `main`: expected `6b93c88…`, production observed `b13e532…`. Subsequent successful PR acceptance did NOT deploy.

## FM-00 integration handoff, priority order

1. Owners 03/04/05 repair blockers and publish new exact HEAD + fresh full CI; 01 finish exact-head checks. No merging, force pushing peers, weakening tests or using repository-role bypass to mask a red gate.
2. FM-00 chooses source-of-truth integration base/manifest and coordinates any shared schema/CI proposals. All ten diffs disjoint at file level as observed; verify shared *semantics* (billing entitlement, approved question/provider metadata, recovery, manual/pilot state, source provenance, pricing/ICP).
3. On a composed exact HEAD: run **full** CI, SQL two-tenant/role/foreign direct-ID denial, authenticated browser flows (not SKIPPED), retrieved evidence relevance/provenance/budget, saved human decision, later reviewed truly comparable cycle, sandbox webhook dedup/out-of-order/admission, interruption/retry, export/privacy, and 320/375/768/1024/1440 accessibility. Avoid calls to paid/live vendors or changing real customer state.
4. Separate free design partner / paid pilot / self-service / 20-customer evidence. Explicitly mark absent real payment, retention, agreements, restore, provider receipts and run-capacity proof.
5. Fresh verified deploy exact SHA, production canary and emergency rollback are gates for release **after** separate authorization; no consent implied by this PR.

Source check: FM-00 located and SHA256-matched 18 original included files in its **separate archive**; Chat09 only received 7 index/control attachments. The named `Foremention_Master_Backlog_28_v2.csv` is still unavailable. This report does not claim to have read that file or reviewed FM-00's 18 originals.

### Later same-day ref updates / added QA cases

After the exact-ref table above, owners pushed **Chat01 #565 `1ccc6e86c179aa40e8dedd94e495ee591ee6196b`**, **Chat03 #566 `1b34ab87575e4962d4ebbf71d3427ee2e77b3320`** (revised source assertion preserving the shared identity helper), and **Chat04 #563 `277bd80cadd1eb6d57cb5bb6d3227ba8288b2558`** (lint refactor + export provenance), all with fresh checks still pending at their observed time. Chat05 #569 remained on the earlier failing head. Chat09 added QA09-31 (stale record-eligibility transition) and QA09-32 (CSV export formula/control-prefix injection) as new synthetic cases. Re-fetch current heads and checks before treating the earlier table as live.
