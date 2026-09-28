# Foremention Stage-0 evidence integration: verification and release boundary

**Status 28 September 2026:** Implementation staged in PR #356 (product differentiation), PR #357 (independent reporting parity) and stacked PR #358 (authenticated API/audit fixes + isolated RLS and evidence-integrity verification). **None is merged, deployed or certified as paying customer proof.**

## Verified and independently checkable

- PR #356's complete decision-evidence reporting and truthful product framing passed five exact-head checks. No new provider fidelity claims.
- PR #357's user-visible Outcome Ledger and board-ready export compute eligible comparisons from **an independent signed-in, organization-scoped read of verified answer metadata**, using exact question/provider/model/methodology and the nine persisted context fields. Both suppress claims if context is missing or drifted. Complete chains need linked Change Specification and executed change reference. These changes passed five exact-head checks.
- PR #358 inherits the locally reviewed authenticated reviewer/manager API authorization corrections from standalone PR #353. The new **required PR gate** `Isolated Outcome Evidence` uses two newly created random GoTrue users and real PostgREST JWTs against a disposable local Supabase stack. It onboards two independent local organizations, writes five verified synthetic question/answer slots for two runs and one outsider run, verifies both tenants cannot read each other's runs/answers under actual RLS, accepts exact nine-field parity, then changes only one later answer's **evaluationVersion** in actual local Postgres and requires the canonical comparison evaluator to **withhold** the second outcome. No browser/UI route, external provider or production project is invoked.
- Ordinary exact-head `CI`, `Browser Acceptance`, `Security`, `CodeQL`, and `AI Safety and Code Health` still validate production compilation, code unit/contracts, SQL migration replay, browser a11y/performance and safe dependencies.

## What remains unproven and therefore blocked

The prior full signed-in browser `Isolated Authenticated Journey` against the combined PR #356/#357/#353 worker has **NOT** passed. Its experimental local development runtimes suffered startup crashes or intermittently timed out and returned local 503 on heavily linked reads despite basic Worker health/GoTrue/PostgREST checks. The journey is **preserved as explicit workflow_dispatch-only manual gate** rather than being relabeled as a successful PR test. Its code contains five frozen synthetic questions, real review and approval APIs, signed-in Outcome Ledger/board positive state and deliberately drifted negative state. Reviewers must run it successfully against an isolated runtime representative of production and record the exact-head receipt **before any deployment**. An authenticated local DB/RLS test alone cannot satisfy that UI requirement.

Additional independent release blocks are unchanged:

1. #323: Owner rotates/revokes previously exposed synthetic acceptance identity, updates GitHub Actions secrets and purges affected historical artifacts; do not trust old production browser credentials.
2. #346: Written commercial search, model grounding, retained provenance and client display rights. Do not interpret public Bing RSS or alternative self-service search plan as automatic SaaS storage/redistribution permission.
3. #332/#354: Privately preserve production migration SQL execution ledger, obtain independently verified production backup, and demonstrate isolated **production-derived** staging restore and conservative content reconciliation. No `db push`, migration repair or production DDL before owner-approved proof.
4. #351/#352: After #332 signoff, separately authorize forward-only database-side all-nine-field comparator; the read-side #357 gate is additional defense, not a write-side fix.
5. #345 and #324: Commercially licensed source relevance and provider fidelity require correctly defined official-source test, documented attribution and small manual citation audit after legal and credential gates.
6. #283: At least three actual external design partners, one independently verified paid commitment and two legitimate comparable repeat cycles. Internal synthetic or QA data is never customer evidence.

**Merge sequencing:** review #356 → #357 → #358's current base ancestry, preserve #353 integration history, and do not enable production deployment from main until every applicable release requirement above has owner approval and supporting exact-commit evidence. If CI is green, it means the *staged* checks passed, not that the full app or commercial business has launched.
