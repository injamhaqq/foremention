import {
  getZohoMailConfig,
  refreshZohoMailAccessToken,
  sendZohoMailMessage,
  verifyZohoMailAccount,
  ZohoMailSendUncertainError,
  zohoEmailAddress,
} from "./acquisition-zoho-mail.ts";
import { SupabaseRequestError, supabaseRest } from "./supabase-rest.ts";

const CANARY_ENABLED_ENV = "ACQUISITION_OUTREACH_CANARY_ENABLED";
const CANARY_EMAIL_ENV = "ACQUISITION_OUTREACH_CANARY_EMAIL";

type ZohoCanaryRow = {
  id: string;
  canary_key: string;
  recipient_email: string;
  sender_email: string;
  status: "requested" | "sending" | "sent" | "reply_received" | "send_uncertain";
  provider_message_id: string | null;
  zoho_message_id: string | null;
  sent_at: string | null;
  replied_at: string | null;
  reply_message_id: string | null;
};

function canaryEnabled() {
  return process.env[CANARY_ENABLED_ENV]?.trim().toLowerCase() === "true";
}

export function canaryConfigFromEnv() {
  if (process.env.ACQUISITION_OUTREACH_PROVIDER?.trim().toLowerCase() !== "zoho") return null;
  if (!canaryEnabled()) return null;
  // A canary is deliberately impossible while normal acquisition sending is enabled.
  if (process.env.ACQUISITION_OUTREACH_SEND_ENABLED?.trim().toLowerCase() === "true") return null;

  const recipientEmail = zohoEmailAddress(process.env[CANARY_EMAIL_ENV]);
  const senderEmail = zohoEmailAddress(process.env.ACQUISITION_OUTREACH_FROM_EMAIL);
  const replyEmail = zohoEmailAddress(process.env.ACQUISITION_OUTREACH_REPLY_TO_EMAIL);
  if (!recipientEmail || !senderEmail || replyEmail !== senderEmail || recipientEmail === senderEmail) return null;
  return { recipientEmail, senderEmail };
}

function boundedBuildCommit() {
  const value = process.env.FOREMENTION_BUILD_COMMIT?.trim().toLowerCase() ?? "";
  return /^[0-9a-f]{40}$/.test(value) ? value : "unversioned";
}

function canaryKey(config: NonNullable<ReturnType<typeof canaryConfigFromEnv>>) {
  return `zoho-canary:${boundedBuildCommit()}:${config.senderEmail}:${config.recipientEmail}`.slice(0, 500);
}

export function buildZohoCanaryMessage(key: string) {
  const safeKey = key.replace(/[\r\n]+/g, " ").trim().slice(0, 500);
  return {
    subject: "Foremention controlled Zoho mail verification",
    content: [
      "Foremention internal verification message.",
      "This message verifies the production Zoho Mail transport and reply correlation path.",
      `Canary: ${safeKey}`,
      "",
      "Please reply to this message with exactly:",
      "FOREMENTION CANARY OK",
    ].join("\n"),
  };
}

export function canaryReplyMatches(
  canary: Pick<ZohoCanaryRow, "recipient_email" | "provider_message_id">,
  references: readonly string[],
  sender: string | null,
) {
  const expectedSender = zohoEmailAddress(canary.recipient_email);
  const actualSender = zohoEmailAddress(sender);
  if (!expectedSender || actualSender !== expectedSender || !canary.provider_message_id) return false;
  return references.some((reference) => reference.trim() === canary.provider_message_id);
}

async function loadCanary(key: string) {
  const rows = await supabaseRest<ZohoCanaryRow[]>(
    `acquisition_zoho_mail_canaries?select=id,canary_key,recipient_email,sender_email,status,provider_message_id,zoho_message_id,sent_at,replied_at,reply_message_id&canary_key=eq.${encodeURIComponent(key)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function createOrLoadCanary(config: NonNullable<ReturnType<typeof canaryConfigFromEnv>>) {
  const key = canaryKey(config);
  const existing = await loadCanary(key);
  if (existing) return existing;
  try {
    const rows = await supabaseRest<ZohoCanaryRow[]>(
      "acquisition_zoho_mail_canaries?select=id,canary_key,recipient_email,sender_email,status,provider_message_id,zoho_message_id,sent_at,replied_at,reply_message_id",
      {
        method: "POST",
        serviceRole: true,
        body: {
          canary_key: key,
          recipient_email: config.recipientEmail,
          sender_email: config.senderEmail,
          status: "requested",
        },
        prefer: "return=representation",
      },
    );
    if (rows[0]) return rows[0];
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }
  const raced = await loadCanary(key);
  if (!raced) throw new Error("ACQUISITION_ZOHO_CANARY_CREATE_FAILED");
  return raced;
}

async function claimCanary(row: ZohoCanaryRow) {
  const now = new Date().toISOString();
  const rows = await supabaseRest<ZohoCanaryRow[]>(
    `acquisition_zoho_mail_canaries?select=id,canary_key,recipient_email,sender_email,status,provider_message_id,zoho_message_id,sent_at,replied_at,reply_message_id&id=eq.${encodeURIComponent(row.id)}&status=eq.requested`,
    {
      method: "PATCH",
      serviceRole: true,
      body: { status: "sending", updated_at: now },
      prefer: "return=representation",
    },
  );
  return rows[0] ?? null;
}

export async function runZohoAcquisitionCanary() {
  const config = canaryConfigFromEnv();
  if (!config) return { status: "disabled" as const };

  let row = await createOrLoadCanary(config);
  if (row.status === "reply_received") return { status: "verified" as const, canaryId: row.id };
  if (row.status === "sent") return { status: "waiting_reply" as const, canaryId: row.id };
  if (row.status === "send_uncertain") return { status: "send_uncertain" as const, canaryId: row.id };
  if (row.status === "sending") return { status: "inflight" as const, canaryId: row.id };

  const claimed = await claimCanary(row);
  if (!claimed) {
    row = await loadCanary(row.canary_key) ?? row;
    return { status: row.status === "sent" ? "waiting_reply" as const : "inflight" as const, canaryId: row.id };
  }
  row = claimed;

  const zoho = getZohoMailConfig();
  if (!zoho || zoho.fromAddress !== config.senderEmail) throw new Error("ACQUISITION_ZOHO_CANARY_PROVIDER_CONFIG_INVALID");
  const accessToken = await refreshZohoMailAccessToken(zoho);
  await verifyZohoMailAccount({
    accessToken,
    mailBaseUrl: zoho.mailBaseUrl,
    accountId: zoho.accountId,
    expectedFromAddress: config.senderEmail,
  });
  const message = buildZohoCanaryMessage(row.canary_key);

  let result: Awaited<ReturnType<typeof sendZohoMailMessage>>;
  try {
    result = await sendZohoMailMessage({
      accessToken,
      mailBaseUrl: zoho.mailBaseUrl,
      accountId: zoho.accountId,
      fromAddress: config.senderEmail,
      toAddress: config.recipientEmail,
      subject: message.subject,
      content: message.content,
    });
  } catch (error) {
    if (error instanceof ZohoMailSendUncertainError) {
      await supabaseRest(
        `acquisition_zoho_mail_canaries?id=eq.${encodeURIComponent(row.id)}&status=eq.sending`,
        {
          method: "PATCH",
          serviceRole: true,
          body: { status: "send_uncertain", updated_at: new Date().toISOString() },
          prefer: "return=minimal",
        },
      ).catch(() => undefined);
    }
    throw error;
  }

  const sentAt = new Date().toISOString();
  const stored = await supabaseRest<ZohoCanaryRow[]>(
    `acquisition_zoho_mail_canaries?select=id,canary_key,recipient_email,sender_email,status,provider_message_id,zoho_message_id,sent_at,replied_at,reply_message_id&id=eq.${encodeURIComponent(row.id)}&status=eq.sending`,
    {
      method: "PATCH",
      serviceRole: true,
      body: {
        status: "sent",
        provider_message_id: result.mailId,
        zoho_message_id: result.messageId,
        sent_at: sentAt,
        updated_at: sentAt,
      },
      prefer: "return=representation",
    },
  );
  if (!stored[0]) throw new Error("ACQUISITION_ZOHO_CANARY_LEDGER_UPDATE_FAILED");
  return { status: "sent" as const, canaryId: row.id };
}

async function findSentCanaryByReferences(references: readonly string[]) {
  for (const reference of references.slice(0, 10)) {
    const rows = await supabaseRest<ZohoCanaryRow[]>(
      `acquisition_zoho_mail_canaries?select=id,canary_key,recipient_email,sender_email,status,provider_message_id,zoho_message_id,sent_at,replied_at,reply_message_id&status=eq.sent&provider_message_id=eq.${encodeURIComponent(reference)}&limit=1`,
      { serviceRole: true },
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

export async function processZohoCanaryReplyMessage(input: {
  references: readonly string[];
  sender: string | null;
  messageId: string;
  receivedAt: string;
}) {
  if (!canaryEnabled() || input.references.length === 0) return "ignored" as const;
  const row = await findSentCanaryByReferences(input.references);
  if (!row || !canaryReplyMatches(row, input.references, input.sender)) return "ignored" as const;

  const repliedAt = Number.isFinite(Date.parse(input.receivedAt)) ? new Date(input.receivedAt).toISOString() : new Date().toISOString();
  const rows = await supabaseRest<Array<{ id: string }>>(
    `acquisition_zoho_mail_canaries?select=id&id=eq.${encodeURIComponent(row.id)}&status=eq.sent`,
    {
      method: "PATCH",
      serviceRole: true,
      body: {
        status: "reply_received",
        replied_at: repliedAt,
        reply_message_id: input.messageId.slice(0, 100),
        updated_at: new Date().toISOString(),
      },
      prefer: "return=representation",
    },
  );
  return rows[0] ? "processed" as const : "ignored" as const;
}
