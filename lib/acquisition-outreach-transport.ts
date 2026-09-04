import { createAcquisitionUnsubscribeToken } from "./acquisition-outreach-unsubscribe.ts";
import {
  getZohoMailConfig,
  refreshZohoMailAccessToken,
  sendZohoMailMessage,
  verifyZohoMailAccount,
} from "./acquisition-zoho-mail.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type AcquisitionOutreachProvider = "resend" | "zoho";

export type AcquisitionOutreachTransportStatus = {
  available: boolean;
  provider: AcquisitionOutreachProvider;
  reason: string;
};

function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

function normalizedFrom(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\r\n]+/g, " ").slice(0, 320);
  if (!normalized) return null;
  const angle = normalized.match(/<([^<>]+)>$/);
  const address = normalizedEmail(angle?.[1] ?? normalized);
  return address ? normalized : null;
}

function normalizedSiteUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function selectedProvider(): AcquisitionOutreachProvider {
  return process.env.ACQUISITION_OUTREACH_PROVIDER?.trim().toLowerCase() === "zoho" ? "zoho" : "resend";
}

function commonTransportFailure(provider: AcquisitionOutreachProvider) {
  if (process.env.ACQUISITION_OUTREACH_SEND_ENABLED !== "true") {
    return { available: false, provider, reason: "Sending is disabled." } as const;
  }
  if (process.env.ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED !== "true") {
    return { available: false, provider, reason: "Deliverability has not been verified." } as const;
  }
  if (!normalizedFrom(process.env.ACQUISITION_OUTREACH_FROM_EMAIL)) {
    return { available: false, provider, reason: "A dedicated outreach sender is not configured." } as const;
  }
  if (!normalizedEmail(process.env.ACQUISITION_OUTREACH_REPLY_TO_EMAIL)) {
    return { available: false, provider, reason: "A monitored outreach reply mailbox is not configured." } as const;
  }
  if (!normalizedSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    return { available: false, provider, reason: "The production site URL is not configured." } as const;
  }
  if ((process.env.EMAIL_UNSUBSCRIBE_SECRET || "").length < 32) {
    return { available: false, provider, reason: "Unsubscribe signing is not configured." } as const;
  }
  return null;
}

export function getAcquisitionOutreachTransportStatus(): AcquisitionOutreachTransportStatus {
  const provider = selectedProvider();
  const commonFailure = commonTransportFailure(provider);
  if (commonFailure) return commonFailure;

  if (provider === "zoho") {
    if (process.env.ACQUISITION_OUTREACH_ZOHO_REPLY_POLLING_VERIFIED !== "true") {
      return { available: false, provider, reason: "Zoho reply polling has not been verified." };
    }
    if (!getZohoMailConfig()) return { available: false, provider, reason: "Zoho Mail OAuth is not configured." };
    return { available: true, provider, reason: "Zoho Mail OAuth is configured, safety-verified, and explicitly enabled." };
  }

  if (process.env.ACQUISITION_OUTREACH_WEBHOOKS_VERIFIED !== "true") {
    return { available: false, provider, reason: "Reply and delivery webhooks have not been verified." };
  }
  if (!process.env.RESEND_API_KEY) return { available: false, provider, reason: "Resend is not configured." };
  if (!process.env.RESEND_WEBHOOK_SECRET?.startsWith("whsec_")) {
    return { available: false, provider, reason: "The Resend webhook signing secret is not configured." };
  }
  return { available: true, provider, reason: "Resend is configured, safety-verified, and explicitly enabled." };
}

export async function buildResendAcquisitionRequest(input: {
  accountId: string;
  contactId: string;
  draftId: string;
  to: string;
  subject: string;
  body: string;
  from: string;
  replyTo: string;
  siteUrl: string;
  unsubscribeSecret: string;
}) {
  const to = normalizedEmail(input.to);
  const from = normalizedFrom(input.from);
  const replyTo = normalizedEmail(input.replyTo);
  const siteUrl = normalizedSiteUrl(input.siteUrl);
  if (!to) throw new Error("ACQUISITION_OUTREACH_RECIPIENT_INVALID");
  if (!from) throw new Error("ACQUISITION_OUTREACH_SENDER_INVALID");
  if (!replyTo) throw new Error("ACQUISITION_OUTREACH_REPLY_TO_INVALID");
  if (!siteUrl) throw new Error("ACQUISITION_OUTREACH_SITE_URL_INVALID");
  const subject = input.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 160);
  const originalBody = input.body.trim().slice(0, 18_500);
  if (!subject || !originalBody) throw new Error("ACQUISITION_OUTREACH_MESSAGE_INVALID");

  const token = await createAcquisitionUnsubscribeToken(input.accountId, input.contactId, input.unsubscribeSecret);
  const unsubscribeUrl = `${siteUrl}/api/acquisition/unsubscribe?token=${encodeURIComponent(token)}`;
  const idempotencyKey = `acquisition-send-${input.draftId}`.slice(0, 256);
  const text = [originalBody, "", "Prefer not to receive further messages from Foremention?", `Unsubscribe: ${unsubscribeUrl}`]
    .join("\n")
    .slice(0, 20_000);

  return {
    headers: {
      "Idempotency-Key": idempotencyKey,
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    body: {
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "category", value: "acquisition_first_touch" },
        { name: "draft", value: input.draftId.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 256) },
      ],
    },
  };
}

async function buildZohoAcquisitionMessage(input: {
  accountId: string;
  contactId: string;
  to: string;
  subject: string;
  body: string;
}) {
  const to = normalizedEmail(input.to);
  const siteUrl = normalizedSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!to) throw new Error("ACQUISITION_OUTREACH_RECIPIENT_INVALID");
  if (!siteUrl) throw new Error("ACQUISITION_OUTREACH_SITE_URL_INVALID");
  const subject = input.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 160);
  const originalBody = input.body.trim().slice(0, 18_500);
  if (!subject || !originalBody) throw new Error("ACQUISITION_OUTREACH_MESSAGE_INVALID");
  const token = await createAcquisitionUnsubscribeToken(
    input.accountId,
    input.contactId,
    process.env.EMAIL_UNSUBSCRIBE_SECRET as string,
  );
  const unsubscribeUrl = `${siteUrl}/api/acquisition/unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject,
    content: [originalBody, "", "Prefer not to receive further messages from Foremention?", `Unsubscribe: ${unsubscribeUrl}`]
      .join("\n")
      .slice(0, 20_000),
  };
}

export async function sendAcquisitionOutreachEmail(input: {
  accountId: string;
  contactId: string;
  draftId: string;
  to: string;
  subject: string;
  body: string;
}) {
  const status = getAcquisitionOutreachTransportStatus();
  if (!status.available) throw new Error("ACQUISITION_OUTREACH_TRANSPORT_UNAVAILABLE");

  if (status.provider === "zoho") {
    const config = getZohoMailConfig();
    if (!config) throw new Error("ACQUISITION_ZOHO_OAUTH_CONFIG_INVALID");
    const accessToken = await refreshZohoMailAccessToken(config);
    await verifyZohoMailAccount({
      accessToken,
      mailBaseUrl: config.mailBaseUrl,
      accountId: config.accountId,
      expectedFromAddress: config.fromAddress,
    });
    const message = await buildZohoAcquisitionMessage(input);
    const result = await sendZohoMailMessage({
      accessToken,
      mailBaseUrl: config.mailBaseUrl,
      accountId: config.accountId,
      fromAddress: config.fromAddress,
      toAddress: message.to,
      subject: message.subject,
      content: message.content,
    });
    return {
      provider: "zoho" as const,
      externalReference: `zoho-${result.messageId}`.slice(0, 300),
      providerMessageId: result.mailId,
      idempotencyKey: null,
    };
  }

  const apiKey = process.env.RESEND_API_KEY as string;
  const request = await buildResendAcquisitionRequest({
    ...input,
    from: process.env.ACQUISITION_OUTREACH_FROM_EMAIL as string,
    replyTo: process.env.ACQUISITION_OUTREACH_REPLY_TO_EMAIL as string,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL as string,
    unsubscribeSecret: process.env.EMAIL_UNSUBSCRIBE_SECRET as string,
  });

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "user-agent": "Foremention-Acquisition/1.0",
      "Idempotency-Key": request.headers["Idempotency-Key"],
    },
    body: JSON.stringify(request.body),
  });
  if (!response.ok) throw new Error(`ACQUISITION_OUTREACH_PROVIDER_HTTP_${response.status}`);
  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error("ACQUISITION_OUTREACH_PROVIDER_MISSING_ID");
  return {
    provider: "resend" as const,
    externalReference: result.id,
    providerMessageId: null,
    idempotencyKey: request.headers["Idempotency-Key"],
  };
}
