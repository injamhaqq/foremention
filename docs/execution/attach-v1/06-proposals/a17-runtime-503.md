# Chat06 — A17 intermittent authenticated 503s (issue #504)

Read-only Cloudflare GraphQL Analytics (`workersInvocationsAdaptive`, script `foremention-mvp`, usage model `standard`), window 2026-10-06T00:00Z → 2026-10-13T07:30Z. Raw response kept in the run workspace, summarized here.

| invocation status | requests | CPU p50 | CPU p99 | CPU p99.9 |
|---|---:|---:|---:|---:|
| success | 44,239 | 11.2 ms | 138.9 ms | 208.5 ms |
| clientDisconnected | 1,949 | 7.6 ms | 73.3 ms | 124.4 ms |
| scriptThrewException | 5 (2026-10-08) | 7.9 ms | 14.7 ms | — |
| exceededResources | 2 (2026-10-10) | 10.0 ms | 15.1 ms | — |

Per-day errors: 10-08: 5, 10-10: 2, all other days 0 (46,195 invocations total).

## Finding

- The two `exceededResources` invocations are Cloudflare error 1102 ("Worker exceeded resource limits"), served to the client as a 5xx — consistent with the #504 mobile 503s and with the Workers Free **10 ms CPU** limit (developers.cloudflare.com/workers/platform/limits, read 2026-10-13: Free 10 ms; Paid 30 s default up to 5 min; isolates have "built-in flexibility" for infrequent overruns).
- **Bounded incidence (not a forecast):** 2 / 46,195 = 0.004% resource-limit failures; 7 / 46,195 = 0.015% all invocation errors in 7 days.
- **Cause class:** CPU budget, not database or provider latency (network wait does not count as CPU). Median successful request already uses 11.2 ms CPU and p99 139 ms, so the app relies on burst tolerance; failures will scale with authenticated, server-rendered traffic.
- A successful retry does **not** resolve the cause: the same request can exceed the budget again under a colder isolate.
- **Data-loss boundary:** a 1102 kills the invocation before the handler returns. For mutation routes, the existing idempotency keys (`/api/runs` requires `Idempotency-Key`; run/event ids are deterministic) mean a client retry does not duplicate a run. Routes without idempotency keys (form posts) may need resubmission; #554 improved the client error state, not the cause.

## Not established (gates)

- Which routes exceed CPU: needs Workers Logs / Tail (per-invocation `cpuTime` with path) — not available via the read-only analytics dataset used; the HTTP status dimension is also unavailable on that dataset.
- The plan of record (Free vs Paid) could not be read (subscriptions endpoint denied to this token); inferred Free from the 10 ms-centred failures.
- No load reproduction was run against production (intrusive testing not authorized).

## Options (owner decision)

1. **Workers Paid ($5/month base per Cloudflare pricing; verify)** — removes the 10 ms ceiling; cheapest reliable fix. Founder spend approval required.
2. Reduce CPU on hot authenticated routes (profile with `wrangler dev` + DevTools CPU profile; cache session verification; avoid large JSON parse/serialize in SSR). Owner: Chat05/Chat02 for their routes.
3. Keep Free and accept a bounded rate; add a client retry for idempotent GETs only (never auto-retry non-idempotent POSTs).

Acceptance to close A17: per-route CPU distribution from Workers Logs after the chosen option, 7-day `exceededResources` = 0 (or a documented accepted rate), and the authenticated 470/375/320 px journey repeated on the exact production SHA (Chat09).
