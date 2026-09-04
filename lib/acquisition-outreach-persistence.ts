import {
  buildEvidenceGroundedOutreachDraft,
  classifyAcquisitionReply,
  replySuppressionPolicy,
  type AcquisitionReplyClassification,
  type EvidenceGroundedOutreachDraft,
} from "./acquisition-outreach.ts";
import type { AcquisitionResearchFact, AcquisitionResearchFactKey } from "./acquisition-research.ts";
import { ACQUISITION_RESEARCH_FACT_KEYS } from "./acquisition-research.ts";
import { SupabaseRequestError, supabaseRest } from "./supabase-rest.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESEARCH_FACT_KEYS = new Set<string>(ACQUISITION_RESEARCH_FACT_KEYS);

type QualifiedShadowRow = {
  research_run_id: string;
  account_id: string;
};

type ContactRow = {
  id: string;
  account_id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  buyer_role: string | null;
  contact_route_status: string | null;
};

type EvidenceRow = {
  evidence_key: string;
  evidence_value: string;
  source_url: string;
  retrieved_at: string;
  confidence: number;
};

type DraftIdentity = {
  id: string;
  draft_key: string;
  status: string;
};

function boundedText(value: unknown, max: number, code: string) {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, max);
  if (!normalized) throw new Error(code);
  return normalized;
}

function boundedUuid(value: unknown, code: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new Error(code);
  return value.toLowerCase();
}

function normalizedHttpsUrl(value: unknown) {
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

function normalizedTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) return null;
  return new Date(timestamp).toISOString();
}

export function buildVerifiedContactRoutePatch(input: {
  email: string;
  sourceUrl: string;
  verifiedAt: string;
}) {
  const email = boundedText(input.email, 320, "ACQUISITION_CONTACT_EMAIL_REQUIRED").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error("ACQUISITION_CONTACT_EMAIL_INVALID");
  const sourceUrl = normalizedHttpsUrl(input.sourceUrl);
  if (!sourceUrl) throw new Error("ACQUISITION_CONTACT_SOURCE_REQUIRED");
  const verifiedAt = normalizedTimestamp(input.verifiedAt);
  if (!verifiedAt) throw new Error("ACQUISITION_CONTACT_VERIFIED_AT_INVALID");
  return {
    email,
    contact_route_status: "verified" as const,
    contact_source_url: sourceUrl,
    contact_verified_at: verifiedAt,
  };
}

export function buildOutreachDraftRecord(draft: EvidenceGroundedOutreachDraft) {
  return {
    account_id: draft.accountId,
    contact_id: draft.contactId,
    research_run_id: draft.researchRunId,
    draft_key: draft.draftKey,
    subject: draft.subject,
    body: draft.body,
    claim_sources: draft.claimSources,
    status: "draft" as const,
  };
}

export function buildReplyPersistencePlan(input: {
  classification: AcquisitionReplyClassification;
  accountId: string;
  contactId: string;
  externalReference: string;
  receivedAt: string;
  evidenceExcerpt?: string | null;
}) {
  const policy = replySuppressionPolicy(input.classification);
  const receivedAt = normalizedTimestamp(input.receivedAt);
  if (!receivedAt) throw new Error("ACQUISITION_REPLY_RECEIVED_AT_INVALID");
  const externalReference = boundedText(input.externalReference, 300, "ACQUISITION_REPLY_EXTERNAL_REFERENCE_REQUIRED");
  const evidenceExcerpt = typeof input.evidenceExcerpt === "string" && input.evidenceExcerpt.trim()
    ? input.evidenceExcerpt.trim().slice(0, 2000)
    : null;

  return {
    reply: {
      account_id: input.accountId,
      contact_id: input.contactId,
      external_reference: externalReference,
      classification: input.classification,
      evidence_excerpt: evidenceExcerpt,
      received_at: receivedAt,
    },
    suppression: {
      account_id: input.accountId,
      contact_id: input.contactId,
      reason: policy.reason,
      source_system: "acquisition_reply",
      source_reference: externalReference,
      active: true,
      lifted_at: null,
    },
    stopEnrollments: {
      status: "stopped" as const,
      stopped_at: receivedAt,
      stop_reason: policy.reason,
    },
    commercialEvent: {
      account_id: input.accountId,
      contact_id: input.contactId,
      event_type: "reply_received" as const,
      channel: "email",
      outcome: input.classification,
      source_system: "acquisition_outreach",
      external_reference: externalReference,
      occurred_at: receivedAt,
    },
  };
}

export async function verifyAcquisitionContactRoute(input: {
  accountId: string;
  contactId: string;
  email: string;
  sourceUrl: string;
  verifiedAt?: string;
}) {
  const patch = buildVerifiedContactRoutePatch({
    email: input.email,
    sourceUrl: input.sourceUrl,
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
  });
  const rows = await supabaseRest<Array<{ id: string }>>(
    `commercial_contacts?id=eq.${encodeURIComponent(input.contactId)}&account_id=eq.${encodeURIComponent(input.accountId)}&select=id`,
    {
      method: "PATCH",
      serviceRole: true,
      body: patch,
      prefer: "return=representation",
    },
  );
  if (rows.length !== 1) throw new Error("ACQUISITION_CONTACT_NOT_FOUND");
  return { contactId: input.contactId, status: "verified" as const };
}

function evidenceRowsToFacts(rows: readonly EvidenceRow[]): AcquisitionResearchFact[] {
  return rows
    .filter((row) => RESEARCH_FACT_KEYS.has(row.evidence_key))
    .map((row) => ({
      key: row.evidence_key as AcquisitionResearchFactKey,
      value: row.evidence_value,
      sourceUrl: row.source_url,
      retrievedAt: row.retrieved_at,
      confidence: row.confidence,
    }));
}

async function findDraft(draftKey: string) {
  const rows = await supabaseRest<DraftIdentity[]>(
    `acquisition_outreach_drafts?select=id,draft_key,status&draft_key=eq.${encodeURIComponent(draftKey)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

export async function createAcquisitionOutreachDraft(input: {
  accountId: string;
  contactId: string;
  researchRunId: string;
}) {
  const [qualifiedRows, contactRows, suppressionRows, evidenceRows, accountRows] = await Promise.all([
    supabaseRest<QualifiedShadowRow[]>(
      `acquisition_shadow_qualified_candidates?select=research_run_id,account_id&research_run_id=eq.${encodeURIComponent(input.researchRunId)}&account_id=eq.${encodeURIComponent(input.accountId)}&limit=1`,
      { serviceRole: true },
    ),
    supabaseRest<ContactRow[]>(
      `commercial_contacts?select=id,account_id,full_name,email,job_title,buyer_role,contact_route_status&id=eq.${encodeURIComponent(input.contactId)}&account_id=eq.${encodeURIComponent(input.accountId)}&limit=1`,
      { serviceRole: true },
    ),
    supabaseRest<Array<{ id: string }>>(
      `acquisition_suppressions?select=id&contact_id=eq.${encodeURIComponent(input.contactId)}&active=eq.true&limit=1`,
      { serviceRole: true },
    ),
    supabaseRest<EvidenceRow[]>(
      `acquisition_research_evidence?select=evidence_key,evidence_value,source_url,retrieved_at,confidence&research_run_id=eq.${encodeURIComponent(input.researchRunId)}&order=retrieved_at.desc`,
      { serviceRole: true },
    ),
    supabaseRest<Array<{ id: string; company_name: string }>>(
      `commercial_accounts?select=id,company_name&id=eq.${encodeURIComponent(input.accountId)}&limit=1`,
      { serviceRole: true },
    ),
  ]);

  if (qualifiedRows.length !== 1) throw new Error("ACQUISITION_OUTREACH_NOT_QUALIFIED");
  const contact = contactRows[0];
  if (!contact || contact.contact_route_status !== "verified" || !contact.email) {
    throw new Error("ACQUISITION_OUTREACH_CONTACT_ROUTE_UNVERIFIED");
  }
  if (suppressionRows.length > 0) throw new Error("ACQUISITION_OUTREACH_SUPPRESSED");
  const account = accountRows[0];
  if (!account) throw new Error("ACQUISITION_OUTREACH_ACCOUNT_NOT_FOUND");

  const fullName = contact.full_name?.trim() || "";
  const contactFirstName = fullName ? fullName.split(/\s+/)[0] ?? null : null;
  const draft = buildEvidenceGroundedOutreachDraft({
    accountId: input.accountId,
    contactId: input.contactId,
    researchRunId: input.researchRunId,
    companyName: account.company_name,
    contactFirstName,
    contactRole: contact.job_title ?? contact.buyer_role,
    facts: evidenceRowsToFacts(evidenceRows),
  });
  const existing = await findDraft(draft.draftKey);
  if (existing) return existing;

  try {
    const created = await supabaseRest<DraftIdentity[]>(
      "acquisition_outreach_drafts?select=id,draft_key,status",
      {
        method: "POST",
        serviceRole: true,
        body: buildOutreachDraftRecord(draft),
        prefer: "return=representation",
      },
    );
    if (created[0]) return created[0];
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await findDraft(draft.draftKey);
  if (!raced) throw new Error("ACQUISITION_OUTREACH_DRAFT_CONFLICT_UNRESOLVED");
  return raced;
}

export async function approveAcquisitionOutreachDraft(input: { draftId: string; approvedBy: string }) {
  const draftId = boundedUuid(input.draftId, "ACQUISITION_OUTREACH_DRAFT_ID_INVALID");
  const approvedBy = boundedUuid(input.approvedBy, "ACQUISITION_OUTREACH_APPROVER_INVALID");
  const rows = await supabaseRest<Array<{ id: string; status: string }>>(
    `acquisition_outreach_drafts?id=eq.${encodeURIComponent(draftId)}&status=eq.draft&select=id,status`,
    {
      method: "PATCH",
      serviceRole: true,
      body: { status: "approved", approved_at: new Date().toISOString(), approved_by: approvedBy },
      prefer: "return=representation",
    },
  );
  if (rows.length !== 1) throw new Error("ACQUISITION_OUTREACH_DRAFT_NOT_APPROVABLE");
  return rows[0];
}

export async function suppressAcquisitionContact(input: {
  accountId: string;
  contactId: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "provider_suppressed" | "negative_intent" | "reply_received" | "manual";
  sourceSystem: string;
  sourceReference?: string | null;
  occurredAt?: string;
}) {
  const occurredAt = normalizedTimestamp(input.occurredAt ?? new Date().toISOString());
  if (!occurredAt) throw new Error("ACQUISITION_SUPPRESSION_TIMESTAMP_INVALID");
  await supabaseRest(
    "acquisition_suppressions?on_conflict=contact_id",
    {
      method: "POST",
      serviceRole: true,
      body: {
        account_id: input.accountId,
        contact_id: input.contactId,
        reason: input.reason,
        source_system: boundedText(input.sourceSystem, 80, "ACQUISITION_SUPPRESSION_SOURCE_REQUIRED"),
        source_reference: input.sourceReference?.trim().slice(0, 300) || null,
        active: true,
        lifted_at: null,
      },
      prefer: "resolution=merge-duplicates,return=minimal",
    },
  );
  await supabaseRest(
    `acquisition_sequence_enrollments?contact_id=eq.${encodeURIComponent(input.contactId)}&status=in.(queued,enrolled,paused)`,
    {
      method: "PATCH",
      serviceRole: true,
      body: { status: "stopped", stopped_at: occurredAt, stop_reason: input.reason },
      prefer: "return=minimal",
    },
  );
  if (["unsubscribe", "bounce", "complaint", "provider_suppressed", "negative_intent"].includes(input.reason)) {
    await supabaseRest(
      `commercial_contacts?id=eq.${encodeURIComponent(input.contactId)}&account_id=eq.${encodeURIComponent(input.accountId)}`,
      {
        method: "PATCH",
        serviceRole: true,
        body: { contact_route_status: "suppressed" },
        prefer: "return=minimal",
      },
    );
  }
}

export async function recordAcquisitionReply(input: {
  accountId: string;
  contactId: string;
  enrollmentId?: string | null;
  externalReference: string;
  receivedAt: string;
  text: string;
  providerEvent?: string | null;
}) {
  const externalReference = boundedText(input.externalReference, 300, "ACQUISITION_REPLY_EXTERNAL_REFERENCE_REQUIRED");
  const existing = await supabaseRest<Array<{ id: string; classification: AcquisitionReplyClassification }>>(
    `acquisition_reply_events?select=id,classification&external_reference=eq.${encodeURIComponent(externalReference)}&limit=1`,
    { serviceRole: true },
  );
  if (existing[0]) return { ...existing[0], duplicate: true };

  const classification = classifyAcquisitionReply(input.text, { providerEvent: input.providerEvent });
  const plan = buildReplyPersistencePlan({
    classification,
    accountId: input.accountId,
    contactId: input.contactId,
    externalReference,
    receivedAt: input.receivedAt,
    evidenceExcerpt: input.text,
  });

  let replyRows: Array<{ id: string; classification: AcquisitionReplyClassification }>;
  try {
    replyRows = await supabaseRest(
      "acquisition_reply_events?select=id,classification",
      {
        method: "POST",
        serviceRole: true,
        body: { ...plan.reply, enrollment_id: input.enrollmentId ?? null },
        prefer: "return=representation",
      },
    );
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
    const raced = await supabaseRest<Array<{ id: string; classification: AcquisitionReplyClassification }>>(
      `acquisition_reply_events?select=id,classification&external_reference=eq.${encodeURIComponent(externalReference)}&limit=1`,
      { serviceRole: true },
    );
    if (!raced[0]) throw new Error("ACQUISITION_REPLY_CONFLICT_UNRESOLVED");
    return { ...raced[0], duplicate: true };
  }

  if (!replyRows[0]) throw new Error("ACQUISITION_REPLY_PERSISTENCE_FAILED");
  await suppressAcquisitionContact({
    accountId: input.accountId,
    contactId: input.contactId,
    reason: plan.suppression.reason,
    sourceSystem: plan.suppression.source_system,
    sourceReference: externalReference,
    occurredAt: plan.reply.received_at,
  });

  const existingCommercialEvent = await supabaseRest<Array<{ id: string }>>(
    `commercial_events?select=id&account_id=eq.${encodeURIComponent(input.accountId)}&contact_id=eq.${encodeURIComponent(input.contactId)}&source_system=eq.acquisition_outreach&external_reference=eq.${encodeURIComponent(externalReference)}&limit=1`,
    { serviceRole: true },
  );
  if (existingCommercialEvent.length === 0) {
    await supabaseRest(
      "commercial_events",
      {
        method: "POST",
        serviceRole: true,
        body: plan.commercialEvent,
        prefer: "return=minimal",
      },
    );
  }

  return { ...replyRows[0], duplicate: false };
}
