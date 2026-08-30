import type { Viewer } from "./auth.ts";
import { supabaseRest } from "./supabase-rest.ts";
import type { ReportSnapshot } from "./reporting.ts";

const TOKEN_BYTES = 32;
const DEFAULT_SHARE_DAYS = 7;
const MAX_SHARE_DAYS = 90;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createReportShareToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export async function hashReportShareToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("Invalid report share token.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return hex(new Uint8Array(digest));
}

export function reportShareExpiry(days = DEFAULT_SHARE_DAYS, now = new Date()) {
  const safeDays = Number.isInteger(days) ? Math.max(1, Math.min(MAX_SHARE_DAYS, days)) : DEFAULT_SHARE_DAYS;
  return new Date(now.getTime() + safeDays * 86_400_000);
}

export function safeReportSharePath(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("Invalid report share token.");
  return `/share/report/${token.toLowerCase()}`;
}

type ShareRow = { id: string; expires_at: string; revoked_at: string | null };

export async function createReportShare(viewer: Viewer, input: { organizationId: string; reportId: string; expiresInDays?: number }) {
  const token = createReportShareToken();
  const tokenHash = await hashReportShareToken(token);
  const expiresAt = reportShareExpiry(input.expiresInDays).toISOString();
  const rows = await supabaseRest<ShareRow[]>("report_shares", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: {
      organization_id: input.organizationId,
      report_snapshot_id: input.reportId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: viewer.id,
    },
  });
  if (!rows[0]) throw new Error("The report share could not be created.");
  // The raw token is never persisted or logged. It is returned exactly once.
  return { shareId: rows[0].id, path: safeReportSharePath(token), expiresAt };
}

export async function revokeReportShare(viewer: Viewer, input: { organizationId: string; reportId: string; shareId: string }) {
  const rows = await supabaseRest<ShareRow[]>(
    `report_shares?id=eq.${encodeURIComponent(input.shareId)}&report_snapshot_id=eq.${encodeURIComponent(input.reportId)}&organization_id=eq.${encodeURIComponent(input.organizationId)}`,
    {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=representation",
      body: { revoked_at: new Date().toISOString() },
    },
  );
  return Boolean(rows[0]);
}

export type PublicReportShare = {
  report_id: string;
  report_type: ReportSnapshot["type"];
  title: string;
  generated_at: string;
  data_as_of: string;
  expires_at: string;
  public_payload: ReportSnapshot;
};

export async function resolveReportShare(token: string, audit: { requestFingerprintHash?: string | null; userAgentHash?: string | null } = {}) {
  const tokenHash = await hashReportShareToken(token);
  // Access is logged inside resolve_report_share so anonymous callers never receive
  // insert permission on report_share_access_log.
  const rows = await supabaseRest<PublicReportShare[]>("rpc/resolve_report_share", {
    method: "POST",
    body: {
      p_token_hash: tokenHash,
      p_request_fingerprint_hash: audit.requestFingerprintHash || null,
      p_user_agent_hash: audit.userAgentHash || null,
    },
  });
  return rows[0] || null;
}
