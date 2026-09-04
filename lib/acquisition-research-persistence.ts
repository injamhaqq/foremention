import type { NormalizedAcquisitionCandidate } from "@/lib/acquisition-discovery";
import type { AcquisitionResearchAssessment, AcquisitionResearchFact } from "@/lib/acquisition-research";
import { SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";

const COMPANY_KEY_PATTERN = /^(domain|name)-[a-z0-9][a-z0-9.-]{0,253}[a-z0-9]$/;

type CommercialAccountIdentity = {
  id: string;
  canonical_company_key: string | null;
};

type AcquisitionResearchRunIdentity = {
  id: string;
  run_key: string;
};

export type PersistedDiscoveryIdentity = {
  accountId: string;
  researchRunId: string;
  canonicalCompanyKey: string;
};

export type DiscoveryPersistenceRecords = {
  account: {
    company_name: string;
    domain: string | null;
    lead_source: "autopilot_public_discovery";
    channel: "research";
  };
  run: {
    run_key: string;
    canonical_company_key: string;
    completed_at: string;
    qualification_score: 0;
    qualification_reasons: ["DISCOVERY_ONLY"];
    score_breakdown: Record<string, never>;
    why_now: null;
    disqualifiers: [];
    qualified_shadow: false;
  };
  evidence: {
    source_url: string;
    retrieved_at: string;
    evidence_key: "discovery_source";
    evidence_value: string;
    confidence: 100;
  };
};

export type ResearchAssessmentPersistenceRecords = {
  runPatch: {
    completed_at: string;
    qualification_score: number;
    qualification_reasons: string[];
    score_breakdown: AcquisitionResearchAssessment["scores"];
    why_now: string | null;
    disqualifiers: string[];
    qualified_shadow: boolean;
  };
  evidence: Array<{
    source_url: string;
    retrieved_at: string;
    evidence_key: string;
    evidence_value: string;
    confidence: number;
  }>;
};

function stableHash32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function boundedEvidenceValue(candidate: NormalizedAcquisitionCandidate) {
  const provider = candidate.providerId.trim().slice(0, 80);
  const request = candidate.providerRequestId?.trim().slice(0, 120) || "none";
  return `Public company discovery via ${provider}; provider request ${request}.`.slice(0, 4000);
}

function latestRetrievedAt(facts: readonly AcquisitionResearchFact[]) {
  let latest = 0;
  for (const fact of facts) latest = Math.max(latest, Date.parse(fact.retrievedAt));
  if (!Number.isFinite(latest) || latest <= 0) throw new Error("ACQUISITION_PERSISTENCE_RESEARCH_TIMESTAMP_REQUIRED");
  return new Date(latest).toISOString();
}

function researchEvidenceKey(fact: AcquisitionResearchFact, collisions: ReadonlyMap<string, number>) {
  const collisionKey = `${fact.sourceUrl}\n${fact.key}`;
  if ((collisions.get(collisionKey) ?? 0) <= 1) return fact.key;
  return `${fact.key}-${stableHash32(fact.value.toLowerCase(), 2166136261)}`.slice(0, 120);
}

export function discoveryRunKey(canonicalCompanyKey: string, retrievedAt: string) {
  if (!COMPANY_KEY_PATTERN.test(canonicalCompanyKey)) {
    throw new Error("ACQUISITION_PERSISTENCE_INVALID_COMPANY_KEY");
  }
  const timestamp = Date.parse(retrievedAt);
  if (!Number.isFinite(timestamp)) throw new Error("ACQUISITION_PERSISTENCE_INVALID_TIMESTAMP");
  const day = new Date(timestamp).toISOString().slice(0, 10);
  const digest = `${stableHash32(canonicalCompanyKey, 2166136261)}${stableHash32(canonicalCompanyKey, 2246822519)}`;
  return `discovery-${day}-${digest}`;
}

export function buildDiscoveryPersistenceRecords(candidate: NormalizedAcquisitionCandidate): DiscoveryPersistenceRecords {
  if (!COMPANY_KEY_PATTERN.test(candidate.canonicalCompanyKey)) {
    throw new Error("ACQUISITION_PERSISTENCE_INVALID_COMPANY_KEY");
  }
  if (!candidate.sourceUrl.startsWith("https://")) {
    throw new Error("ACQUISITION_PERSISTENCE_INVALID_SOURCE_URL");
  }
  const timestamp = Date.parse(candidate.retrievedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) {
    throw new Error("ACQUISITION_PERSISTENCE_INVALID_TIMESTAMP");
  }

  const retrievedAt = new Date(timestamp).toISOString();
  return {
    account: {
      company_name: candidate.companyName,
      domain: candidate.domain,
      lead_source: "autopilot_public_discovery",
      channel: "research",
    },
    run: {
      run_key: discoveryRunKey(candidate.canonicalCompanyKey, retrievedAt),
      canonical_company_key: candidate.canonicalCompanyKey,
      completed_at: retrievedAt,
      qualification_score: 0,
      qualification_reasons: ["DISCOVERY_ONLY"],
      score_breakdown: {},
      why_now: null,
      disqualifiers: [],
      qualified_shadow: false,
    },
    evidence: {
      source_url: candidate.sourceUrl,
      retrieved_at: retrievedAt,
      evidence_key: "discovery_source",
      evidence_value: boundedEvidenceValue(candidate),
      confidence: 100,
    },
  };
}

export function buildResearchAssessmentPersistenceRecords(
  assessment: AcquisitionResearchAssessment,
): ResearchAssessmentPersistenceRecords {
  if (assessment.facts.length === 0) throw new Error("ACQUISITION_PERSISTENCE_RESEARCH_FACTS_REQUIRED");

  const collisions = new Map<string, number>();
  for (const fact of assessment.facts) {
    const key = `${fact.sourceUrl}\n${fact.key}`;
    collisions.set(key, (collisions.get(key) ?? 0) + 1);
  }

  return {
    runPatch: {
      completed_at: latestRetrievedAt(assessment.facts),
      qualification_score: assessment.qualification.score,
      qualification_reasons: [...assessment.qualification.reasonCodes],
      score_breakdown: assessment.scores,
      why_now: assessment.qualification.whyNow,
      disqualifiers: [...assessment.disqualifiers],
      qualified_shadow: assessment.qualification.qualified,
    },
    evidence: assessment.facts.map((fact) => ({
      source_url: fact.sourceUrl,
      retrieved_at: fact.retrievedAt,
      evidence_key: researchEvidenceKey(fact, collisions),
      evidence_value: fact.value.slice(0, 4000),
      confidence: fact.confidence,
    })),
  };
}

async function findAccount(canonicalCompanyKey: string) {
  const rows = await supabaseRest<CommercialAccountIdentity[]>(
    `commercial_accounts?select=id,canonical_company_key&canonical_company_key=eq.${encodeURIComponent(canonicalCompanyKey)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function ensureAccount(candidate: NormalizedAcquisitionCandidate, records: DiscoveryPersistenceRecords) {
  const existing = await findAccount(candidate.canonicalCompanyKey);
  if (existing) return existing;

  try {
    const created = await supabaseRest<CommercialAccountIdentity[]>(
      "commercial_accounts?select=id,canonical_company_key",
      {
        method: "POST",
        serviceRole: true,
        body: { ...records.account, canonical_company_key: candidate.canonicalCompanyKey },
        prefer: "return=representation",
      },
    );
    if (created[0]) return created[0];
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await findAccount(candidate.canonicalCompanyKey);
  if (!raced) throw new Error("ACQUISITION_PERSISTENCE_ACCOUNT_CONFLICT_UNRESOLVED");
  return raced;
}

async function findResearchRun(runKey: string) {
  const rows = await supabaseRest<AcquisitionResearchRunIdentity[]>(
    `acquisition_research_runs?select=id,run_key&run_key=eq.${encodeURIComponent(runKey)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function ensureResearchRun(
  account: CommercialAccountIdentity,
  records: DiscoveryPersistenceRecords,
) {
  const existing = await findResearchRun(records.run.run_key);
  if (existing) return existing;

  if (account.canonical_company_key !== records.run.canonical_company_key) {
    throw new Error("ACQUISITION_PERSISTENCE_ACCOUNT_IDENTITY_MISMATCH");
  }

  try {
    const created = await supabaseRest<AcquisitionResearchRunIdentity[]>(
      "acquisition_research_runs?select=id,run_key",
      {
        method: "POST",
        serviceRole: true,
        body: { ...records.run, account_id: account.id },
        prefer: "return=representation",
      },
    );
    if (created[0]) return created[0];
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await findResearchRun(records.run.run_key);
  if (!raced) throw new Error("ACQUISITION_PERSISTENCE_RUN_CONFLICT_UNRESOLVED");
  return raced;
}

export async function persistDiscoveredAcquisitionCandidate(candidate: NormalizedAcquisitionCandidate): Promise<PersistedDiscoveryIdentity> {
  const records = buildDiscoveryPersistenceRecords(candidate);
  const account = await ensureAccount(candidate, records);
  const researchRun = await ensureResearchRun(account, records);

  await supabaseRest(
    "acquisition_research_evidence?on_conflict=research_run_id,source_url,evidence_key",
    {
      method: "POST",
      serviceRole: true,
      body: { ...records.evidence, research_run_id: researchRun.id },
      prefer: "resolution=ignore-duplicates,return=minimal",
    },
  );

  return {
    accountId: account.id,
    researchRunId: researchRun.id,
    canonicalCompanyKey: candidate.canonicalCompanyKey,
  };
}

export async function persistDiscoveredAcquisitionCandidates(candidates: readonly NormalizedAcquisitionCandidate[]) {
  const persisted: PersistedDiscoveryIdentity[] = [];
  for (const candidate of candidates) persisted.push(await persistDiscoveredAcquisitionCandidate(candidate));
  return persisted;
}

export async function persistAcquisitionResearchAssessment(
  identity: PersistedDiscoveryIdentity,
  assessment: AcquisitionResearchAssessment,
) {
  if (!COMPANY_KEY_PATTERN.test(identity.canonicalCompanyKey)) {
    throw new Error("ACQUISITION_PERSISTENCE_INVALID_COMPANY_KEY");
  }
  const records = buildResearchAssessmentPersistenceRecords(assessment);

  const updated = await supabaseRest<Array<{ id: string }>>(
    `acquisition_research_runs?id=eq.${encodeURIComponent(identity.researchRunId)}&account_id=eq.${encodeURIComponent(identity.accountId)}&canonical_company_key=eq.${encodeURIComponent(identity.canonicalCompanyKey)}&select=id`,
    {
      method: "PATCH",
      serviceRole: true,
      body: records.runPatch,
      prefer: "return=representation",
    },
  );
  if (updated.length !== 1) throw new Error("ACQUISITION_PERSISTENCE_RESEARCH_RUN_NOT_FOUND");

  for (const evidence of records.evidence) {
    await supabaseRest(
      "acquisition_research_evidence?on_conflict=research_run_id,source_url,evidence_key",
      {
        method: "POST",
        serviceRole: true,
        body: { ...evidence, research_run_id: identity.researchRunId },
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
    );
  }

  return {
    researchRunId: identity.researchRunId,
    qualifiedShadow: records.runPatch.qualified_shadow,
    qualificationScore: records.runPatch.qualification_score,
    evidenceCount: records.evidence.length,
  };
}
