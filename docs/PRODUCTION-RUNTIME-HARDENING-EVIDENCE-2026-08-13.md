# Foremention production runtime-hardening evidence — 2026-08-13

This is a dated production evidence snapshot. It records what was proven for the runtime code release `25e0cb2187233fdab56f0c4faeff276a2ae35299`; it is not a promise that this SHA remains the repository head after later documentation-only or product changes.

## Exact release provenance

- Runtime code release: `25e0cb2187233fdab56f0c4faeff276a2ae35299`.
- GitHub Actions main CI run: `31685619177`.
- The main verification job passed dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry-run, verified-build archive, and `Verify exact Cloudflare production release`.
- The exact-release step queried `https://foremention.com/api/health` through the production smoke runner and completed only after `buildCommit` matched the full Git SHA.
- Cloudflare Workers Builds completed production Build ID `9857ae38-20af-4b93-8136-474655e494f3` for Worker `foremention-mvp` with Version ID `32fdbd0f-ec13-4462-97df-9525320f2ae0`.
- Deployment ownership is explicit: Cloudflare Workers Builds deploys `main`; GitHub Actions verifies/builds/archives and then checks exact custom-domain convergence. A GitHub artifact upload is not described as a deployment.

## Evidence → Opportunity → Resolution bridge

The customer evidence chain now has a deterministic bridge from a human-reviewed Source Map gap into Resolution Center.

- A Source Map entry is promoted to a persisted opportunity only when the reviewer records the client brand as absent and both influence and feasibility are no longer `unknown`.
- The persisted bridge opportunity is scoped to the authenticated workspace's resolved organization and project.
- The bridge deliberately does not create or expose a new opaque `/100` score. Legacy influence/feasibility numeric fields stay at neutral zero for this path.
- When later review shows the brand is present, or review completeness no longer supports action, the bridge opportunity is archived rather than left as a stale recommendation.
- Route-specific/manual opportunity records are not overwritten; the deterministic Source Map bridge manages only `source_route_id IS NULL` rows.
- Source review audit state records the opportunity synchronization result.
- The customer UI surfaces the next step only after the bridge is actionable: `Open Resolution Center →`.

### Concurrency boundary

Production migration `reviewed_opportunity_bridge_unique` adds a partial unique index on `(project_id, source_id) WHERE source_route_id IS NULL`. This closes the PostgreSQL `NULL` uniqueness gap that could otherwise allow two simultaneous reviews to create duplicate route-less bridge opportunities.

Production had zero persisted opportunities when this migration was introduced, so no customer action history was rewritten or deduplicated.

## Resolution remeasurement comparability

Production migration `resolution_exact_comparability` strengthens the database-authoritative follow-up trigger before a before/after result can be calculated.

A terminal comparable follow-up now requires:

- the same non-empty `methodology_version`;
- reviewed answer rows on both baseline and follow-up;
- non-empty persisted `prompt_key`, exact `prompt_text`, provider, and exact model for every compared answer; and
- an exact symmetric match of the distinct `(prompt_key, prompt_text, provider, model)` matrix across both runs.

If the boundary cannot be proven, the durable follow-up becomes `incomparable`. Foremention keeps the observations but does not calculate before/after deltas. When the boundary is proven, the outcome still states that the result is an observed association and does not establish that the applied resolution caused the change.

Production verification after migration confirmed the installed function contains the methodology-equality check, reviewed-answer requirement, exact question/provider/model matrix, `incomparable` fallback, and non-causal outcome language.

Production had zero resolution follow-up rows when this rule was introduced, so no historical outcome was reclassified.

## Historical evidence provenance in Resolution Center

Production migration `resolution_evidence_snapshot_provenance` makes the database, not caller-supplied JSON, authoritative for durable resolution evidence snapshots.

For a reviewed source observation, the durable snapshot is rebuilt from persisted historical rows and includes:

- source title and canonical URL;
- observation date;
- provider;
- exact model;
- the exact persisted `run_answers.prompt_text` collected for that answer;
- a bounded answer excerpt;
- run ID; and
- verified review state.

The observation must belong to the same opportunity source and project, and the persisted historical question/provider/model provenance must be present. Verified evidence-item snapshots are likewise rebuilt from their verified database row and require a source URL, usage-rights record, and a non-expired evidence item.

The installed production function was independently checked after migration and remains `SECURITY INVOKER`; historical question, provider, model, run ID, and verified evidence-item fields are canonicalized server-side.

Production had zero resolution assets when this boundary was introduced, so there was no customer proposal snapshot to rewrite.

## Single historical proposal baseline

Resolution generation now aligns the API path with the database provenance boundary.

- The newest eligible reviewed run is selected as the single `baseline_run_id` for the proposal.
- Source-observation evidence used to construct that proposal is restricted to reviewed answers belonging to that exact baseline run.
- Historical buyer-question wording comes directly from persisted `run_answers.prompt_text`; the generator no longer re-reads current editable `prompts.prompt_text` for historical evidence.
- Optional verified evidence items may supplement the source observations without changing the run baseline.
- Deterministic FAQ/comparison draft guidance no longer copies mutable question text into generated proposal prose; reviewers are directed to the linked persisted historical observation.
- Unresolved Resolution Center work is ordered by persisted `created_at DESC`, not the legacy generated `priority_score` formula. The legacy schema field remains available for historical compatibility but no longer silently steers this customer workflow.

## Other production controls still in force

This runtime-hardening work sits on top of earlier verified controls from the same production-readiness program:

- reciprocal cross-organization RLS read isolation on populated core tables;
- rollback-only cross-organization mutation isolation on populated prompt/membership rows;
- explicit database function privilege boundaries;
- password-recovery purpose-session boundary;
- provider cost-event guard preventing tokenless failed/rate-limited estimates from entering the ledger that feeds `actual_cost_usd`;
- public production auth smoke with exact build provenance, direct reset-password rejection, and unauthenticated `/app` protection; and
- fictional demo separation.

## Gates deliberately still open

None of the work above is evidence for the following still-open gates:

- disposable confirmed production-account journey: signup, confirmation email, authenticated login, emailed password-recovery round trip, onboarding, demo entry/exit isolation, representative mobile states, and empty/error states;
- live all-device session-revocation drill using a disposable/test account;
- backup restoration drill;
- controlled production error reaching the responsible operator through Sentry or the configured monitoring path;
- bounded production Inngest runtime probe;
- fresh current-release cost-capped AI-provider collection preserving provider, exact model, date, cost source/spend, failures, answer, citations, Source X-Ray inspection, and human review;
- authenticated application-level cross-organization search/export drill and representative opportunity/action isolation fixtures;
- Supabase leaked-password protection, tracked separately in GitHub issue #57 until the production Auth setting is enabled and the Security Advisor warning disappears; and
- legal/commercial approvals including privacy, terms, MSA, DPA, retention, subprocessors, incident response, checkout entitlement activation, customer permissions, and any required counsel review.

## Interpretation rule

This snapshot proves the listed implementation and production observations only. It does not prove customer adoption, retention, willingness to pay, publisher acceptance, ranking improvement, traffic, leads, revenue, or causation.