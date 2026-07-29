export type Engine = "ChatGPT" | "Perplexity" | "Claude" | "Google AI" | "Groq Compound";
export type EntryRoute =
  | "editorial outreach"
  | "comparison inclusion"
  | "expert contribution"
  | "original research"
  | "legitimate review"
  | "community participation";

export type SourceMapEntry = {
  id: string;
  sourceId?: string;
  rank: number;
  domain: string;
  title: string;
  url: string;
  type: string;
  influence: "high" | "medium" | "low" | "emerging" | "unknown";
  engines: Engine[];
  clientPresent: boolean;
  competitors: string[];
  crawlerAccess: "open" | "partial" | "blocked" | "unknown";
  route: EntryRoute;
  feasibility: "high" | "medium" | "low" | "unknown";
  evidenceCount: number;
  reviewedAt?: string | null;
};

export type VisibilityRun = {
  id: string;
  date: string;
  status: "queued" | "complete" | "partial" | "cancelled" | "running" | "review" | "failed";
  errorSummary?: string | null;
  prompts: number;
  answers: number;
  citations: number;
  presence: number;
  firstMention: number;
  newSources: number;
};

export type Placement = {
  id: string;
  source: string;
  page: string;
  route: EntryRoute;
  owner: string;
  stage:
    | "identified"
    | "qualified"
    | "pitched"
    | "accepted"
    | "published"
    | "indexed"
    | "first cited"
    | "repeatedly cited"
    | "decayed"
    | "closed";
  updated: string;
  promptImpact: number;
};
