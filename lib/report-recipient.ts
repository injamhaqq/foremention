import { supabaseRest } from "./supabase-rest.ts";

const TOKEN_BYTES = 32;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createReportUnsubscribeToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export async function hashReportUnsubscribeToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("Invalid unsubscribe token.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return hex(new Uint8Array(digest));
}

export function safeReportUnsubscribePath(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Invalid unsubscribe token.");
  return `/api/reports/unsubscribe/${token.toLowerCase()}`;
}

export async function unsubscribeReportRecipient(token: string) {
  const tokenHash = await hashReportUnsubscribeToken(token);
  const rows = await supabaseRest<Array<{ id: string; active: boolean; unsubscribed_at: string | null }>>(
    `report_recipients?select=id,active,unsubscribed_at&unsubscribe_token_hash=eq.${tokenHash}&limit=1`,
    { serviceRole: true },
  );
  const recipient = rows[0];
  if (!recipient) return false;
  if (!recipient.active && recipient.unsubscribed_at) return true;
  const now = new Date().toISOString();
  await supabaseRest(`report_recipients?id=eq.${recipient.id}`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: { active: false, unsubscribed_at: now, unsubscribe_reason: "recipient_request" },
  });
  return true;
}
