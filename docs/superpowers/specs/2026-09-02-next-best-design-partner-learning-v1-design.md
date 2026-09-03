# Next Best Company Change v1 + Design-Partner Execution + Learning/Verification Refinement

## Purpose

Extend the Recommendation Engineering loop after Decision Intelligence v1 without introducing a fake composite score, fabricating design-partner proof, or converting before/after associations into causality claims.

The sequence is:

Company Truth + Eligibility + Cross-business Evidence
→ Change Specifications
→ Next Best Company Change evaluation
→ Human decision / execution
→ Design-partner execution cycle when the organization is explicitly verified as external
→ Comparable follow-up
→ Verification assessment
→ Learning summary

## Non-negotiable boundaries

1. Next Best Company Change is an explainable ordering aid. It never writes `decision_state`, `truth_state`, `confidence_state`, approval state, or `priority_rank` automatically.
2. No 0–100 score, probability, opaque weighted score, or leadership score is introduced.
3. Design-partner execution records can exist only for organizations explicitly classified as `design_partner` or `customer`, included in company KPIs, and linked to a first-party commercial account.
4. Existing test/acceptance/synthetic workspaces must never be reclassified or counted automatically.
5. No real design partner, executed change, retained cycle, or outcome is seeded or inferred from repository history.
6. Verification remains `IMPROVED | UNCHANGED | WORSENED | INSUFFICIENT_EVIDENCE`.
7. A comparable before/after result is an observed association only. `causal_attribution` remains `not_claimed`.
8. Cross-business outcomes remain separate from AI recommendation observations; they can enrich learning but cannot prove causation.
9. All customer workspace records remain organization/project scoped under RLS.

## A. Next Best Company Change v1

### Inputs

Candidate Change Specifications use only persisted, inspectable facts:

- status;
- human `decision_state`;
- control class;
- latest Eligibility Engine state;
- confidence state;
- effort;
- explicit human `priority_rank` when present;
- verified Recommendation Engineering evidence count;
- verified Cross-business Evidence count and directions;
- declared dependencies;
- execution readiness.

### Output

Each evaluation batch stores an immutable snapshot. Each candidate receives:

- `priority_band`: `NOW | NEXT | WATCH | BLOCKED | INSUFFICIENT_EVIDENCE`;
- `ordinal_rank` within the batch;
- explicit `reason_codes`;
- an inspectable factor snapshot;
- engine version and timestamp.

No numeric composite score exists.

### Deterministic ordering

The engine applies explicit lexicographic rules rather than weights:

1. `DO_NOT_DO`, rejected/completed, or structurally ineligible candidates are `BLOCKED`/not action candidates.
2. `MONITOR_ONLY` candidates are `WATCH`.
3. Unknown eligibility, insufficient confidence, or insufficient evidence are `INSUFFICIENT_EVIDENCE` unless the human decision is `TEST_FIRST`, in which case they may be `NEXT` with a test-first reason.
4. Human `DO_NOW` + controllable/influenceable + eligible/partially eligible + adequate evidence becomes `NOW` unless unresolved dependencies block execution.
5. `TEST_FIRST` or dependency-bearing candidates become `NEXT`.
6. Within a band, explicit human `priority_rank` wins when present; otherwise lower effort precedes higher effort, then older submitted/created work precedes newer work for stability.

This is an ordering recommendation, not authorization.

## B. Real design-partner execution system

### Truth boundary

A workspace is eligible for a design-partner execution cycle only when all are true:

- `company_organization_classifications.classification in ('design_partner','customer')`;
- `included_in_company_kpis = true`;
- a `commercial_accounts.customer_organization_id` points to the same organization;
- the Change Specification belongs to the same workspace.

The validation function may read protected commercial/classification records, but the customer-facing cycle never exposes contact PII or commercial-account details.

### Cycle

`design_partner_execution_cycles` links a verified external workspace to one Change Specification and records the program objective plus lifecycle state:

`planned → active → measurement_due → completed`

or `blocked`.

The progress view derives factual execution milestones from existing systems:

- reviewed/approved Change Specification;
- linked execution asset;
- applied execution reference;
- requested comparable follow-up;
- completed comparable follow-up;
- verification assessment.

The cycle does not manufacture these milestones.

### Program scorecard

A service-role-only view reports:

- verified external design-partner/customer organizations;
- organizations with at least one started cycle;
- completed execution cycles;
- distinct executed company changes;
- comparable verified cycles;
- improved/unchanged/worsened/insufficient counts.

Zero stays zero.

## C. Learning / verification refinement

### Verification assessment

`change_verification_assessments` is append-only and linked to:

- Change Specification;
- execution asset;
- resolution follow-up;
- baseline and follow-up runs.

It persists:

- canonical verification state;
- comparison eligibility;
- reason/limitations;
- before/after metric snapshot;
- optional verified cross-business evidence links;
- `causal_attribution = 'not_claimed'`.

### Deterministic state rule v1

The v1 assessment uses the comparable Recommendation Engineering deltas already produced by `resolution_follow_ups`:

- incomparable / missing comparable metrics → `INSUFFICIENT_EVIDENCE`;
- any negative primary recommendation delta with no positive primary delta → `WORSENED`;
- any positive primary recommendation delta with no negative primary delta → `IMPROVED`;
- all available primary recommendation deltas equal zero → `UNCHANGED`;
- mixed positive and negative primary deltas → `INSUFFICIENT_EVIDENCE`.

Primary recommendation deltas are `brandPresencePct.delta` and `firstMentionPct.delta`. Citation/source-count changes remain context, not the primary state decision.

This intentionally avoids declaring business causality.

### Learning summaries

`change_learning_summaries` aggregate only real persisted assessments by an explicit grouping key such as `control_surface`, `change_type`, or other approved taxonomy supplied by the Change Specification. A summary is descriptive:

- assessment counts;
- state distribution;
- comparable count;
- verified cross-business evidence count;
- limitations.

No success probability or prescriptive causal claim is produced.

## UI

### Attention

When a latest Next Best evaluation exists, the Attention list shows the recommended band, rank, and reasons beside the existing human decision states. The human `priority_rank` remains visible and editable only through existing Change Specification draft workflows.

### Change Specification detail

Add a read-only section containing:

- latest Next Best evaluation;
- design-partner cycle state when legitimately available;
- latest verification assessment;
- learning context.

Required boundary copy:

> Next Best Company Change is an explainable ordering aid. It does not approve a company change.

> Observed before-and-after association only. This record does not establish that the applied change caused the result.

## API

A single authenticated route may expose actions for:

- `evaluate_next_best_changes`;
- `start_design_partner_cycle`;
- `refresh_design_partner_cycle`;
- `assess_change_verification`.

Every write checks same-workspace identity and role. Demo mode is read-only/fail-closed.

## Acceptance criteria

- forward-only migration replays from an empty database;
- all new tenant tables have RLS;
- design-partner cycle creation fails without explicit external classification + commercial linkage;
- no synthetic data/backfill is added;
- no numeric composite score exists;
- Next Best engine never emits or writes a company decision state;
- verification assessment never claims causality;
- current Outcome Ledger/history remains valid;
- tests, lint, typecheck, build, Worker dry run, Browser Acceptance, Security, CodeQL, and AI Safety/Code Health pass on the exact head.