import {
  qualifyAcquisitionCandidate,
  type AcquisitionQualificationResult,
  type AcquisitionScoreDimension,
} from "@/lib/acquisition-qualification";

export const ACQUISITION_RESEARCH_FACT_KEYS = [
  "company_category",
  "employee_band",
  "seo_content_motion",
  "ai_search_motion",
  "buyer_question",
  "competitor",
  "intervention_signal",
  "recommendation_exposure",
  "measurement_signal",
  "buyer_role",
  "recent_trigger",
  "disqualifier",
] as const;

export type AcquisitionResearchFactKey = (typeof ACQUISITION_RESEARCH_FACT_KEYS)[number];

export type AcquisitionResearchFact = {
  key: AcquisitionResearchFactKey;
  value: string;
  sourceUrl: string;
  retrievedAt: string;
  confidence: number;
};

export type AcquisitionResearchAssessment = {
  facts: AcquisitionResearchFact[];
  sourceCount: number;
  scores: Record<AcquisitionScoreDimension, number>;
  disqualifiers: string[];
  qualification: AcquisitionQualificationResult;
};

const FACT_KEY_SET = new Set<string>(ACQUISITION_RESEARCH_FACT_KEYS);

function normalizeText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, max);
  return normalized || null;
}

function normalizeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) return null;
  return new Date(timestamp).toISOString();
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

function sourceHostname(url: string) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function countFacts(facts: readonly AcquisitionResearchFact[], key: AcquisitionResearchFactKey) {
  return facts.filter((fact) => fact.key === key).length;
}

function boundedScore(count: number, fullThreshold: number, full: number, partial: number) {
  if (count >= fullThreshold) return full;
  return count > 0 ? partial : 0;
}

function disqualifierCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "PUBLIC_EVIDENCE_DISQUALIFIER";
}

export function normalizeAcquisitionResearchFacts(input: readonly unknown[]): AcquisitionResearchFact[] {
  const deduped = new Map<string, AcquisitionResearchFact>();

  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("ACQUISITION_RESEARCH_MALFORMED_FACT");
    }
    const record = item as Record<string, unknown>;
    const key = normalizeText(record.key, 80);
    const value = normalizeText(record.value, 2000);
    const sourceUrl = normalizeHttpsUrl(record.sourceUrl);
    const retrievedAt = normalizeTimestamp(record.retrievedAt);
    const confidence = normalizeConfidence(record.confidence);

    if (!key || !FACT_KEY_SET.has(key) || !value || !sourceUrl || !retrievedAt || confidence === null) {
      throw new Error("ACQUISITION_RESEARCH_MALFORMED_FACT");
    }

    const fact: AcquisitionResearchFact = {
      key: key as AcquisitionResearchFactKey,
      value,
      sourceUrl,
      retrievedAt,
      confidence,
    };
    const dedupeKey = `${fact.key}\n${fact.value.toLowerCase()}\n${fact.sourceUrl}`;
    const existing = deduped.get(dedupeKey);
    if (!existing || fact.confidence > existing.confidence) deduped.set(dedupeKey, fact);
  }

  return [...deduped.values()].sort((left, right) =>
    left.key.localeCompare(right.key) || left.sourceUrl.localeCompare(right.sourceUrl) || left.value.localeCompare(right.value),
  );
}

export function deriveAcquisitionResearchAssessment(input: readonly unknown[]): AcquisitionResearchAssessment {
  const facts = normalizeAcquisitionResearchFacts(input);
  const sourceHosts = new Set(facts.map((fact) => sourceHostname(fact.sourceUrl)));
  const sourceCount = sourceHosts.size;

  const scores: Record<AcquisitionScoreDimension, number> = {
    buyerQuestionCommercialFit: boundedScore(countFacts(facts, "buyer_question"), 2, 20, 10),
    competitiveDensity: boundedScore(countFacts(facts, "competitor"), 3, 15, 10),
    interventionCapability: boundedScore(countFacts(facts, "intervention_signal"), 2, 15, 8),
    aiDiscoveryUrgency:
      countFacts(facts, "ai_search_motion") > 0 ? 15 : countFacts(facts, "seo_content_motion") > 0 ? 7 : 0,
    evidenceSensitivity: boundedScore(countFacts(facts, "recommendation_exposure"), 2, 10, 6),
    measurementFit: boundedScore(countFacts(facts, "measurement_signal"), 2, 10, 6),
    budgetAuthorityPath: boundedScore(countFacts(facts, "buyer_role"), 2, 10, 6),
    thirtyDayActionability: countFacts(facts, "recent_trigger") > 0 ? 5 : 0,
  };

  const disqualifiers = new Set<string>();
  if (sourceCount < 2) disqualifiers.add("INSUFFICIENT_INDEPENDENT_SOURCES");

  for (const fact of facts) {
    if (fact.key === "employee_band") {
      const band = fact.value.trim().toLowerCase();
      if (band === "under-50" || band === "over-500") disqualifiers.add("SIZE_OUTSIDE_INITIAL_ICP");
    }
    if (fact.key === "disqualifier") disqualifiers.add(disqualifierCode(fact.value));
  }

  const recentTriggers = facts
    .filter((fact) => fact.key === "recent_trigger")
    .sort((left, right) => right.confidence - left.confidence || left.value.localeCompare(right.value));
  const whyNow = recentTriggers[0]?.value ?? null;

  const qualification = qualifyAcquisitionCandidate({
    scores,
    sourceCount,
    whyNow,
    disqualifiers: [...disqualifiers],
  });

  return {
    facts,
    sourceCount,
    scores,
    disqualifiers: [...disqualifiers].sort(),
    qualification,
  };
}
