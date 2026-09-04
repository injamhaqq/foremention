import { SupabaseRequestError, supabaseRest } from "./supabase-rest.ts";

export type AcquisitionShadowTerminalStatus =
  | "disabled"
  | "provider_unavailable"
  | "schema_unavailable"
  | "shadow_drafted"
  | "failed";

export type AcquisitionShadowResult = {
  status: AcquisitionShadowTerminalStatus;
  candidateCount?: number;
  persistedCount?: number;
  researchedCount?: number;
  qualifiedShadowCount?: number;
  contactResolvedCount?: number;
  draftCreatedCount?: number;
  discoveryCreditsUsed?: number;
  researchCreditsUsed?: number;
  contactCreditsUsed?: number;
  errorCode?: string | null;
};

export type AcquisitionShadowRequestRow = {
  request_key: string;
  release_sha: string;
  github_run_id: string;
  github_run_attempt: number;
  status: "requested" | "running" | AcquisitionShadowTerminalStatus;
  inngest_event_id: string | null;
  candidate_count: number;
  persisted_count: number;
  researched_count: number;
  qualified_shadow_count: number;
  contact_resolved_count: number;
  draft_created_count: number;
  discovery_credits_used: number;
  research_credits_used: number;
  contact_credits_used: number;
  error_code: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type ShadowIdentity = {
  releaseSha: string;
  githubRunId: string;
  githubRunAttempt: number;
};

const REQUEST_KEY_PATTERN = /^shadow-[a-f0-9]{12}-[0-9]+-[0-9]+$/;
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/;

function boundedInteger(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export function acquisitionShadowRequestKey(identity: ShadowIdentity) {
  const releaseSha = identity.releaseSha.trim().toLowerCase();
  const githubRunId = identity.githubRunId.trim();
  if (!RELEASE_SHA_PATTERN.test(releaseSha)) throw new Error("ACQUISITION_SHADOW_RELEASE_SHA_INVALID");
  if (!/^\d+$/.test(githubRunId)) throw new Error("ACQUISITION_SHADOW_RUN_ID_INVALID");
  if (!Number.isInteger(identity.githubRunAttempt) || identity.githubRunAttempt < 1 || identity.githubRunAttempt > 1000) {
    throw new Error("ACQUISITION_SHADOW_RUN_ATTEMPT_INVALID");
  }
  return `shadow-${releaseSha.slice(0, 12)}-${githubRunId}-${identity.githubRunAttempt}`;
}

export async function loadAcquisitionShadowRequest(requestKey: string) {
  if (!REQUEST_KEY_PATTERN.test(requestKey)) throw new Error("ACQUISITION_SHADOW_REQUEST_KEY_INVALID");
  const rows = await supabaseRest<AcquisitionShadowRequestRow[]>(
    `acquisition_shadow_requests?select=*&request_key=eq.${encodeURIComponent(requestKey)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

export async function createOrLoadAcquisitionShadowRequest(identity: ShadowIdentity) {
  const requestKey = acquisitionShadowRequestKey(identity);
  const existing = await loadAcquisitionShadowRequest(requestKey);
  if (existing) return existing;

  try {
    const rows = await supabaseRest<AcquisitionShadowRequestRow[]>(
      "acquisition_shadow_requests?select=*",
      {
        method: "POST",
        serviceRole: true,
        body: {
          request_key: requestKey,
          release_sha: identity.releaseSha.toLowerCase(),
          github_run_id: identity.githubRunId,
          github_run_attempt: identity.githubRunAttempt,
          status: "requested",
        },
        prefer: "return=representation",
      },
    );
    if (rows[0]) return rows[0];
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await loadAcquisitionShadowRequest(requestKey);
  if (!raced) throw new Error("ACQUISITION_SHADOW_REQUEST_CONFLICT");
  return raced;
}

export async function markAcquisitionShadowDispatched(requestKey: string, eventId: string | null) {
  const rows = await supabaseRest<AcquisitionShadowRequestRow[]>(
    `acquisition_shadow_requests?select=*&request_key=eq.${encodeURIComponent(requestKey)}&status=eq.requested`,
    {
      method: "PATCH",
      serviceRole: true,
      body: { inngest_event_id: eventId, updated_at: new Date().toISOString() },
      prefer: "return=representation",
    },
  );
  return rows[0] ?? await loadAcquisitionShadowRequest(requestKey);
}

export async function markAcquisitionShadowRunning(requestKey: string) {
  const now = new Date().toISOString();
  await supabaseRest(
    `acquisition_shadow_requests?request_key=eq.${encodeURIComponent(requestKey)}&status=eq.requested`,
    {
      method: "PATCH",
      serviceRole: true,
      body: { status: "running", started_at: now, updated_at: now },
      prefer: "return=minimal",
    },
  );
}

export async function finishAcquisitionShadowRequest(requestKey: string, result: AcquisitionShadowResult) {
  const now = new Date().toISOString();
  const body = {
    status: result.status,
    candidate_count: boundedInteger(result.candidateCount),
    persisted_count: boundedInteger(result.persistedCount),
    researched_count: boundedInteger(result.researchedCount),
    qualified_shadow_count: boundedInteger(result.qualifiedShadowCount),
    contact_resolved_count: boundedInteger(result.contactResolvedCount),
    draft_created_count: boundedInteger(result.draftCreatedCount),
    discovery_credits_used: boundedInteger(result.discoveryCreditsUsed),
    research_credits_used: boundedInteger(result.researchCreditsUsed),
    contact_credits_used: boundedInteger(result.contactCreditsUsed),
    error_code: typeof result.errorCode === "string" ? result.errorCode.slice(0, 200) : null,
    completed_at: now,
    updated_at: now,
  };
  await supabaseRest(
    `acquisition_shadow_requests?request_key=eq.${encodeURIComponent(requestKey)}`,
    { method: "PATCH", serviceRole: true, body, prefer: "return=minimal" },
  );
}

export function publicAcquisitionShadowRequest(row: AcquisitionShadowRequestRow) {
  return {
    requestKey: row.request_key,
    releaseSha: row.release_sha,
    status: row.status,
    candidateCount: row.candidate_count,
    persistedCount: row.persisted_count,
    researchedCount: row.researched_count,
    qualifiedShadowCount: row.qualified_shadow_count,
    contactResolvedCount: row.contact_resolved_count,
    draftCreatedCount: row.draft_created_count,
    discoveryCreditsUsed: row.discovery_credits_used,
    researchCreditsUsed: row.research_credits_used,
    contactCreditsUsed: row.contact_credits_used,
    errorCode: row.error_code,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}
