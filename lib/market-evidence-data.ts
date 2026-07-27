export type MarketEvidenceRecord = {
  company: string;
  domain: string;
  officialUrl: string;
  observed: string;
  evidenceBoundary: string;
};

export const marketEvidenceSnapshot = {
  buyerQuestion: "Which platforms help marketing teams measure brand visibility in AI answers?",
  collectedAt: "2026-07-27",
  recordType: "First-party product-page observations",
};

export const marketEvidenceRecords: MarketEvidenceRecord[] = [
  {
    company: "Profound",
    domain: "tryprofound.com",
    officialUrl: "https://www.tryprofound.com/features/answer-engine-insights",
    observed:
      "Its Answer Engine Insights page describes visibility and share-of-voice tracking, citation sources, competitor rankings, prompt tracking, and CSV export.",
    evidenceBoundary:
      "This verifies Profound's published product description. It does not independently validate its measurements or prove an AI engine cited the page.",
  },
  {
    company: "Scrunch",
    domain: "scrunch.com",
    officialUrl: "https://scrunch.com/",
    observed:
      "Its public platform page describes prompt analytics, citations, competitor benchmarking, AI-bot traffic, crawl diagnostics, and an agent-facing delivery layer.",
    evidenceBoundary:
      "This is a dated observation of Scrunch's own claims, not a Foremention endorsement or a measured customer outcome.",
  },
  {
    company: "Peec AI",
    domain: "peec.ai",
    officialUrl: "https://peec.ai/",
    observed:
      "Its public FAQ separates brand mentions from source citations and describes daily prompt execution, model and country segmentation, exports, an API, and MCP access.",
    evidenceBoundary:
      "This confirms what the official page currently says. Provider accuracy, coverage, and customer results remain unverified here.",
  },
  {
    company: "OtterlyAI",
    domain: "otterly.ai",
    officialUrl: "https://otterly.ai/features/",
    observed:
      "Its features page describes prompt research, brand and domain citation tracking, competitive benchmarking, crawlability checks, exports, API access, and weekly link monitoring.",
    evidenceBoundary:
      "This is first-party product evidence. It is not proof of ranking, citation causation, or independent product performance.",
  },
];
