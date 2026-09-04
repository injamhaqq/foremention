import type { NormalizedAcquisitionCandidate } from "./acquisition-discovery.ts";
import { SupabaseRequestError, supabaseRest } from "./supabase-rest.ts";

const COMPANY_KEY_PATTERN = /^(domain|name)-[a-z0-9][a-z0-9.-]{0,253}[a-z0-9]$/;

type CommercialAccountIdentity = {
  id: string;
  canonical_company_key: string | null;
};

type AcquisitionResearchRunIdentity = {
  id: string;
  run_key: string;
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

export async function persistDiscoveredAcquisitionCandidate(candidate: NormalizedAcquisitionCandidate) {
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
  const persisted = [];
  for (const candidate of candidates) {
    persisted.push(await persistDiscoveredAcquisitionCandidate(candidate));
  }
  return persisted;
}
