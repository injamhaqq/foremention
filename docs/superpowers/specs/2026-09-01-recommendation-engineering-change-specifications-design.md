# Recommendation Engineering Change Specifications — Design

## Status

Approved architecture for extending PR #197 (`feat/controllable-recommendation-actions-20260901`) without creating a competing recommendation domain, database model, top-level product object, or public category rebrand.

## Product boundary

Foremention remains publicly a **Recommendation Intelligence** product for B2B software, consistent with the repository constitution. This design strengthens the internal product engine toward **Recommendation Engineering** while preserving the locked five-object signed-in architecture: Attention, Questions, Records, Comparisons, Settings.

This phase does not claim that Foremention controls ChatGPT, Claude, Gemini, Perplexity, search ranking, recommendation ordering, or model behavior. It does not promise #1 placement. It converts reviewed evidence into specific customer-owned change specifications, keeps material changes human-approved, and treats later movement as observed association unless stronger causal evidence exists.

## Goal

Upgrade the existing Resolution Center loop from generic controllable-surface guidance into an implementation-ready, evidence-bounded change specification system that answers:

> **What exactly should this company change next, why, who owns it, what counts as done, and how will Foremention verify the result?**

## Existing foundation to preserve

PR #197 already adds:

- eight explicit customer-controlled surfaces: product, pricing / offer, positioning, documentation, product feed / structured product data, website, case study / proof, policy;
- `controlLevel: "controllable"` and `controlSurface` on resolution proposals;
- evidence-gated deterministic proposal generation;
- tenant-scoped persistence;
- customer editing;
- human review / approval;
- applied-location recording;
- comparable follow-up measurement;
- non-causal interpretation of before/after changes;
- explicit language that Foremention cannot guarantee mention, rank, or recommendation outcomes.

The implementation must extend this foundation rather than introduce a parallel recommendation-action subsystem.

## Core data flow

The canonical flow is:

`verified AI observation -> recommendation gap -> controllability surface -> supporting company evidence -> change specification -> human approval -> execution -> applied reference -> comparable remeasurement -> observed outcome`

A specification must fail closed when evidence does not support a material recommendation.

## Decision states

Every controllable Change Specification must resolve to exactly one decision state:

### `do_now`

Use only when the evidence supports a material, customer-controlled change strongly enough to recommend execution now.

### `test_first`

Use when the proposed change is plausible and commercially relevant but the evidence is not yet strong enough for a confident implementation recommendation. The specification must state the validation step required before execution.

### `do_not_do`

Use when evidence indicates the change should not be pursued, including low commercial value, poor fit, disproportionate effort, structural ineligibility for the target buyer, or evidence that the competitor is genuinely better for that use case.

### `insufficient_evidence`

Use when Foremention does not have enough evidence to make a material change recommendation. The system must state what evidence is missing instead of inventing a prescription.

## Truth states

Each specification must carry one truth state:

- `observed` — directly supported by reviewed records;
- `hypothesis` — a bounded explanation that requires validation;
- `experiment` — a specific test approved to generate evidence.

The system must not convert an inference into an observed fact.

## Change Specification contract

Phase 1 keeps the existing `resolution_assets.proposal` JSON as the persistence boundary. No second schema/table is introduced solely for this feature.

`ResolutionProposal` gains an optional, versioned `changeSpecification` object. Existing proposals without the object remain readable.

Required contract:

```ts
export const RESOLUTION_CHANGE_DECISIONS = [
  "do_now",
  "test_first",
  "do_not_do",
  "insufficient_evidence",
] as const;

export const RESOLUTION_TRUTH_STATES = [
  "observed",
  "hypothesis",
  "experiment",
] as const;

export const RESOLUTION_CONFIDENCE_LEVELS = [
  "high",
  "medium",
  "low",
  "insufficient",
] as const;

export const RESOLUTION_EFFORT_LEVELS = [
  "low",
  "medium",
  "high",
  "unknown",
] as const;

export type ResolutionChangeSpecification = {
  schemaVersion: "1.0";
  decision: ResolutionChangeDecision;
  truthState: ResolutionTruthState;
  evidenceBasis: Array<{
    evidenceId: string;
    finding: string;
  }>;
  exactRequirement: string;
  implementationDetail: string | null;
  implementationDetailStatus: "supported" | "requires_validation" | "not_applicable";
  scope: string;
  owner: string;
  priority: "critical" | "high" | "medium" | "low" | "not_applicable";
  effort: ResolutionEffortLevel;
  dependencies: string[];
  acceptanceCriteria: string[];
  verificationPlan: string;
  confidence: ResolutionConfidenceLevel;
  missingEvidence: string[];
};
```

## Specificity rule

Foremention must be specific about the **requirement** whenever reviewed evidence supports it.

Foremention must be specific about the **implementation** only when product/company evidence supports that level of detail.

Example:

If evidence proves that Salesforce compatibility matters, the system may prescribe:

> Validate and, if confirmed by product/customer evidence, implement native Salesforce compatibility for the affected buyer segment.

It must not invent OAuth flows, field mappings, bidirectional sync behavior, admin permission architecture, or engineering design unless linked evidence supports those details.

This is the core anti-bluff rule:

> **Specific where supported; explicit about validation where not supported.**

## Evidence basis

Every material specification must show the evidence used to support it.

`evidenceBasis` must reference only verified evidence already permitted by the Resolution Center evidence boundary. Findings must be concise factual interpretations of those records and must not add unsupported rankings, traffic, revenue, customer, pricing, or product claims.

Where available in future phases, cross-business evidence may include customer research, sales lost reasons, product requests, usage, churn, reviews, or commercial data. Phase 1 must not fabricate these sources when the current resolution context does not provide them.

## Confidence rules

Confidence is categorical, not fake precision.

### `high`

Multiple independent reviewed signals support the same requirement, or one direct reviewed signal is sufficiently explicit for the bounded change.

### `medium`

Evidence supports the direction but material uncertainty remains.

### `low`

The idea is plausible but requires validation before execution.

### `insufficient`

A material recommendation would exceed the evidence.

`insufficient_evidence` decisions must always use `confidence: "insufficient"`.

## Decision derivation rules

The deterministic engine must prefer caution over false specificity.

At minimum:

- no verified evidence -> proposal generation remains rejected by the existing evidence gate;
- verified evidence but no bounded controllable requirement -> `insufficient_evidence`;
- plausible requirement with material uncertainty -> `test_first`;
- direct evidence for a bounded customer-controlled requirement -> `do_now` may be used;
- evidence that the proposed change should not be pursued -> `do_not_do`;
- implementation detail not directly supported -> `implementationDetail: null` and `implementationDetailStatus: "requires_validation"`;
- later recommendation movement must never retroactively convert the original recommendation into proven causation.

Phase 1 must not use an LLM to invent the change specification. It extends the existing deterministic, reviewed-evidence engine. A later generative layer may be considered only behind the same evidence and approval boundaries.

## Surface-specific requirements

The eight control surfaces remain explicit.

### Product

May specify an evidence-backed capability, workflow, quality, integration, or experience requirement. Engineering architecture requires separate support.

### Pricing / offer

May specify a verified pricing, packaging, trial, contract, guarantee, implementation, or commercial-friction requirement. It must not invent willingness-to-pay, competitor price, margin, or revenue evidence.

### Positioning

May specify audience, use case, category, differentiated capability, or decision-criterion clarification supported by reviewed evidence. It must not invent superiority claims.

### Documentation

May specify missing or unclear product, integration, security, implementation, specification, or support documentation supported by evidence.

### Product feed / structured product data

May specify missing, stale, or conflicting product facts only when authoritative values are verified. Unknown values remain unknown.

### Website

May specify customer-controlled page, crawlability, information architecture, or factual clarity changes supported by evidence.

### Case study / proof

May specify the proof that needs to exist, but never fabricate a customer, quote, benchmark, review, outcome, or permission.

### Policy

May specify warranty, return, SLA, security, privacy, support, onboarding, procurement, or service-policy gaps supported by evidence. Final terms require accountable business/legal/operational approval.

## Owner, priority, effort, and dependencies

These fields must not imply organizational facts that Foremention does not know.

- `owner` may use a functional owner such as `Product`, `Engineering`, `Marketing`, `Revenue`, `Security`, `Customer Success`, or `Executive` when a named person is not known.
- `priority` reflects evidence/recommendation urgency within the bounded resolution context, not a fabricated company-wide roadmap ranking.
- `effort` is `unknown` unless the current evidence or customer-edited specification supports a defensible estimate.
- `dependencies` list only known dependencies; unknown dependencies are omitted rather than guessed.

A future Next Best Company Change engine may rank across multiple resolutions using commercial value, recommendation relevance, evidence confidence, competitive gap, and effort. That cross-resolution prioritization is explicitly out of scope for this Phase 1 implementation unless current repository evidence already supports it.

## Acceptance criteria

Every executable specification must include observable completion conditions.

Examples:

- the approved policy is published at the recorded authoritative location;
- the reviewed product documentation explicitly contains the verified requirement;
- the approved pricing/offer change is visible in the recorded customer-controlled destination;
- the product/feed value is updated to the verified authoritative value;
- the approved product requirement is implemented and linked to an applied reference.

Acceptance criteria must not assert recommendation improvement. Recommendation movement belongs to verification.

## Verification plan

Every specification must state how Foremention will verify the recommendation outcome after execution.

The default verification route remains the existing governed comparable follow-up mechanism:

- preserve baseline run identity;
- require the same buyer questions;
- require provider/model parity where the existing comparison system requires it;
- reject stale or incomparable runs;
- report deltas as observed association;
- never claim the applied change caused the movement without stronger evidence.

## UI design

No new top-level signed-in object is introduced.

The existing Resolution Center remains the execution surface inside the current product architecture.

The controllable action card should lead with:

# What should we change next?

For each selected resolution show, in order:

1. decision badge: DO NOW / TEST FIRST / DO NOT DO / INSUFFICIENT EVIDENCE;
2. control surface;
3. evidence-backed exact requirement;
4. evidence basis;
5. implementation detail, or an explicit `Requires product/business validation` state;
6. owner;
7. priority;
8. effort;
9. dependencies when present;
10. acceptance criteria;
11. verification plan;
12. confidence;
13. existing approval / apply / remeasure controls.

Existing generic proposal content remains available for backward compatibility and customer editing, but the Change Specification becomes the primary decision content for new controllable plans.

## Editing and approval

Customer edits must preserve `controlLevel`, `controlSurface`, and the full `changeSpecification` contract.

Material changes remain human-governed:

- owners/admins retain review authority under the existing role model;
- approval is required before application;
- customer edits may increase specificity, but unsupported claims remain constrained by the evidence boundary;
- marking an action applied must continue to record the authoritative applied reference;
- Foremention must not autonomously change price, product, policy, positioning, or public content in this phase.

## Backward compatibility

Existing resolution proposals without `changeSpecification` must remain readable and editable.

The API/UI must tolerate:

- legacy proposals created before PR #197;
- PR #197 proposals with `controlSurface` but without a Change Specification;
- new proposals with the complete `changeSpecification` object.

No migration may fabricate Change Specifications for historical records.

## API behavior

The existing `/api/resolutions` route remains authoritative.

Generation:

- validates the selected control surface;
- loads verified evidence using existing tenant/project boundaries;
- calls the deterministic resolution engine;
- persists the proposal including the Change Specification when the engine can produce one;
- writes only truth-safe audit metadata.

Customer editing:

- validates decision/truth/confidence enums;
- preserves evidence boundary and control-surface identity;
- rejects malformed specifications;
- does not allow a customer-edited payload to silently remove the approval/evidence semantics.

Reading:

- exposes the Change Specification to the UI when present;
- continues returning legacy proposal fields for compatibility.

## Security and privacy

Preserve all existing authentication, origin checking, RLS, workspace/project isolation, service-role boundaries, evidence verification requirements, auditability, demo isolation, and mutation role checks.

The Change Specification must not copy sensitive free-form records into analytics or audit metadata merely because they appear in a proposal.

No security check may be weakened to make the feature pass.

## Testing strategy

Implementation follows RED -> GREEN -> VERIFY.

Required test coverage:

### Engine contract

- deterministic generation for identical inputs;
- all eight control surfaces remain explicit;
- decision/truth/confidence/effort enums are closed;
- specification references only supplied verified evidence IDs;
- direct bounded evidence can produce a bounded requirement;
- unsupported implementation detail is not invented;
- weak evidence produces `test_first` or `insufficient_evidence`, not a confident implementation prescription;
- `insufficient_evidence` pairs with `confidence: "insufficient"`;
- no ranking/#1/recommendation guarantee language;
- comparable outcome remains non-causal.

### API contract

- generate persists `changeSpecification`;
- reading preserves it;
- customer editing preserves/validates it;
- malformed enum/value payloads fail closed;
- legacy records without the object remain readable;
- existing tenant, role, origin, evidence, approval, and comparable-follow-up gates remain intact.

### UI contract

- UI renders the decision state and exact requirement;
- unsupported implementation detail renders a validation-required state rather than invented steps;
- owner/priority/effort/acceptance/verification/confidence render when present;
- existing approval/apply/remeasure workflow remains usable;
- viewer/non-manager restrictions remain intact.

### Adversarial tests

At least one test must feed evidence that proves only a broad gap and assert that the system refuses to generate detailed technical implementation steps.

At least one test must verify that customer editing cannot turn a missing-evidence specification into a system-authored `high`-confidence observed fact without the payload being explicitly treated as customer-edited and remaining subject to approval.

## Verification gates before merge

Fresh exact-head evidence is required for:

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- configured CI
- Browser Acceptance
- Security
- CodeQL
- AI Safety and Code Health
- responsive/accessibility/reduced-motion gates required by the repository release policy when UI behavior changes

Merge only the exact verified SHA.

## Explicit non-goals for Phase 1

Do not add:

- a public Category Leadership OS rebrand;
- a sixth top-level product object;
- a second recommendation/action database subsystem;
- fabricated commercial priority scores;
- fabricated revenue impact;
- fabricated effort estimates;
- autonomous product/pricing/policy changes;
- generic SEO suite expansion;
- generic social suite expansion;
- category-name generation;
- an LLM that invents unsupported implementation detail;
- a #1/rank guarantee.

## Success criteria

Phase 1 is complete when a new controllable resolution can:

1. originate from reviewed evidence;
2. classify a customer-controlled surface;
3. present a specific evidence-backed requirement;
4. refuse unsupported implementation specificity;
5. state decision, truth state, confidence, owner, priority, effort, dependencies, acceptance criteria, and verification plan without bluffing;
6. preserve those fields through editing and approval;
7. record where the approved change was applied;
8. run the existing comparable follow-up measurement;
9. report the later movement as observed association, not proven causation;
10. remain compatible with historical resolution records and the locked Foremention product architecture.
