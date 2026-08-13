# Production Inngest + exact comparison evidence — 2026-08-13

This is a dated production evidence record. It does not turn implementation, configuration, or a green-looking UI into proof. Every claim below is tied to a concrete release or durable database observation.

## Inngest runtime proof

### What is now enforced

Production `main` releases execute this sequence after the normal test/build gate:

1. wait until `https://foremention.com/api/health` reports the exact 40-character `github.sha`;
2. run the public auth-boundary smoke on that exact live release;
3. send `PUT /api/inngest` to synchronize the function set exposed by the deployed Inngest serve handler;
4. dispatch one zero-provider-cost `foremention/runtime.probe` event for that exact deployed SHA;
5. poll the service-only probe ledger until Inngest has actually executed the function and written `executed_at`.

The sync and heartbeat are required CI steps. They are not `continue-on-error`.

### Durable proof boundary

`public.runtime_service_probes` is keyed by `(service, build_commit)` and stores only:

- service (`inngest` only);
- exact 40-character build commit;
- request timestamp;
- execution timestamp;
- update timestamp.

The table contains no organization ID, user ID, prompt, answer, citation, provider response, or other customer payload. RLS is enabled; `anon` and `authenticated` have no table privileges; the service role is the intended access path.

The heartbeat function refuses malformed build SHAs and refuses to manufacture execution evidence for an event that does not already have a requested probe row.

### Failure evidence preserved during rollout

The gate was hardened from observed failures rather than assumed success:

- Release `ad88b22c77abc56e99c4ca5436601b44894b7d17`: the first probe returned HTTP 503 before any durable probe row existed. This showed that a green-looking `continue-on-error` step was not runtime proof.
- Release `285964084c87947638357aa8ccb864463c1f3271`: build resolution and event dispatch succeeded and a pending probe row existed, but `executed_at` remained null through the bounded wait. This isolated missing/stale Inngest function synchronization.
- Release `6df8eaa3e6151f5c9d4321d7f86032bc20ac643a`: the deployed function set was synchronized first; the runtime probe then executed and wrote durable execution evidence. This was the first genuine successful production execution observation.
- Release `895dd8df55ca4f77d0617490a2038481f74afa6c`: after the checks were promoted to required gates, CI correctly failed because the probe route resolved the previous release SHA from bundled `process.env` while `/api/health` reported the current release. The gate was not weakened.
- Release `6bd8decd588311f16529b1c61c91fa8a777c7e27`: the probe route was changed to read the live Cloudflare runtime binding through `cloudflare:workers`. The required exact-release → sync → execution chain passed. The durable row was requested at `2026-08-13 11:30:20.816544+00` and executed at `2026-08-13 11:30:38.570+00`, a recorded interval of `17.753` seconds.
- Release `c1521dfca2671375ed21a72d60e1e3c353e3cba8`: after exact run-comparison hardening, the full required chain passed again. The durable row was requested at `2026-08-13 11:41:59.076093+00` and executed at `2026-08-13 11:42:01.029+00`, a recorded interval of `1.953` seconds.

The repeated success on a later application release matters: the heartbeat is now a release invariant, not a one-off manual demonstration.

### Health endpoint semantics

`/api/health` remains deliberately conservative. Its Inngest field describes whether the Worker has the required Inngest configuration; the health request itself does not execute a background job and does not read the privileged service-probe ledger.

Therefore the authoritative production-execution evidence is the required release gate plus the durable `runtime_service_probes.executed_at` row for the exact deployed SHA. Do not reinterpret a configuration-only health field as either proof of execution or proof that execution has never been observed.

## Exact customer run-comparison boundary

PR #70 / runtime release `c1521dfca2671375ed21a72d60e1e3c353e3cba8` removes an older unsafe shortcut from the customer run-comparison page.

### Previous behavior removed

The old page could calculate movement for any two complete/partial workspace runs. It also:

- scanned historical answer text against the current organization/competitor list;
- presented source changes without first proving exact cross-run comparability;
- computed a synthetic confidence percentage from review coverage and citation coverage.

Those behaviors could make mutable current context or an arbitrary formula look like historical evidence.

### Current fail-closed rule

A customer may inspect two completed/partial reviewed collections, but cross-run movement is rendered only when Foremention proves all of the following:

- both different runs belong to the active organization;
- the selected Earlier run is chronologically older than the selected Later run;
- both are terminal reviewed runs (`complete` or `partial`);
- both carry methodology provenance and the methodology version is identical;
- only `review_status=verified` answer rows are admitted;
- the exact persisted `(prompt_key, prompt_text, provider, model)` matrix is identical in both directions;
- exact persisted question text and model provenance are present;
- demo collections are never treated as customer movement evidence.

If any condition fails, the UI says **Comparison withheld**, explains the reason, and calculates no cross-run delta. Each run remains inspectable as standalone evidence.

### Movement facts now used

For a proven comparable pair, the page uses only persisted reviewed facts needed for the comparison:

- explicit `brand_present=false → true` is a newly observed brand-presence event;
- explicit `brand_present=true → false` is a no-longer-observed event;
- unknown/null brand states are never converted into gains or losses;
- returned citation URLs are canonicalized before set comparison;
- verified-answer and cited-answer denominators are shown directly;
- no mutable current competitor-list text scan is used;
- no synthetic confidence percentage or causal score is calculated.

The comparison path intentionally does not fetch provider answer text or brand position because those fields are not required for this movement calculation.

### Existing production pair available for acceptance

Production currently contains one exact reviewed pair for organization `a5dc4c20-83ab-4dca-ab5e-ef11d656a048`:

- earlier run `ab06e958-f37b-4b99-b226-7c9bd1d1d618`, created `2026-07-30 16:15:13.629464+00`;
- later run `79e492c9-699e-4559-b767-c03c3c7208ce`, created `2026-08-11 16:01:38.505043+00`;
- both are `complete`;
- both use methodology `3.0`;
- both have one verified answer;
- both preserve the same buyer-question text, prompt key, provider `groq`, and exact model `groq/compound-mini`;
- both explicitly record `brand_present=false`.

Accordingly, this pair is eligible for exact source/citation observation comparison but must not show a brand-presence gain or loss.

## What this evidence does not close

This record does **not** claim that Foremention is fully production-ready or commercially validated. The following remain open unless a separate dated artifact proves them:

- disposable authenticated signup/email confirmation/login/recovery/onboarding acceptance on the deployed domain;
- destructive all-device session-revocation drill using a disposable/test account;
- backup restore drill;
- controlled production Sentry/error alert received by the responsible operator;
- one deliberately cost-capped real AI-provider collection on the current release preserving provider, exact model, spend/cost source, failures, answer, citations, Source X-Ray inspection, and human review;
- application-level cross-organization search/export acceptance and representative opportunity/action isolation fixtures;
- Supabase leaked-password protection control-plane change tracked by issue #57;
- legal/commercial approvals, customer permissions, billing-entitlement proof, and counsel-owned documents where required.

## Current runtime boundary of this snapshot

The last application runtime release proven in this record is `c1521dfca2671375ed21a72d60e1e3c353e3cba8`. A later documentation-only merge will necessarily have a different Git SHA; that does not rewrite the historical runtime evidence above. Every later `main` SHA must independently pass the exact custom-domain release gate and the required Inngest sync/execution heartbeat before CI can be green.
