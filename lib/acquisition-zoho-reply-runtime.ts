import { recordAcquisitionReply } from "./acquisition-outreach-persistence.ts";
import { canaryConfigFromEnv, processZohoCanaryReplyMessage } from "./acquisition-zoho-canary.ts";
import {
  getZohoMailConfig,
  getZohoMessageContent,
  getZohoMessageHeader,
  refreshZohoMailAccessToken,
  searchZohoUnreadMessages,
  zohoEmailAddress,
  type ZohoMailMessageSummary,
} from "./acquisition-zoho-mail.ts";
import { supabaseRest } from "./supabase-rest.ts";

const MAX_MESSAGES_PER_POLL = 25;

type DraftCorrelation = {
  id: string;
  account_id: string;
  contact_id: string;
  provider_message_id: string | null;
};

function messageReferences(rawHeader: string) {
  const references = new Set<string>();
  const header = rawHeader.slice(0, 50_000);
  const relevant = header.match(/(?:^|\r?\n)(?:in-reply-to|references):[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*/gi) ?? [];
  for (const value of relevant) {
    const ids = value.match(/<[^<>\r\n]{3,500}>/g) ?? [];
    for (const id of ids.slice(0, 10)) references.add(id.trim());
  }
  return [...references].slice(0, 10);
}

function safeReplyText(content: string, subject: string | null) {
  const trimmed = content.trim();
  if (trimmed && !/[<>]/.test(trimmed)) return trimmed.slice(0, 20_000);
  const boundedSubject = subject?.trim().slice(0, 500) ?? "";
  return boundedSubject || null;
}

async function findDraftByMessageReferences(references: readonly string[]) {
  for (const reference of references) {
    const rows = await supabaseRest<DraftCorrelation[]>(
      `acquisition_outreach_drafts?select=id,account_id,contact_id,provider_message_id&transport=eq.zoho&provider_message_id=eq.${encodeURIComponent(reference)}&status=eq.sent&limit=1`,
      { serviceRole: true },
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

async function senderMatchesDraft(draft: DraftCorrelation, sender: string | null) {
  if (!sender) return false;
  const rows = await supabaseRest<Array<{ id: string; email: string | null }>>(
    `commercial_contacts?select=id,email&id=eq.${encodeURIComponent(draft.contact_id)}&account_id=eq.${encodeURIComponent(draft.account_id)}&limit=1`,
    { serviceRole: true },
  );
  return zohoEmailAddress(rows[0]?.email) === sender;
}

async function processZohoReplyMessage(input: {
  accessToken: string;
  config: NonNullable<ReturnType<typeof getZohoMailConfig>>;
  message: ZohoMailMessageSummary;
  references: readonly string[];
}) {
  if (input.references.length === 0) return "ignored" as const;
  const draft = await findDraftByMessageReferences(input.references);
  if (!draft) return "ignored" as const;
  if (!(await senderMatchesDraft(draft, input.message.fromAddress))) return "ignored" as const;

  const content = await getZohoMessageContent({
    accessToken: input.accessToken,
    mailBaseUrl: input.config.mailBaseUrl,
    accountId: input.config.accountId,
    folderId: input.message.folderId,
    messageId: input.message.messageId,
  });
  const text = safeReplyText(content, input.message.subject);
  if (!text) throw new Error("ACQUISITION_ZOHO_REPLY_CONTENT_UNAVAILABLE");

  await recordAcquisitionReply({
    accountId: draft.account_id,
    contactId: draft.contact_id,
    externalReference: `zoho-received-${input.message.messageId}`.slice(0, 300),
    receivedAt: input.message.receivedAt,
    text,
    providerEvent: "reply",
  });
  return "processed" as const;
}

export async function pollZohoAcquisitionReplies() {
  if (process.env.ACQUISITION_OUTREACH_PROVIDER?.trim().toLowerCase() !== "zoho") {
    return { status: "disabled" as const, processed: 0, canaryProcessed: 0, ignored: 0 };
  }

  const replyPollingVerified = process.env.ACQUISITION_OUTREACH_ZOHO_REPLY_POLLING_VERIFIED === "true";
  const canaryEnabled = process.env.ACQUISITION_OUTREACH_CANARY_ENABLED === "true" && Boolean(canaryConfigFromEnv());
  const verificationMode = !replyPollingVerified && canaryEnabled;
  if (!replyPollingVerified && !verificationMode) {
    return { status: "unverified" as const, processed: 0, canaryProcessed: 0, ignored: 0, verificationMode: false };
  }

  const config = getZohoMailConfig();
  if (!config) return { status: "provider_unavailable" as const, processed: 0, canaryProcessed: 0, ignored: 0, verificationMode };
  const replyMailbox = zohoEmailAddress(process.env.ACQUISITION_OUTREACH_REPLY_TO_EMAIL);
  if (!replyMailbox || replyMailbox !== config.fromAddress) {
    return { status: "reply_mailbox_mismatch" as const, processed: 0, canaryProcessed: 0, ignored: 0, verificationMode };
  }

  const accessToken = await refreshZohoMailAccessToken(config);
  const messages = await searchZohoUnreadMessages({
    accessToken,
    mailBaseUrl: config.mailBaseUrl,
    accountId: config.accountId,
    limit: MAX_MESSAGES_PER_POLL,
  });

  let processed = 0;
  let canaryProcessed = 0;
  let ignored = 0;
  for (const message of messages) {
    const header = await getZohoMessageHeader({
      accessToken,
      mailBaseUrl: config.mailBaseUrl,
      accountId: config.accountId,
      folderId: message.folderId,
      messageId: message.messageId,
    });
    const references = messageReferences(header);

    if (canaryEnabled && references.length > 0) {
      const canaryOutcome = await processZohoCanaryReplyMessage({
        references,
        sender: message.fromAddress,
        messageId: message.messageId,
        receivedAt: message.receivedAt,
      });
      if (canaryOutcome === "processed") {
        canaryProcessed += 1;
        continue;
      }
    }

    // Before verification, canary mode is intentionally incapable of ingesting
    // ordinary acquisition replies into customer/commercial evidence tables.
    if (verificationMode) {
      ignored += 1;
      continue;
    }

    const outcome = await processZohoReplyMessage({ accessToken, config, message, references });
    if (outcome === "processed") processed += 1;
    else ignored += 1;
  }
  return { status: "complete" as const, processed, canaryProcessed, ignored, examined: messages.length, verificationMode };
}

export const zohoReplyRuntimeInternals = { messageReferences, safeReplyText };
