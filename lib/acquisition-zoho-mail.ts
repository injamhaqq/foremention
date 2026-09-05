const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_ID_PATTERN = /^[0-9]{6,30}$/;

const ZOHO_DATA_CENTER_ENDPOINTS = new Map<string, string>([
  ["https://accounts.zoho.com", "https://mail.zoho.com"],
  ["https://accounts.zoho.eu", "https://mail.zoho.eu"],
  ["https://accounts.zoho.in", "https://mail.zoho.in"],
  ["https://accounts.zoho.com.au", "https://mail.zoho.com.au"],
  ["https://accounts.zoho.jp", "https://mail.zoho.jp"],
  ["https://accounts.zohocloud.ca", "https://mail.zohocloud.ca"],
  ["https://accounts.zoho.com.cn", "https://mail.zoho.com.cn"],
  ["https://accounts.zoho.ae", "https://mail.zoho.ae"],
  ["https://accounts.zoho.sa", "https://mail.zoho.sa"],
]);
const ALLOWED_ACCOUNTS_BASE_URLS = new Set(ZOHO_DATA_CENTER_ENDPOINTS.keys());
const ALLOWED_MAIL_BASE_URLS = new Set(ZOHO_DATA_CENTER_ENDPOINTS.values());

type FetchLike = typeof fetch;

export type ZohoMailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountId: string;
  accountsBaseUrl: string;
  mailBaseUrl: string;
  fromAddress: string;
};

export type ZohoMailMessageSummary = {
  messageId: string;
  folderId: string;
  threadId: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  subject: string | null;
  receivedAt: string;
};

function boundedSecret(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\r\n]/.test(trimmed)) return null;
  return trimmed;
}

function normalizedBaseUrl(value: unknown, allowed: Set<string>) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    const normalized = url.origin;
    return allowed.has(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function zohoEmailAddress(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\r\n]+/g, " ");
  const angle = normalized.match(/<([^<>]+)>/);
  const address = (angle?.[1] ?? normalized).trim().toLowerCase();
  return EMAIL_PATTERN.test(address) ? address : null;
}

export function getZohoMailConfig(): ZohoMailConfig | null {
  const clientId = boundedSecret(process.env.ZOHO_MAIL_CLIENT_ID, 300);
  const clientSecret = boundedSecret(process.env.ZOHO_MAIL_CLIENT_SECRET, 500);
  const refreshToken = boundedSecret(process.env.ZOHO_MAIL_REFRESH_TOKEN, 1000);
  const accountId = boundedSecret(process.env.ZOHO_MAIL_ACCOUNT_ID, 40);
  const accountsBaseUrl = normalizedBaseUrl(process.env.ZOHO_MAIL_ACCOUNTS_BASE_URL, ALLOWED_ACCOUNTS_BASE_URLS);
  const mailBaseUrl = normalizedBaseUrl(process.env.ZOHO_MAIL_API_BASE_URL, ALLOWED_MAIL_BASE_URLS);
  const fromAddress = zohoEmailAddress(process.env.ACQUISITION_OUTREACH_FROM_EMAIL);
  if (!clientId || !clientSecret || !refreshToken || !accountId || !ACCOUNT_ID_PATTERN.test(accountId)) return null;
  if (!accountsBaseUrl || !mailBaseUrl || ZOHO_DATA_CENTER_ENDPOINTS.get(accountsBaseUrl) !== mailBaseUrl || !fromAddress) return null;
  return { clientId, clientSecret, refreshToken, accountId, accountsBaseUrl, mailBaseUrl, fromAddress };
}

export async function refreshZohoMailAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsBaseUrl: string;
  fetchImpl?: FetchLike;
}) {
  const accountsBaseUrl = normalizedBaseUrl(input.accountsBaseUrl, ALLOWED_ACCOUNTS_BASE_URLS);
  if (!accountsBaseUrl) throw new Error("ACQUISITION_ZOHO_ACCOUNTS_ENDPOINT_INVALID");
  const clientId = boundedSecret(input.clientId, 300);
  const clientSecret = boundedSecret(input.clientSecret, 500);
  const refreshToken = boundedSecret(input.refreshToken, 1000);
  if (!clientId || !clientSecret || !refreshToken) throw new Error("ACQUISITION_ZOHO_OAUTH_CONFIG_INVALID");

  const response = await (input.fetchImpl ?? fetch)(`${accountsBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "Foremention-Acquisition/1.0" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ACQUISITION_ZOHO_OAUTH_HTTP_${response.status}`);
  const payload = await response.json() as { access_token?: unknown; expires_in?: unknown; error?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    throw new Error("ACQUISITION_ZOHO_OAUTH_ACCESS_TOKEN_MISSING");
  }
  return payload.access_token.trim();
}

function accountSenderAddresses(data: Record<string, unknown>) {
  const addresses = new Set<string>();
  for (const value of [data.primaryEmailAddress, data.mailboxAddress, data.incomingUserName]) {
    const address = zohoEmailAddress(value);
    if (address) addresses.add(address);
  }
  if (Array.isArray(data.emailAddress)) {
    for (const entry of data.emailAddress) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      if (row.isConfirmed === false) continue;
      const address = zohoEmailAddress(row.mailId);
      if (address) addresses.add(address);
    }
  }
  if (Array.isArray(data.sendMailDetails)) {
    for (const entry of data.sendMailDetails) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      if (row.status === false) continue;
      const address = zohoEmailAddress(row.fromAddress);
      if (address) addresses.add(address);
    }
  }
  return addresses;
}

export async function verifyZohoMailAccount(input: {
  accessToken: string;
  mailBaseUrl: string;
  accountId: string;
  expectedFromAddress: string;
  fetchImpl?: FetchLike;
}) {
  const mailBaseUrl = normalizedBaseUrl(input.mailBaseUrl, ALLOWED_MAIL_BASE_URLS);
  if (!mailBaseUrl || !ACCOUNT_ID_PATTERN.test(input.accountId)) throw new Error("ACQUISITION_ZOHO_MAIL_ENDPOINT_INVALID");
  const expected = zohoEmailAddress(input.expectedFromAddress);
  if (!expected) throw new Error("ACQUISITION_ZOHO_SENDER_INVALID");
  const response = await (input.fetchImpl ?? fetch)(`${mailBaseUrl}/api/accounts/${encodeURIComponent(input.accountId)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${input.accessToken}`, Accept: "application/json", "user-agent": "Foremention-Acquisition/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ACQUISITION_ZOHO_ACCOUNT_HTTP_${response.status}`);
  const payload = await response.json() as { data?: Record<string, unknown> };
  const data = payload.data;
  if (!data || String(data.accountId ?? "") !== input.accountId) throw new Error("ACQUISITION_ZOHO_ACCOUNT_ID_MISMATCH");
  if (data.enabled === false || data.outgoingBlocked === true || data.smtpStatus === false) {
    throw new Error("ACQUISITION_ZOHO_ACCOUNT_OUTBOUND_UNAVAILABLE");
  }
  if (!accountSenderAddresses(data).has(expected)) throw new Error("ACQUISITION_ZOHO_ACCOUNT_SENDER_MISMATCH");
  return { accountId: input.accountId, sender: expected };
}

export class ZohoMailSendUncertainError extends Error {
  constructor(message = "ACQUISITION_ZOHO_SEND_UNCERTAIN") {
    super(message);
    this.name = "ZohoMailSendUncertainError";
  }
}

export async function sendZohoMailMessage(input: {
  accessToken: string;
  mailBaseUrl: string;
  accountId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  content: string;
  fetchImpl?: FetchLike;
}) {
  const mailBaseUrl = normalizedBaseUrl(input.mailBaseUrl, ALLOWED_MAIL_BASE_URLS);
  if (!mailBaseUrl || !ACCOUNT_ID_PATTERN.test(input.accountId)) throw new Error("ACQUISITION_ZOHO_MAIL_ENDPOINT_INVALID");
  const fromAddress = zohoEmailAddress(input.fromAddress);
  const toAddress = zohoEmailAddress(input.toAddress);
  const subject = input.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 160);
  const content = input.content.trim().slice(0, 20_000);
  if (!fromAddress || !toAddress || !subject || !content) throw new Error("ACQUISITION_ZOHO_MESSAGE_INVALID");

  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(`${mailBaseUrl}/api/accounts/${encodeURIComponent(input.accountId)}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${input.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": "Foremention-Acquisition/1.0",
      },
      body: JSON.stringify({ fromAddress, toAddress, subject, content, mailFormat: "plaintext" }),
      cache: "no-store",
    });
  } catch {
    throw new ZohoMailSendUncertainError();
  }

  if (!response.ok) {
    if (response.status >= 500) throw new ZohoMailSendUncertainError(`ACQUISITION_ZOHO_SEND_HTTP_${response.status}_UNCERTAIN`);
    throw new Error(`ACQUISITION_ZOHO_SEND_HTTP_${response.status}`);
  }
  let payload: { data?: { messageId?: unknown; mailId?: unknown } };
  try {
    payload = await response.json() as { data?: { messageId?: unknown; mailId?: unknown } };
  } catch {
    throw new ZohoMailSendUncertainError("ACQUISITION_ZOHO_SEND_RESPONSE_UNCERTAIN");
  }
  const messageId = typeof payload.data?.messageId === "string" ? payload.data.messageId : String(payload.data?.messageId ?? "");
  const mailId = typeof payload.data?.mailId === "string" ? payload.data.mailId.trim() : "";
  if (!messageId || !mailId) throw new ZohoMailSendUncertainError("ACQUISITION_ZOHO_SEND_IDENTITY_UNCERTAIN");
  return { messageId, mailId };
}

function safeReceivedAt(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" && /^\d{10,16}$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return new Date().toISOString();
  const millis = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

export async function searchZohoUnreadMessages(input: {
  accessToken: string;
  mailBaseUrl: string;
  accountId: string;
  limit?: number;
  fetchImpl?: FetchLike;
}) {
  const mailBaseUrl = normalizedBaseUrl(input.mailBaseUrl, ALLOWED_MAIL_BASE_URLS);
  if (!mailBaseUrl || !ACCOUNT_ID_PATTERN.test(input.accountId)) throw new Error("ACQUISITION_ZOHO_MAIL_ENDPOINT_INVALID");
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 25), 1), 50);
  const url = new URL(`${mailBaseUrl}/api/accounts/${encodeURIComponent(input.accountId)}/messages/search`);
  url.searchParams.set("searchKey", "newMails");
  url.searchParams.set("start", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("includeto", "true");
  const response = await (input.fetchImpl ?? fetch)(url, {
    headers: { Authorization: `Zoho-oauthtoken ${input.accessToken}`, Accept: "application/json", "user-agent": "Foremention-Acquisition/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ACQUISITION_ZOHO_SEARCH_HTTP_${response.status}`);
  const payload = await response.json() as { data?: Array<Record<string, unknown>> };
  return (Array.isArray(payload.data) ? payload.data : []).flatMap((row): ZohoMailMessageSummary[] => {
    const messageId = String(row.messageId ?? "");
    const folderId = String(row.folderId ?? "");
    if (!ACCOUNT_ID_PATTERN.test(messageId) || !ACCOUNT_ID_PATTERN.test(folderId)) return [];
    return [{
      messageId,
      folderId,
      threadId: row.threadId == null ? null : String(row.threadId),
      fromAddress: zohoEmailAddress(row.fromAddress),
      toAddress: typeof row.toAddress === "string" ? row.toAddress.slice(0, 1000) : null,
      subject: typeof row.subject === "string" ? row.subject.trim().slice(0, 500) : null,
      receivedAt: safeReceivedAt(row.receivedTime ?? row.receivedtime ?? row.sentDateInGMT),
    }];
  });
}

export async function getZohoMessageHeader(input: {
  accessToken: string;
  mailBaseUrl: string;
  accountId: string;
  folderId: string;
  messageId: string;
  fetchImpl?: FetchLike;
}) {
  const mailBaseUrl = normalizedBaseUrl(input.mailBaseUrl, ALLOWED_MAIL_BASE_URLS);
  if (!mailBaseUrl || !ACCOUNT_ID_PATTERN.test(input.accountId) || !ACCOUNT_ID_PATTERN.test(input.folderId) || !ACCOUNT_ID_PATTERN.test(input.messageId)) {
    throw new Error("ACQUISITION_ZOHO_MESSAGE_ID_INVALID");
  }
  const response = await (input.fetchImpl ?? fetch)(`${mailBaseUrl}/api/accounts/${input.accountId}/folders/${input.folderId}/messages/${input.messageId}/header?raw=true`, {
    headers: { Authorization: `Zoho-oauthtoken ${input.accessToken}`, Accept: "application/json", "user-agent": "Foremention-Acquisition/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ACQUISITION_ZOHO_HEADER_HTTP_${response.status}`);
  const payload = await response.json() as { data?: { headerContent?: unknown } };
  return typeof payload.data?.headerContent === "string" ? payload.data.headerContent.slice(0, 50_000) : "";
}

export async function getZohoMessageContent(input: {
  accessToken: string;
  mailBaseUrl: string;
  accountId: string;
  folderId: string;
  messageId: string;
  fetchImpl?: FetchLike;
}) {
  const mailBaseUrl = normalizedBaseUrl(input.mailBaseUrl, ALLOWED_MAIL_BASE_URLS);
  if (!mailBaseUrl || !ACCOUNT_ID_PATTERN.test(input.accountId) || !ACCOUNT_ID_PATTERN.test(input.folderId) || !ACCOUNT_ID_PATTERN.test(input.messageId)) {
    throw new Error("ACQUISITION_ZOHO_MESSAGE_ID_INVALID");
  }
  const response = await (input.fetchImpl ?? fetch)(`${mailBaseUrl}/api/accounts/${input.accountId}/folders/${input.folderId}/messages/${input.messageId}/content?includeBlockContent=false`, {
    headers: { Authorization: `Zoho-oauthtoken ${input.accessToken}`, Accept: "application/json", "user-agent": "Foremention-Acquisition/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ACQUISITION_ZOHO_CONTENT_HTTP_${response.status}`);
  const payload = await response.json() as { data?: { content?: unknown } };
  return typeof payload.data?.content === "string" ? payload.data.content.slice(0, 50_000) : "";
}
