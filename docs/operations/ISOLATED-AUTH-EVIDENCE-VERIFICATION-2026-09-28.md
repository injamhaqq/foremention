# Isolated signed-in evidence verification — Stage 0

This narrowly scoped proof supplements PR #357's independently fail-closed Outcome Ledger, **without** claiming to exercise the final browser/Worker UI or deploying production changes.

## Required PR workflow: Isolated Outcome Evidence

An isolated GitHub Actions runner spins up/reset local Supabase Auth and PostgREST using newly generated local-only keys and securely deletes the ephemeral environment. The script:

- Signs in **two new random local GoTrue users**, creates independent local workspaces through the real onboarding RPC and verifies bounded local JWT acceptance.
- Seeds only simulated/no-provider answer metadata: five frozen buyer questions, a fixed synthetic provider/model, baseline and later runs for one tenant plus an unrelated outsider run.
- Reads both organizations using *actual signed-in PostgREST requests*, scoped first by organization/project run identity and then by organization/allowed run IDs, and asserts cross-tenant RLS blocks runs and verified answer rows in both directions.
- Reuses Foremention's canonical nine-field exact-question comparability evaluator with *actually stored* local verified metadata. It requires a matching pair to be eligible, changes only one persisted later `evaluationVersion`, re-reads data through the same owner JWT, and requires the previously eligible result to become **incomparable**.
- No external requests except normal tool installation/local loopback, no customer data, no real sources, no incurred provider/model costs, no production Supabase, and no hard-coded acceptance account.

Other normal exact-head CI, security, CodeQL, AI quality and public browser acceptance checks still apply. **This verifies database/RLS/evaluator behavior, not full authenticated rendered pages.**

## Separate unresolved full-browser and release gates

The stacked draft PR #358 retains the full signed-in Worker/browser review-to-execution journey, including Outcome Ledger and board export positive/negative assertions. Its local Worker still times out on a first post-review Resolution read even though local Worker health, PostgREST authentication and internal handler staging succeeded. A green DB/RLS test is **not** a substitute for a production-representative authenticated Worker/UI acceptance run; keep #358 draft/owner release-blocked until that distinct gate passes.

Owner-controlled launch requirements remain #323 credential rotation/history purge, #346 written commercial search/grounding/storage/display rights, #332/#354 production-derived backup and tested staging restore plus ledger reconciliation, #351/#352 separately approved database-side comparator, #345 provider/source relevance, and real external design partner / paid repeat-cycle proof in #283.

**Integrate for code review in order** #356 → #357 → this isolated test PR. Do not merge to production solely because its tests pass.
