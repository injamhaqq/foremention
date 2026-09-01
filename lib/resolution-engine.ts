export const RESOLUTION_ASSET_TYPES = ["comparison_brief", "faq_evidence_brief", "source_page_brief"] as const;
export type ResolutionAssetType = typeof RESOLUTION_ASSET_TYPES[number];

export const RESOLUTION_CONTROL_SURFACES = [
  "product",
  "pricing_offer",
  "positioning",
  "documentation",
  "product_feed",
  "website",
  "case_study",
  "policy",
] as const;
export type ResolutionControlSurface = typeof RESOLUTION_CONTROL_SURFACES[number];

export type VerifiedResolutionEvidence = {
  id: string;
  kind: "evidence_item" | "source_observation";
  title: string;
  url: string | null;
  observedAt: string | null;
  provider: string | null;
  model: string | null;
  question: string | null;
  excerpt: string | null;
  runId: string | null;
  verification: "verified";
};

export type ResolutionProblem = {
  id: string;
  title: string;
  nextAction: string | null;
  sourceId: string;
  sourceTitle: string | null;
  sourceUrl: string;
};

export type ResolutionProposal = {
  schemaVersion: "1.0";
  assetType: ResolutionAssetType;
  controlLevel?: "controllable";
  controlSurface?: ResolutionControlSurface;
  headline: string;
  objective: string;
  draftSections: Array<{
    heading: string;
    guidance: string;
    evidenceIds: string[];
  }>;
  evidenceBoundary: string;
  nextStep: string;
  customerEdited?: boolean;
};

export type RunMeasurement = {
  id: string;
  brandPresencePct: number;
  firstMentionPct: number;
  citationCount: number;
  newSourceCount: number;
  completedAt: string | null;
};

type ControlSurfacePlan = {
  label: string;
  objective: string;
  sectionHeading: string;
  guidance: string;
  nextStep: string;
};

const clean = (value: string | null | undefined, limit: number) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);

const CONTROL_SURFACE_PLANS: Record<ResolutionControlSurface, ControlSurfacePlan> = {
  product: {
    label: "product",
    objective: "Turn the reviewed recommendation gap into a product change hypothesis grounded only in verified evidence.",
    sectionHeading: "Product change to evaluate",
    guidance: "Describe the capability, workflow, quality, integration, or product experience that the reviewed evidence shows is missing or weaker. Do not invent a feature requirement that the evidence does not support.",
    nextStep: "Assign the product change hypothesis to the appropriate product owner or team, validate it against customer and technical evidence, and place an approved change on the roadmap before implementation.",
  },
  pricing_offer: {
    label: "pricing / offer",
    objective: "Turn the reviewed recommendation gap into a pricing or offer change hypothesis grounded only in verified evidence.",
    sectionHeading: "Pricing or offer change to evaluate",
    guidance: "Identify the verified price, packaging, trial, contract, guarantee, implementation, or commercial-friction gap. Do not invent competitor pricing or willingness-to-pay evidence.",
    nextStep: "Assign the commercial hypothesis to the pricing or revenue owner, validate margin and customer implications, then approve a bounded pricing or offer experiment before applying it.",
  },
  positioning: {
    label: "positioning",
    objective: "Turn the reviewed recommendation gap into a clearer positioning change grounded only in verified evidence.",
    sectionHeading: "Positioning change to evaluate",
    guidance: "Clarify the audience, use case, category, differentiated capability, or decision criterion supported by the reviewed evidence. Do not create unsupported superiority claims.",
    nextStep: "Have the positioning owner review the proposed language against product truth and customer evidence, approve the change, and apply it consistently to the selected customer-controlled surfaces.",
  },
  documentation: {
    label: "documentation",
    objective: "Turn the reviewed recommendation gap into a documentation improvement grounded only in verified evidence.",
    sectionHeading: "Documentation change to evaluate",
    guidance: "Identify missing or unclear product, integration, security, implementation, specification, or support documentation supported by the reviewed evidence. Preserve dates and limitations.",
    nextStep: "Assign the documentation work to the owning team, verify every factual statement with the source record, publish only after approval, and record the final documentation reference.",
  },
  product_feed: {
    label: "product feed / structured data",
    objective: "Turn the reviewed recommendation gap into a structured product-data correction grounded only in verified evidence.",
    sectionHeading: "Product-data change to evaluate",
    guidance: "Identify stale, missing, or conflicting structured facts such as product name, description, price, availability, identifiers, specifications, or canonical links. Do not manufacture values that are not verified.",
    nextStep: "Have the commerce or data owner validate the authoritative values, update the applicable product feed or structured-data source, and record where the corrected data was applied.",
  },
  website: {
    label: "website",
    objective: "Turn the reviewed recommendation gap into a factual website improvement grounded only in verified evidence.",
    sectionHeading: "Website change to evaluate",
    guidance: "Identify the customer-controlled page, factual presentation, crawlable content, information architecture, or clarity issue supported by the reviewed evidence. Do not add unsupported claims for retrieval purposes.",
    nextStep: "Assign the website change to the owning team, review the evidence-backed copy or technical change, approve it, publish it, and record the exact page or pull request where it was applied.",
  },
  case_study: {
    label: "case study / proof",
    objective: "Turn the reviewed recommendation gap into a legitimate customer-proof improvement grounded only in verified evidence.",
    sectionHeading: "Proof change to evaluate",
    guidance: "Identify the outcome, use case, customer evidence, validation, or proof gap that can be addressed with authentic records. Never fabricate a customer, quote, review, benchmark, or outcome.",
    nextStep: "Assign the proof request to the customer-success or evidence owner, obtain the required customer permission and verification, then publish only the substantiated case study or proof record.",
  },
  policy: {
    label: "policy",
    objective: "Turn the reviewed recommendation gap into a customer-facing policy change hypothesis grounded only in verified evidence.",
    sectionHeading: "Policy change to evaluate",
    guidance: "Identify the warranty, return, SLA, security, privacy, support, onboarding, procurement, or service-policy gap supported by the reviewed evidence. Do not promise terms the company has not approved operationally.",
    nextStep: "Assign the policy hypothesis to the accountable business and legal or operational owner, validate feasibility and risk, approve the final terms, and record the authoritative policy location.",
  },
};

export function buildResolutionProposal(input: {
  type: ResolutionAssetType;
  problem: ResolutionProblem;
  evidence: VerifiedResolutionEvidence[];
  controlSurface?: ResolutionControlSurface;
}): { title: string; problemStatement: string; proposal: ResolutionProposal; limitations: string[] } {
  if (!RESOLUTION_ASSET_TYPES.includes(input.type)) throw new Error("Unsupported resolution asset type.");
  if (input.controlSurface && !RESOLUTION_CONTROL_SURFACES.includes(input.controlSurface)) throw new Error("Unsupported controllable change surface.");
  if (!input.evidence.length || input.evidence.some((entry) => entry.verification !== "verified")) {
    throw new Error("A resolution asset requires reviewed workspace evidence.");
  }
  const problemTitle = clean(input.problem.title, 180);
  const sourceTitle = clean(input.problem.sourceTitle || input.problem.sourceUrl, 180);
  const evidenceIds = input.evidence.map((entry) => entry.id);
  const observationEvidence = input.evidence.filter((entry) => entry.kind === "source_observation").slice(0, 5);
  const surfacePlan = input.controlSurface ? CONTROL_SURFACE_PLANS[input.controlSurface] : null;
  const limitations = [
    "This is a deterministic working brief built only from evidence already verified in this workspace.",
    "Every publishable statement still requires a person to check the linked source, date, scope, and usage rights.",
    "A later answer change is an observed association, not proof that this asset caused the change.",
    ...(surfacePlan ? [
      "This plan does not guarantee a specific AI outcome. " +
      "It cannot make an AI system mention, rank, or recommend the company; it only targets a customer-owned change surface.",
    ] : []),
  ];

  const surfaceSection = surfacePlan ? [{
    heading: surfacePlan.sectionHeading,
    guidance: surfacePlan.guidance,
    evidenceIds,
  }] : [];
  const common = {
    schemaVersion: "1.0" as const,
    assetType: input.type,
    ...(input.controlSurface ? { controlLevel: "controllable" as const, controlSurface: input.controlSurface } : {}),
    evidenceBoundary: "Use only the linked evidence records. Copy buyer-question wording only from the persisted historical observation, never from the current editable question library. Do not add rankings, traffic, revenue, customer, or product claims that those records do not directly support.",
  };
  const objectiveFor = (fallback: string) => surfacePlan ? surfacePlan.objective : fallback;
  const nextStepFor = (fallback: string) => surfacePlan ? surfacePlan.nextStep : fallback;

  if (input.type === "comparison_brief") {
    return {
      title: `Comparison brief: ${problemTitle}`,
      problemStatement: problemTitle,
      limitations,
      proposal: {
        ...common,
        headline: surfacePlan ? `Evaluate a ${surfacePlan.label} change for ${problemTitle}` : `Build an inspectable comparison around ${sourceTitle}`,
        objective: objectiveFor("Address the observed opportunity without claiming that Foremention controls how an AI provider ranks or recommends brands."),
        draftSections: [
          ...surfaceSection,
          { heading: "Buyer decision", guidance: "Open the linked reviewed observation and copy the exact persisted buyer question before drafting. Do not substitute the current question-library wording.", evidenceIds },
          { heading: "Verified comparison criteria", guidance: "Extract only criteria explicitly supported by the linked records; mark every unsupported field as unknown.", evidenceIds },
          { heading: "Evidence and limitations", guidance: "Cite each source, its observation date, provider context, and the limits of the comparison.", evidenceIds },
        ],
        nextStep: nextStepFor("A reviewer should fill the comparison fields from the linked records, request approval, then apply the approved draft in a customer-controlled tool."),
      },
    };
  }
  if (input.type === "faq_evidence_brief") {
    const sections = observationEvidence.length
      ? observationEvidence.map((entry, index) => ({
          heading: `Reviewed buyer question ${index + 1}`,
          guidance: "Open this linked observation, copy its exact persisted buyer-question wording, then draft the answer only from its linked records. If the evidence does not answer that historical question, say the answer is not yet supported.",
          evidenceIds: [entry.id],
        }))
      : [{
          heading: "Reviewed buyer question",
          guidance: "Open the linked verified evidence and identify the exact persisted buyer question before drafting. If the evidence does not support an answer, say the answer is not yet supported.",
          evidenceIds,
        }];
    return {
      title: `FAQ evidence brief: ${problemTitle}`,
      problemStatement: problemTitle,
      limitations,
      proposal: {
        ...common,
        headline: surfacePlan ? `Evaluate a ${surfacePlan.label} change for ${problemTitle}` : "Answer recurring buyer questions with dated evidence",
        objective: objectiveFor("Prepare an FAQ draft that separates verified facts from unknowns and from Foremention inference."),
        draftSections: [...surfaceSection, ...sections],
        nextStep: nextStepFor("A reviewer should copy each exact historical buyer question from its linked observation, write the evidence-backed answer, preserve the citations, and submit the FAQ brief for approval."),
      },
    };
  }
  return {
    title: `Source-page brief: ${sourceTitle}`,
    problemStatement: problemTitle,
    limitations,
    proposal: {
      ...common,
      headline: surfacePlan ? `Evaluate a ${surfacePlan.label} change for ${problemTitle}` : `Prepare a legitimate source-page improvement for ${sourceTitle}`,
      objective: objectiveFor("Create a source-specific brief that makes the reviewed evidence easier to inspect without fabricating endorsement or editorial access."),
      draftSections: [
        ...surfaceSection,
        { heading: "Observed gap", guidance: `Describe only the reviewed gap recorded as: ${problemTitle}.`, evidenceIds },
        { heading: "Evidence to add or clarify", guidance: "List the verified facts, links, dates, and usage boundaries available for an editor or site owner to review.", evidenceIds },
        { heading: "Legitimate application route", guidance: clean(input.problem.nextAction, 500) || "Choose a customer-controlled page update or a transparent editorial correction request.", evidenceIds },
      ],
      nextStep: nextStepFor("A reviewer should confirm the route, approve the brief, and record the actual destination when it is applied."),
    },
  };
}

export function compareResolutionRuns(baseline: RunMeasurement, followUp: RunMeasurement) {
  const delta = (after: number, before: number) => Number((after - before).toFixed(2));
  return {
    baselineRunId: baseline.id,
    followUpRunId: followUp.id,
    baselineCompletedAt: baseline.completedAt,
    followUpCompletedAt: followUp.completedAt,
    brandPresencePct: { before: baseline.brandPresencePct, after: followUp.brandPresencePct, delta: delta(followUp.brandPresencePct, baseline.brandPresencePct) },
    firstMentionPct: { before: baseline.firstMentionPct, after: followUp.firstMentionPct, delta: delta(followUp.firstMentionPct, baseline.firstMentionPct) },
    citationCount: { before: baseline.citationCount, after: followUp.citationCount, delta: followUp.citationCount - baseline.citationCount },
    newSourceCount: { before: baseline.newSourceCount, after: followUp.newSourceCount, delta: followUp.newSourceCount - baseline.newSourceCount },
    interpretation: "Observed before-and-after association only. This record does not establish that the applied resolution caused the change.",
  };
}
