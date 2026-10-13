# FM-00 execution coordination and interface gate — 2026-10-12

> 2026-10-13: contracts as implemented → `interface-contracts.md`; release/migration order → `release-and-rollback-plan.md`; readiness/approval → `readiness-and-approval.md`. The note below that container git was unavailable no longer applies.

**Authority:** `CLAUDE.md`, `FOREMENTION_STATE.md`, `docs/STAGE-0-CUSTOMER-PROOF-90-DAY.md`, issue #283, and current source/code take precedence over 2026-10-11 historical audits. Existing FM workstream ownership is not replaced. This is a coordination proposal, not deployment authorization.

**Base:** main `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (observed 2026-10-12 UTC). **Branch:** `fm-attach-v1/00-coordinator`. Never merge to main, deploy, activate billing, run paid calls, contact customers, mutate production records or perform production migrations under this packet. Repository Github connector permits writing isolated files; container git network is unavailable, so fresh local pnpm checks against a clone have not run.

## Source integrity and reconciliation
- FM-00 archive recovered from user's stored ZIP; the 18 *included* original source files were checked against manifest SHA-256 and all matched. `Foremention_Master_Backlog_28_v2.csv` remains absent: do not invent rows.
- Historical index holds 71 rows: 18 Commercial (CV-01–CV-18), 29 new A rows, 24 older A rows. **47 exact original-ID groups**, not 47 verified defects. Preserve A01–A24 twice (older/newer source references); newer A08/A09/A15/A18/A19/A20/A21 carry material updated observations. Do not collapse different CV and A IDs automatically without evidence.
- Preserve and re-review source inventories: 71 route records; 92 state/surface records (78 API, 8 mail families, 4 worker handlers, 2 dialogs); 124 repository candidates; 67 alternative discovery candidates; 54 competitor source register rows; 100 external complaint/issue examples; separate company versus alternate-startup finance assumptions. Inventories are historical, not runtime assurance or customer evidence.
- Row mapping and exact owner/source dual references: `00-proposals/backlog-crosswalk.md`. Source-review owners must record *current head* tests, precise fixes and acceptance receipts rather than copying old diagnoses.

## Static ownership: 00 coordinator; 01 measurement/evidence/spend; 02 auth/tenant security/privacy; 03 billing and entitlements; 04 customer value/review/comparisons; 05 public website/UX/SEO; 06 jobs/communications/recovery; 07 repository/license research; 08 commercial proof/economics/support; 09 independent regression and acceptance.

**Workers may work simultaneously on isolated branches but may not edit another packet's scope.** Exact branch per packet `fm-attach-v1/XX-<role>`; only FM-00 owns shared schemas, SQL migration naming/order, root CI, composed release decisions. Other workers propose cross-domain changes under `XX-proposals`; do not race shared files. Source review must honor existing issue/PR owners, not supersede them. Record reasons before modifying this ownership.

## Mandatory interface contract for proposals
These are required *data semantics*, not new runtime schema names:

1. **01 -> 04/06/08/09, ObservationEnvelope**: organization/project/question ID and version; method, exact provider/model and configuration, locale, observation time, raw answer receipt, native citations versus retrieved URLs/content versus inference, retrieval/refusal/partial statuses, budget reservation and actual usage/unknown. Missing is unknown, never zero visibility. **No syndicated RSS equivalence to consumer app**.
2. **02 -> all, ScopeAuthorization**: verified viewer/role/org/project, provenance of authorization, origin/session/CSRF/security boundaries, service-role prohibition for client trust decisions; deny cross-tenant and ambiguous scope. RLS must be tested with disposable tenants, not inferred from SQL presence.
3. **03 -> 04/06/08/09, CommercialEntitlement**: provider-neutral paid/sandbox payment event IDs and dedup/revision, verified settlement time, active/inactive/expired/reversed capacity, access grants derived only from verified allowed events. Checkout redirect, UI success, plans and invoices do not grant access or prove cash.
4. **04 -> 05/08/09, CustomerCycle**: five approved real questions; inspectable Recommendation Record and native/derived evidence states; human review; owned Change Specification; permitted action; later *nine-field exact-context* comparison and noncausal outcome. Failed/empty/unreviewed states exposed. Do not revive Source X-Ray as a standalone product.
5. **06 -> 01/03/04/09, ExecutionReceipt**: idempotent job/admission key, tenant scope, start/end/retry/cancel/error history, bounded provider cost, delivery claim, recipient approval, recovery/backup/rollback evidence. Notification attempted != delivered.
6. **05/08 consume** audited evidence and safe public/commercial states; no invented scale, pricing, customers, logos, retention, citations, causation, revenue or regulatory assurance. **09 independently asserts** interface invariants against the *composed exact head*, not worker fixture green status.

The coordinator reviews names/types/versions before migration or public-contract introduction.

## Dependency-ordered candidate
1. **Baseline:** discover open PRs and exact SHAs; retrieve worker branches/status via GitHub, check issue #283 and changed main. Freeze chosen canonical base; reject stale patches and unsupported source claims.
2. **Security + measurement:** integrate source/usage guards (01), authorization/RLS/origin/provenance (02); review schema changes atomically with disposable replay and rollback. Target historical #323, #345/#346, #455/#456/#459, #497/#498/#512 without assuming any remains open.
3. **Billing + jobs:** integrate isolated sandbox-only verified entitlements (03) and idempotent job/recovery layers (06), applying only reviewed FM-00 migration proposals. Validate 0/partial/duplicate/reordered refund, no-charge cases and cost ceilings.
4. **Customer workflow:** integrate (04) against actual interfaces, saving/reloading human review and owned Change Specification through later comparison, with 0-question denial and cross-project negative cases.
5. **Website + finance/repository decisions:** (05/07/08) after contracts; no premature $299, $3k/$6k, consumer-product coverage or Agency-ICP claims. The older startup screen recommends a *different company*, so its financial projections do not become Foremention's.
6. **Independent acceptance:** (09) runs on composed head; FM-00 runs exact-head tests, lint, typecheck, build, isolated Supabase migration replay, Cloudflare dry run, CI, Security, CodeQL, AI Safety, browser and accessibility / SEO / responsive checks, budget/isolation and restore simulation as applicable. Production verification only after a *separate* authorized release.

**Existing PR lineage:** repository had 48 open PRs at scan, including #535/#536 competitor-document research and a long chain of branch-on-branch open work. Treat these as competing historical inputs, not approved merges. No `fm-attach-v1/` worker branches or corresponding PRs found at initial lookup (2026-10-12). Refresh before integration; do not manually solicit founder handoffs when peer branch records become available.

## Readiness gates (not a self-service release declaration)
- **Free design partner:** one actual qualified company can consentfully onboard, persist five questions, receive an accurate Recommendation Record, review evidence and own a Change Specification; transparent manual service and budget limits permitted but provenance and isolation are not optional.
- **Paid founder-led pilot:** above plus genuine merchant/legal approval, price/terms, sandbox-to-production billing lifecycle evidence, exact cash/contract identity and support/recovery receipts. No payment activation now.
- **Self-service paid:** full onboarding/capacity/refund/cancel/webhook/replay/export/deletion/recovery and support gates, trustworthy public terms and repeated browser journeys; not inferred from billing code.
- **20 customers:** repeated tenant-isolated workflows with support load, costs, retention, comparable later cycles and paid continuation supported by first-party proof. No forecast masquerading as actuals.
- **Stage 0 exit:** 3–5 qualified active partners; >=1 verified paid pilot or signed commercial commitment; >=2 orgs with second comparable reviewed cycle (issue #283). None established by this coordination branch.

## First founder approval gate
One reviewable approval request after composing a tested candidate: **authorize a narrow, reversible, documented nonproduction validation plan** that specifies exact SHA, sandbox migrations/config, sample synthetic tenants, budget cap of $0 new spend, expected 5-question-to-decision-to-later-cycle checks, acceptance owners, rollback and production exclusions. Separate explicit approval required for live merchant, production database, pricing, paid spend and deployment.

## Reopening / rollback
Defer broadened integrations/frameworks until a reproducible pilot blocker + license/security/cost check exists. Stop if a peer head changes or a migration/permission conflict appears; rebuild exact-head proof. Documentation-only rollback: revert the coordinator commits. Proposed runtime rollback: reviewed reverse migration or forward fix with backup/restore verification; no blind destructive down migrations.
