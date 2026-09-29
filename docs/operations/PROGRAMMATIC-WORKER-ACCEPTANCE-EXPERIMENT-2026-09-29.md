# Isolated programmatic Worker experiment — 29 September 2026

**Status, 29 September 2026:** Experimental PR #362 was tested at exact SHA `45e9a737a01f28b138e2a69802d15580a89252d6` and **merged into PR #358's staging branch only** as merge commit `209ab62a8d3931391a35b84f28bd81b08fef9acc`. It remains **unmerged into `main` and unshipped**.

## Root observation

The original combined full Chromium/browser CI (#358, issue #334) sometimes fails before onboarding with localhost Worker HTTP 503, and sometimes reaches a reviewed/persisted complete follow-up but times out on the **first** post-review/final `GET /api/resolutions` even though internal fixed-stage markers reach `loaded`. Health probes and disposable local GoTrue/PostgREST continue to return 200. A repeat response is **never** accepted as first-attempt success.

Separate mandatory signed-in persisted context and Owner Outcome Ledger/print tests have passed on exact integrated code. A real native HTTP 14-stage customer API journey passed once but was not repeatable via `wrangler dev`. These proofs do not automatically establish a unified, production-representative end-to-end flow.

## Independent experiment

Test the **compiled** `pnpm build` Vinext/Cloudflare Worker using the officially documented `createTestHarness` API with the same disposable local Supabase reset, randomly generated local users, local signed JWTs and genuine application review, approval, execution, follow-up and cross-tenant assertions.

The test harness cannot emulate the remote Workers AI model binding without live Cloudflare credentials. The test creates an ephemeral copy of generated `dist/server/wrangler.json` with **only** the optional `ai` binding removed. It neither modifies the source production config nor replaces the compiled module, assets, D1 or real local database. No route in the acceptance script calls any AI/search provider.

The initial HTTP-facing `harness.fetch` experiment returned a synthetic 500 on the first invalid onboarding payload even though the first `/api/health` check and three synthetic local sign-ins worked. Its fixed-stage diagnostic reported zero captured Worker log events for that failed request; do not misattribute this to a customer code bug or claim that the proxy problem is solved.

The second experiment dispatches app-origin requests through `harness.getWorker().fetch()`, the **direct WorkerHandle** documented by Cloudflare, while nonapp local GoTrue/PostgREST requests still use native Node fetch. It preserves the one-attempt 75-second deadline and does not retry or convert post-failure diagnostic responses into passing acceptance. Only allowlisted stage labels, status codes and opaque categories may be printed. Raw logs, request bodies, JWTs and local keys are never logged.

**Verified result:** The direct compiled-Worker 14-stage authenticated API test passed on experimental PR #362 and on integrated PR #358. The expanded required **Isolated Unified Worker Proof** further passed on exact integrated SHA `a0f15054f6fdef8b4a06ea43e500165429a7f953` with an API-owned Change Specification/executed asset, positive owner Ledger/board, unrelated-tenant denial, anonymous redirect, and both reports withholding eligibility after a single stored `evaluationVersion` drift. That exact integrated SHA had **nine** successful required workflows and two explicitly **skipped** legacy opt-in suites. These immutable results apply to the named SHA; rerun gates on later heads. The unmerged staging branch is *formal-code-review capable*, not production accepted.

**Remaining gap:** These checks dispatch HTTP requests directly through compiled Workerd and inspect the resulting real server-rendered reports, but they do not drive the separate full Chromium click-through flow against production-representative staging. The historical local `wrangler dev` 503/transport failures remain an unresolved diagnostic path, not a reason to weaken first-attempt assertions. Issue #334 retains the staging acceptance and rollback proof requirement.

## Acceptance and cleanup

- PASS only when the first real invalid onboarding request returns 400, the original exact signed-in manager/analyst/reviewer API steps finish, the second persisted comparable cycle is demonstrably complete, and another tenant cannot read the record.
- Keep the standalone real authenticated signed-in Outcome Ledger/board positive and one-field drift negative checks separate; their green result does not automatically prove the unified chain.
- Fail if any real app request returns an unexpected HTTP 5xx or times out. Do not weaken production request-security checks just to green a localhost test.
- Never access production Supabase or use pre-rotation #323 browser secrets; test against disposable `supabase start` and explicit loopback URLs only.
- Privately remove ephemeral test keys and full worker logs; keep public evidence at the level of immutable commit IDs, bounded test stage names and summarized failures.
- Even if this experiment passes, retain owner release hard gates for credential revocation (#323), commercial source rights (#346), migration provenance/backup/staging restore (#332/#354), database comparator (#351/#352) and exact full production-representative authenticated release proof (#334).
