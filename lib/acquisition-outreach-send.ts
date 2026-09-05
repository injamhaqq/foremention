import { evaluateOutreachEligibility } from "./acquisition-outreach.ts";
import {
  getAcquisitionOutreachTransportStatus,
  sendAcquisitionOutreachEmail,
} from "./acquisition-outreach-transport.ts";
import { ZohoMailSendUncertainError } from "./acquisition-zoho-mail.ts";
import { SupabaseRequestError, supabaseRest } from "./supabase-rest.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableHash32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function validUuid(value: string, code: string) {
  if (!UUID_PATTERN.test(value)) throw new Error(code);
  return value.toLowerCase();
}

export function acquisitionEnrollmentKey(draftId: string, provider: string) {
  const normalizedDraft = validUuid(draftId, "ACQUISITION_SEND_DRAFT_ID_INVALID");
  const normalizedProvider = typeof provider === "string" ? provider.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 60) : "";
  if (!normalizedProvider) throw new Error("ACQUISITION_SEND_PROVIDER_INVALID");
  const material = `${normalizedDraft}|${normalizedProvider}`;
  return `acquisition-enrollment-${normalizedProvider}-${stableHash32(material, 2166136261)}${stableHash32(material, 2246822519)}`;
}

export function buildAcquisitionOutreachSentEvent(input: {
  accountId: string;
  contactId: string;
  externalReference: string;
  occurredAt: string;
}) {
  return {
    account_id: input.accountId,
    contact_id: input.contactId,
    event_type: "outreach_sent" as const,
    channel: "email",
    outcome: "provider_accepted",
    source_system: "acquisition_outreach",
    external_reference: input.externalReference,
    occurred_at: input.occurredAt,
  };
}

type DraftRow = {
  id: string;
  account_id: string;
  contact_id: string;
  research_run_id: string;
  subject: string;
  body: string;
  status: "draft" | "approved" | "suppressed" | "sent" | "failed";
  external_reference: string | null;
};

type ContactRow = {
  id: string;
  email: string | null;
  contact_route_status: "unverified" | "verified" | "invalid" | "suppressed";
};

type EnrollmentRow = {
  id: string;
  status: "queued" | "enrolled" | "paused" | "stopped" | "failed";
  idempotency_key: string;
};

async function loadDraft(draftId: string) {
  const rows = await supabaseRest<DraftRow[]>(
    `acquisition_outreach_drafts?select=id,account_id,contact_id,research_run_id,subject,body,status,external_reference&id=eq.${encodeURIComponent(draftId)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function loadEnrollment(idempotencyKey: string) {
  const rows = await supabaseRest<EnrollmentRow[]>(
    `acquisition_sequence_enrollments?select=id,status,idempotency_key&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function ensureQueuedEnrollment(input: {
  draft: DraftRow;
  provider: string;
  idempotencyKey: string;
}) {
  const existing = await loadEnrollment(input.idempotencyKey);
  if (existing) return existing;

  try {
    const rows = await supabaseRest<EnrollmentRow[]>(
      "acquisition_sequence_enrollments?select=id,status,idempotency_key",
      {
        method: "POST",
        serviceRole: true,
        body: {
          account_id: input.draft.account_id,
          contact_id: input.draft.contact_id,
          draft_id: input.draft.id,
          provider: input.provider,
          idempotency_key: input.idempotencyKey,
          status: "queued",
        },
        prefer: "return=representation",
      },
    );
    if (rows[0]) return rows[0];
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await loadEnrollment(input.idempotencyKey);
  if (!raced) throw new Error("ACQUISITION_SEND_ENROLLMENT_CONFLICT_UNRESOLVED");
  return raced;
}

async function recordSendEvent(input: {
  accountId: string;
  contactId: string;
  externalReference: string;
  occurredAt: string;
}) {
  const existing = await supabaseRest<Array<{ id: string }>>(
    `commercial_events?select=id&account_id=eq.${encodeURIComponent(input.accountId)}&contact_id=eq.${encodeURIComponent(input.contactId)}&event_type=eq.outreach_sent&source_system=eq.acquisition_outreach&external_reference=eq.${encodeURIComponent(input.externalReference)}&limit=1`,
    { serviceRole: true },
  );
  if (existing[0]) return existing[0];
  const rows = await supabaseRest<Array<{ id: string }>>(
    "commercial_events?select=id",
    {
      method: "POST",
      serviceRole: true,
      body: buildAcquisitionOutreachSentEvent(input),
      prefer: "return=representation",
    },
  );
  return rows[0] ?? null;
}

export async function sendApprovedAcquisitionOutreach(draftIdInput: string) {
  const draftId = validUuid(draftIdInput, "ACQUISITION_SEND_DRAFT_ID_INVALID");
  const draft = await loadDraft(draftId);
  if (!draft) throw new Error("ACQUISITION_SEND_DRAFT_NOT_FOUND");

  if (draft.status === "sent" && draft.external_reference) {
    return { status: "sent" as const, externalReference: draft.external_reference, duplicate: true };
  }

  const [qualifiedRows, contactRows, suppressionRows] = await Promise.all([
    supabaseRest<Array<{ research_run_id: string }>>(
      `acquisition_shadow_qualified_candidates?select=research_run_id&research_run_id=eq.${encodeURIComponent(draft.research_run_id)}&account_id=eq.${encodeURIComponent(draft.account_id)}&limit=1`,
      { serviceRole: true },
    ),
    supabaseRest<ContactRow[]>(
      `commercial_contacts?select=id,email,contact_route_status&id=eq.${encodeURIComponent(draft.contact_id)}&account_id=eq.${encodeURIComponent(draft.account_id)}&limit=1`,
      { serviceRole: true },
    ),
    supabaseRest<Array<{ id: string }>>(
      `acquisition_suppressions?select=id&contact_id=eq.${encodeURIComponent(draft.contact_id)}&active=eq.true&limit=1`,
      { serviceRole: true },
    ),
  ]);

  const contact = contactRows[0];
  if (!contact || !contact.email) throw new Error("ACQUISITION_SEND_CONTACT_NOT_FOUND");
  const transport = getAcquisitionOutreachTransportStatus();
  const eligibility = evaluateOutreachEligibility({
    qualifiedShadow: qualifiedRows.length === 1,
    contactRouteStatus: contact.contact_route_status,
    draftStatus: draft.status,
    transportAvailable: transport.available,
    suppressed: suppressionRows.length > 0,
  });
  if (!eligibility.eligible) throw new Error(`ACQUISITION_SEND_${eligibility.reason}`);

  const idempotencyKey = acquisitionEnrollmentKey(draft.id, transport.provider);
  const enrollment = await ensureQueuedEnrollment({ draft, provider: transport.provider, idempotencyKey });
  if (enrollment.status === "stopped") throw new Error("ACQUISITION_SEND_ENROLLMENT_STOPPED");

  try {
    const result = await sendAcquisitionOutreachEmail({
      accountId: draft.account_id,
      contactId: draft.contact_id,
      draftId: draft.id,
      to: contact.email,
      subject: draft.subject,
      body: draft.body,
    });
    const now = new Date().toISOString();

    await supabaseRest(
      `acquisition_outreach_drafts?id=eq.${encodeURIComponent(draft.id)}&status=eq.approved`,
      {
        method: "PATCH",
        serviceRole: true,
        body: {
          status: "sent",
          sent_at: now,
          transport: result.provider,
          external_reference: result.externalReference,
          provider_message_id: result.providerMessageId ?? null,
        },
        prefer: "return=minimal",
      },
    );
    await supabaseRest(
      `acquisition_sequence_enrollments?id=eq.${encodeURIComponent(enrollment.id)}`,
      {
        method: "PATCH",
        serviceRole: true,
        body: { status: "enrolled", enrolled_at: now },
        prefer: "return=minimal",
      },
    );

    await recordSendEvent({
      accountId: draft.account_id,
      contactId: draft.contact_id,
      externalReference: result.externalReference,
      occurredAt: now,
    });

    await supabaseRest(
      `commercial_accounts?id=eq.${encodeURIComponent(draft.account_id)}&lifecycle_stage=in.(target,prospect,qualified)`,
      {
        method: "PATCH",
        serviceRole: true,
        body: { lifecycle_stage: "contacted", next_action: "Review reply or follow-up eligibility", next_action_at: null },
        prefer: "return=minimal",
      },
    );

    return { status: "sent" as const, externalReference: result.externalReference, duplicate: false };
  } catch (error) {
    if (transport.provider === "zoho" && error instanceof ZohoMailSendUncertainError) {
      await supabaseRest(
        `acquisition_sequence_enrollments?id=eq.${encodeURIComponent(enrollment.id)}&status=eq.queued`,
        {
          method: "PATCH",
          serviceRole: true,
          body: { status: "stopped", stopped_at: new Date().toISOString(), stop_reason: "provider_send_uncertain" },
          prefer: "return=minimal",
        },
      ).catch(() => undefined);
      throw error;
    }

    await supabaseRest(
      `acquisition_sequence_enrollments?id=eq.${encodeURIComponent(enrollment.id)}&status=eq.queued`,
      {
        method: "PATCH",
        serviceRole: true,
        body: { status: "failed" },
        prefer: "return=minimal",
      },
    ).catch(() => undefined);
    throw error;
  }
}
