const FRESH_RESEARCH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type CeoCommercialAccountEvidence = {
  id: string;
};

export type CeoResearchRunEvidence = {
  id: string;
  account_id: string;
  qualification_score: number;
  why_now: string | null;
  disqualifiers: string[] | null;
  qualified_shadow: boolean;
  completed_at: string | null;
};

export type CeoResearchSourceEvidence = {
  research_run_id: string;
  source_url: string;
  retrieved_at: string;
};

export type CeoContactEvidence = {
  id: string;
  account_id: string;
  buyer_role: string | null;
  relationship_state: string | null;
  contact_route_status: string;
  contact_source_url: string | null;
  contact_verified_at: string | null;
};

export type CeoSuppressionEvidence = {
  account_id: string;
  contact_id: string;
  active: boolean;
};

export type CeoCommercialEventEvidence = {
  account_id: string;
  contact_id: string | null;
  event_type: string;
  occurred_at: string;
  recorded_by: string | null;
};

export type CeoCommercialEvidenceInput = {
  accounts: CeoCommercialAccountEvidence[];
  researchRuns: CeoResearchRunEvidence[];
  researchEvidence: CeoResearchSourceEvidence[];
  contacts: CeoContactEvidence[];
  suppressions: CeoSuppressionEvidence[];
  events: CeoCommercialEventEvidence[];
  boundedReadSaturated?: boolean;
  now?: string;
};

type EvidenceStatus =
  | "verified_account_level_denominators"
  | "bounded_read_saturated"
  | "invalid_evidence_clock";

export type CeoCommercialQualificationEvidence = {
  public_research_candidates: number | null;
  research_triage_qualified_candidates: number | null;
  verified_contact_route_candidates: number | null;
  conversation_evidence_qualified_accounts: number | null;
  verified_sales_qualified_accounts: null;
  evidence_status: EvidenceStatus;
  interpretation: string;
};

const CONVERSATION_EVENT_TYPES = new Set(["conversation_held", "discovery_held"]);
const BUYER_ROLES = new Set([
  "champion",
  "daily_user",
  "economic_buyer",
  "influencer",
  "technical_evaluator",
  "security",
  "procurement",
  "legal",
]);

function validUuidLike(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{16,}$/i.test(value.trim());
}

function timestampMs(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validHttps(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function blankMetrics(status: EvidenceStatus, interpretation: string): CeoCommercialQualificationEvidence {
  return {
    public_research_candidates: null,
    research_triage_qualified_candidates: null,
    verified_contact_route_candidates: null,
    conversation_evidence_qualified_accounts: null,
    verified_sales_qualified_accounts: null,
    evidence_status: status,
    interpretation,
  };
}

/**
 * Build nested acquisition denominators from independently recorded company
 * evidence. This function never upgrades an internal qualification flag into
 * buyer intent, consent, pipeline, customer status or revenue.
 */
export function assessCeoCommercialQualificationEvidence(
  input: CeoCommercialEvidenceInput,
): CeoCommercialQualificationEvidence {
  if (input.boundedReadSaturated) {
    return blankMetrics(
      "bounded_read_saturated",
      "At least one protected evidence read reached its sentinel bound, so account-level commercial denominators are withheld rather than calculated from a potentially truncated subset.",
    );
  }

  const now = timestampMs(input.now || new Date().toISOString());
  if (now === null) {
    return blankMetrics("invalid_evidence_clock", "The evidence clock is invalid, so dated acquisition evidence is withheld.");
  }

  const accountIds = new Set(input.accounts.map((row) => row.id).filter(validUuidLike));
  const sourcesByRun = new Map<string, CeoResearchSourceEvidence[]>();
  for (const source of input.researchEvidence) {
    if (!validHttps(source.source_url)) continue;
    const retrieved = timestampMs(source.retrieved_at);
    if (retrieved === null || retrieved > now + 5 * 60 * 1000) continue;
    const rows = sourcesByRun.get(source.research_run_id) || [];
    rows.push(source);
    sourcesByRun.set(source.research_run_id, rows);
  }

  const publicCandidates = new Set<string>();
  const triageQualified = new Set<string>();
  for (const run of input.researchRuns) {
    if (!accountIds.has(run.account_id) || !validUuidLike(run.id)) continue;
    const completed = timestampMs(run.completed_at);
    if (completed === null || completed > now + 5 * 60 * 1000) continue;
    const sources = sourcesByRun.get(run.id) || [];
    if (!sources.length) continue;
    publicCandidates.add(run.account_id);

    const hasFreshSource = sources.some((source) => {
      const retrieved = timestampMs(source.retrieved_at);
      return retrieved !== null && retrieved <= now + 5 * 60 * 1000 && retrieved >= now - FRESH_RESEARCH_WINDOW_MS;
    });
    const disqualifiers = Array.isArray(run.disqualifiers) ? run.disqualifiers.filter(Boolean) : [];
    if (
      run.qualified_shadow === true
      && Number.isInteger(run.qualification_score)
      && run.qualification_score >= 75
      && typeof run.why_now === "string"
      && run.why_now.trim().length >= 3
      && disqualifiers.length === 0
      && hasFreshSource
    ) {
      triageQualified.add(run.account_id);
    }
  }

  const activeSuppressedContacts = new Set(
    input.suppressions
      .filter((row) => row.active === true && accountIds.has(row.account_id) && validUuidLike(row.contact_id))
      .map((row) => row.contact_id),
  );

  const verifiedContacts = new Map<string, CeoContactEvidence>();
  const verifiedContactAccounts = new Set<string>();
  for (const contact of input.contacts) {
    if (!triageQualified.has(contact.account_id)) continue;
    if (!validUuidLike(contact.id) || activeSuppressedContacts.has(contact.id)) continue;
    const verifiedAt = timestampMs(contact.contact_verified_at);
    if (
      contact.contact_route_status !== "verified"
      || !validHttps(contact.contact_source_url)
      || verifiedAt === null
      || verifiedAt > now + 5 * 60 * 1000
      || contact.relationship_state === "blocked"
    ) continue;
    verifiedContacts.set(contact.id, contact);
    verifiedContactAccounts.add(contact.account_id);
  }

  const conversationContacts = new Set<string>();
  const qualificationContacts = new Set<string>();
  for (const event of input.events) {
    if (!event.contact_id || !verifiedContacts.has(event.contact_id)) continue;
    const contact = verifiedContacts.get(event.contact_id)!;
    if (event.account_id !== contact.account_id) continue;
    const occurred = timestampMs(event.occurred_at);
    if (occurred === null || occurred > now + 5 * 60 * 1000 || !validUuidLike(event.recorded_by)) continue;
    if (CONVERSATION_EVENT_TYPES.has(event.event_type)) conversationContacts.add(event.contact_id);
    if (event.event_type === "qualification_completed") qualificationContacts.add(event.contact_id);
  }

  const conversationQualifiedAccounts = new Set<string>();
  for (const contactId of conversationContacts) {
    const contact = verifiedContacts.get(contactId);
    if (!contact || !qualificationContacts.has(contactId)) continue;
    if (!contact.buyer_role || !BUYER_ROLES.has(contact.buyer_role)) continue;
    conversationQualifiedAccounts.add(contact.account_id);
  }

  return {
    public_research_candidates: publicCandidates.size,
    research_triage_qualified_candidates: triageQualified.size,
    verified_contact_route_candidates: verifiedContactAccounts.size,
    conversation_evidence_qualified_accounts: conversationQualifiedAccounts.size,
    verified_sales_qualified_accounts: null,
    evidence_status: "verified_account_level_denominators",
    interpretation: "Research fit, verified contact route and first-party conversation qualification are separate nested evidence stages. A verified contact is not consent or a reply; a conversation-evidence-qualified account is not automatically an opportunity, customer, payment or causal outcome. Sales-qualified remains unreported until a separate approved opportunity-level contract exists.",
  };
}
