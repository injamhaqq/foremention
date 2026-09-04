import { recordAcquisitionReply, suppressAcquisitionContact } from "@/lib/acquisition-outreach-persistence";
import { SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";
import type { NormalizedResendWebhookEvent } from "@/lib/acquisition-resend-webhook";

const RESEND_RECEIVING_ENDPOINT = "https://api.resend.com/emails/receiving";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DraftCorrelation = {
  id: string;
  account_id: string;
  contact_id: string;
  external_reference: string | null;
  provider_message_id: string | null;
};

type WebhookLedgerRow = { id: string; outcome: "processed" | "ignored" | "duplicate" | "failed" };

type ReceivedEmail = {
  id: string;
  to?: string[];
  from?: string;
  created_at?: string;
  subject?: string;
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string> | null;
  message_id?: string | null;
};

function emailAddress(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const angle = normalized.match(/<([^<>]+)>/);
  const candidate = (angle?.[1] ?? normalized).trim().toLowerCase();
  return EMAIL_PATTERN.test(candidate) ? candidate : null;
}

function normalizedHeaders(headers: Record<string, string> | null | undefined) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === "string") result[key.toLowerCase()] = value.trim();
  }
  return result;
}

function messageReferences(headers: Record<string, string> | null | undefined) {
  const normalized = normalizedHeaders(headers);
  const values = [normalized["in-reply-to"], normalized.references].filter(Boolean) as string[];
  const references = new Set<string>();
  for (const value of values) {
    const matches = value.match(/<[^<>]{3,500}>/g) ?? [];
    for (const match of matches.slice(0, 10)) references.add(match);
    if (matches.length === 0 && value.length <= 500) references.add(value);
  }
  return [...references];
}

function plainReplyText(email: ReceivedEmail) {
  if (typeof email.text === "string" && email.text.trim()) return email.text.trim().slice(0, 20_000);
  if (typeof email.html === "string" && email.html.trim()) {
    return email.html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20_000);
  }
  const subject = typeof email.subject === "string" ? email.subject.trim().slice(0, 500) : "";
  return subject || null;
}

async function findDraftByProviderEmail(emailId: string) {
  const rows = await supabaseRest<DraftCorrelation[]>(
    `acquisition_outreach_drafts?select=id,account_id,contact_id,external_reference,provider_message_id&external_reference=eq.${encodeURIComponent(emailId)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function findDraftByMessageReferences(references: readonly string[]) {
  for (const reference of references.slice(0, 10)) {
    const rows = await supabaseRest<DraftCorrelation[]>(
      `acquisition_outreach_drafts?select=id,account_id,contact_id,external_reference,provider_message_id&provider_message_id=eq.${encodeURIComponent(reference)}&limit=1`,
      { serviceRole: true },
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

async function receivedEmail(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("ACQUISITION_RESEND_API_UNAVAILABLE");
  const response = await fetch(`${RESEND_RECEIVING_ENDPOINT}/${encodeURIComponent(emailId)}`, {
    headers: { authorization: `Bearer ${apiKey}`, "user-agent": "Foremention-Acquisition/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ACQUISITION_RESEND_RECEIVED_EMAIL_HTTP_${response.status}`);
  return await response.json() as ReceivedEmail;
}

async function beginWebhookEvent(input: { svixId: string; event: NormalizedResendWebhookEvent }) {
  const existing = await supabaseRest<WebhookLedgerRow[]>(
    `acquisition_outreach_webhook_events?select=id,outcome&svix_id=eq.${encodeURIComponent(input.svixId)}&limit=1`,
    { serviceRole: true },
  );
  if (existing[0] && existing[0].outcome !== "failed") return { duplicate: true, id: existing[0].id };
  if (existing[0]) return { duplicate: false, id: existing[0].id };

  try {
    const rows = await supabaseRest<WebhookLedgerRow[]>(
      "acquisition_outreach_webhook_events?select=id,outcome",
      {
        method: "POST",
        serviceRole: true,
        body: {
          svix_id: input.svixId,
          event_type: input.event.type,
          provider_email_id: input.event.emailId,
          event_created_at: input.event.createdAt,
          outcome: "failed",
        },
        prefer: "return=representation",
      },
    );
    if (rows[0]) return { duplicate: false, id: rows[0].id };
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await supabaseRest<WebhookLedgerRow[]>(
    `acquisition_outreach_webhook_events?select=id,outcome&svix_id=eq.${encodeURIComponent(input.svixId)}&limit=1`,
    { serviceRole: true },
  );
  if (!raced[0]) throw new Error("ACQUISITION_RESEND_WEBHOOK_LEDGER_CONFLICT");
  return { duplicate: raced[0].outcome !== "failed", id: raced[0].id };
}

async function finishWebhookEvent(id: string, outcome: "processed" | "ignored" | "failed") {
  await supabaseRest(
    `acquisition_outreach_webhook_events?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      serviceRole: true,
      body: { outcome, processed_at: new Date().toISOString() },
      prefer: "return=minimal",
    },
  );
}

async function suppressProviderOutcome(event: NormalizedResendWebhookEvent, reason: "bounce" | "negative_intent") {
  const draft = await findDraftByProviderEmail(event.emailId);
  if (!draft) return "ignored" as const;
  await suppressAcquisitionContact({
    accountId: draft.account_id,
    contactId: draft.contact_id,
    reason,
    sourceSystem: "resend_webhook",
    sourceReference: event.emailId,
    occurredAt: event.createdAt,
  });
  return "processed" as const;
}

async function processInboundReply(event: NormalizedResendWebhookEvent) {
  const email = await receivedEmail(event.emailId);
  const configuredReplyTo = emailAddress(process.env.ACQUISITION_OUTREACH_REPLY_TO_EMAIL);
  const recipients = (email.to ?? []).map(emailAddress).filter(Boolean);
  if (!configuredReplyTo || !recipients.includes(configuredReplyTo)) return "ignored" as const;

  const references = messageReferences(email.headers);
  if (references.length === 0) return "ignored" as const;
  const draft = await findDraftByMessageReferences(references);
  if (!draft) throw new Error("ACQUISITION_RESEND_REPLY_CORRELATION_PENDING");

  const contactRows = await supabaseRest<Array<{ id: string; email: string | null }>>(
    `commercial_contacts?select=id,email&id=eq.${encodeURIComponent(draft.contact_id)}&account_id=eq.${encodeURIComponent(draft.account_id)}&limit=1`,
    { serviceRole: true },
  );
  const sender = emailAddress(email.from);
  const expectedSender = emailAddress(contactRows[0]?.email);
  if (!sender || !expectedSender || sender !== expectedSender) return "ignored" as const;

  const text = plainReplyText(email);
  if (!text) throw new Error("ACQUISITION_RESEND_REPLY_CONTENT_UNAVAILABLE");
  await recordAcquisitionReply({
    accountId: draft.account_id,
    contactId: draft.contact_id,
    externalReference: `resend-received-${email.id}`.slice(0, 300),
    receivedAt: email.created_at ?? event.createdAt,
    text,
    providerEvent: "reply",
  });
  return "processed" as const;
}

export async function processResendAcquisitionWebhook(input: {
  svixId: string;
  event: NormalizedResendWebhookEvent;
}) {
  const ledger = await beginWebhookEvent(input);
  if (ledger.duplicate) return { status: "duplicate" as const };

  try {
    let outcome: "processed" | "ignored" = "ignored";
    if (input.event.type === "email.sent") {
      const draft = await findDraftByProviderEmail(input.event.emailId);
      if (draft && input.event.messageId) {
        await supabaseRest(
          `acquisition_outreach_drafts?id=eq.${encodeURIComponent(draft.id)}&external_reference=eq.${encodeURIComponent(input.event.emailId)}`,
          {
            method: "PATCH",
            serviceRole: true,
            body: { provider_message_id: input.event.messageId },
            prefer: "return=minimal",
          },
        );
        outcome = "processed";
      }
    } else if (input.event.type === "email.bounced" || input.event.type === "email.suppressed") {
      outcome = await suppressProviderOutcome(input.event, "bounce");
    } else if (input.event.type === "email.complained") {
      outcome = await suppressProviderOutcome(input.event, "negative_intent");
    } else if (input.event.type === "email.failed") {
      const draft = await findDraftByProviderEmail(input.event.emailId);
      if (draft) {
        await Promise.all([
          supabaseRest(
            `acquisition_outreach_drafts?id=eq.${encodeURIComponent(draft.id)}&status=eq.sent`,
            { method: "PATCH", serviceRole: true, body: { status: "failed" }, prefer: "return=minimal" },
          ),
          supabaseRest(
            `acquisition_sequence_enrollments?draft_id=eq.${encodeURIComponent(draft.id)}&status=in.(queued,enrolled,paused)`,
            { method: "PATCH", serviceRole: true, body: { status: "failed" }, prefer: "return=minimal" },
          ),
        ]);
        outcome = "processed";
      }
    } else if (input.event.type === "email.received") {
      outcome = await processInboundReply(input.event);
    } else if (input.event.type === "email.delivered") {
      outcome = (await findDraftByProviderEmail(input.event.emailId)) ? "processed" : "ignored";
    }

    await finishWebhookEvent(ledger.id, outcome);
    return { status: outcome };
  } catch (error) {
    await finishWebhookEvent(ledger.id, "failed").catch(() => undefined);
    throw error;
  }
}
