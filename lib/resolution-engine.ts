export const RESOLUTION_ASSET_TYPES = ["comparison_brief", "faq_evidence_brief", "source_page_brief"] as const;
export type ResolutionAssetType = typeof RESOLUTION_ASSET_TYPES[number];

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

const clean = (value: string | null | undefined, limit: number) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);

export function buildResolutionProposal(input: {
  type: ResolutionAssetType;
  problem: ResolutionProblem;
  evidence: VerifiedResolutionEvidence[];
}): { title: string; problemStatement: string; proposal: ResolutionProposal; limitations: string[] } {
  if (!RESOLUTION_ASSET_TYPES.includes(input.type)) throw new Error("Unsupported resolution asset type.");
  if (!input.evidence.length || input.evidence.some((entry) => entry.verification !== "verified")) {
    throw new Error("A resolution asset requires reviewed workspace evidence.");
  }
  const problemTitle = clean(input.problem.title, 180);
  const sourceTitle = clean(input.problem.sourceTitle || input.problem.sourceUrl, 180);
  const evidenceIds = input.evidence.map((entry) => entry.id);
  const questions = Array.from(new Set(input.evidence.map((entry) => clean(entry.question, 300)).filter(Boolean))).slice(0, 5);
  const limitations = [
    "This is a deterministic working brief built only from evidence already verified in this workspace.",
    "Every publishable statement still requires a person to check the linked source, date, scope, and usage rights.",
    "A later answer change is an observed association, not proof that this asset caused the change.",
  ];

  const common = {
    schemaVersion: "1.0" as const,
    assetType: input.type,
    evidenceBoundary: "Use only the linked evidence records. Do not add rankings, traffic, revenue, customer, or product claims that those records do not directly support.",
  };
  if (input.type === "comparison_brief") {
    return {
      title: `Comparison brief: ${problemTitle}`,
      problemStatement: problemTitle,
      limitations,
      proposal: {
        ...common,
        headline: `Build an inspectable comparison around ${sourceTitle}`,
        objective: `Address the observed opportunity without claiming that Foremention controls how an AI provider ranks or recommends brands.`,
        draftSections: [
          { heading: "Buyer decision", guidance: questions[0] || "State the exact buyer question represented by the reviewed observation.", evidenceIds },
          { heading: "Verified comparison criteria", guidance: "Extract only criteria explicitly supported by the linked records; mark every unsupported field as unknown.", evidenceIds },
          { heading: "Evidence and limitations", guidance: "Cite each source, its observation date, provider context, and the limits of the comparison.", evidenceIds },
        ],
        nextStep: "A reviewer should fill the comparison fields from the linked records, request approval, then apply the approved draft in a customer-controlled tool.",
      },
    };
  }
  if (input.type === "faq_evidence_brief") {
    return {
      title: `FAQ evidence brief: ${problemTitle}`,
      problemStatement: problemTitle,
      limitations,
      proposal: {
        ...common,
        headline: `Answer recurring buyer questions with dated evidence`,
        objective: "Prepare an FAQ draft that separates verified facts from unknowns and from Foremention inference.",
        draftSections: (questions.length ? questions : ["What evidence supports this answer?"]).map((question) => ({
          heading: question,
          guidance: "Draft the answer only from the linked records. If the evidence does not answer the question, say that the answer is not yet supported.",
          evidenceIds,
        })),
        nextStep: "A reviewer should write the evidence-backed answers, preserve the citations, and submit the FAQ brief for approval.",
      },
    };
  }
  return {
    title: `Source-page brief: ${sourceTitle}`,
    problemStatement: problemTitle,
    limitations,
    proposal: {
      ...common,
      headline: `Prepare a legitimate source-page improvement for ${sourceTitle}`,
      objective: "Create a source-specific brief that makes the reviewed evidence easier to inspect without fabricating endorsement or editorial access.",
      draftSections: [
        { heading: "Observed gap", guidance: `Describe only the reviewed gap recorded as: ${problemTitle}.`, evidenceIds },
        { heading: "Evidence to add or clarify", guidance: "List the verified facts, links, dates, and usage boundaries available for an editor or site owner to review.", evidenceIds },
        { heading: "Legitimate application route", guidance: clean(input.problem.nextAction, 500) || "Choose a customer-controlled page update or a transparent editorial correction request.", evidenceIds },
      ],
      nextStep: "A reviewer should confirm the route, approve the brief, and record the actual destination when it is applied.",
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
