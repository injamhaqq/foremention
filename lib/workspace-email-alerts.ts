import { ApplicationEmailSendUncertainError, sendProductAlertEmail } from "@/lib/application-email";
import { approvedWorkspaceAlertUrl, workspaceAlertIdempotencyKey } from "@/lib/jobs/notification-delivery-policy.mjs";
import { createEmailUnsubscribeToken } from "@/lib/email-unsubscribe";
import { safeOperationalError } from "@/lib/collection-policy";
import { supabaseRest } from "@/lib/supabase-rest";

export type WorkspaceEmailAlertKind = "first_run_completed" | "brand_new_source" | "brand_lost_source" | "competitor_overtook" | "weekly_digest" | "mention";
type WorkspaceEmailAlert = { organizationId: string; userId: string; eventKey: string; kind: WorkspaceEmailAlertKind; subject: string; text: string; href: string };

export async function sendWorkspaceEmailAlert(input: WorkspaceEmailAlert) {
  // `competitor_overtook` is produced only by the legacy pre-review run-change
  // detector. Keep it disabled until a post-review sender consumes the same
  // exact-question/provider/model/methodology gate as Safe Intelligence.
  if (input.kind === "competitor_overtook") return { status: "disabled" as const };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !siteUrl || !secret) return { status: "not_configured" as const };
  // Invalid, absolute, off-origin, or normalized-out-of-app links never reach
  // an external recipient and never reserve a unique delivery event key.
  let href: string;
  try {
    href = approvedWorkspaceAlertUrl(input.href, siteUrl);
  } catch {
    return { status: "invalid_link" as const };
  }
  const [preferences, memberships] = await Promise.all([
    supabaseRest<Array<{ email_enabled: boolean; weekly_digest_enabled: boolean; unsubscribed_at: string | null }>>(`notification_preferences?select=email_enabled,weekly_digest_enabled,unsubscribed_at&organization_id=eq.${input.organizationId}&user_id=eq.${input.userId}&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ member_email: string | null }>>(`organization_members?select=member_email&organization_id=eq.${input.organizationId}&user_id=eq.${input.userId}&limit=1`, { serviceRole: true }),
  ]);
  const preference = preferences[0]; const email = memberships[0]?.member_email?.trim().toLowerCase();
  if (!preference?.email_enabled || preference.unsubscribed_at || (input.kind === "weekly_digest" && !preference.weekly_digest_enabled) || !email) return { status: "disabled" as const };
  const inserted = await supabaseRest<Array<{ id: string }>>("application_email_deliveries?on_conflict=organization_id,user_id,event_key", {
    method: "POST", serviceRole: true, prefer: "resolution=ignore-duplicates,return=representation",
    body: { organization_id: input.organizationId, user_id: input.userId, event_key: input.eventKey, kind: input.kind, status: "pending" },
  });
  const delivery = inserted[0]; if (!delivery) return { status: "duplicate" as const };
  // Receipt reservation is durable and unique. Do not re-send duplicates:
  // the existing schema has no atomic lease/reclaim protocol, and an HTTP ACK
  // loss may mean the customer already received this message.
  let unsubscribe: string;
  try {
    const token = await createEmailUnsubscribeToken(input.organizationId, input.userId, secret);
    unsubscribe = new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, siteUrl).toString();
  } catch (error) {
    await supabaseRest(`application_email_deliveries?id=eq.${delivery.id}&organization_id=eq.${input.organizationId}`, {
      method: "PATCH", serviceRole: true, prefer: "return=minimal",
      body: { status: "failed", error_code: safeOperationalError(error), updated_at: new Date().toISOString() },
    }).catch(() => undefined);
    return { status: "failed" as const };
  }

  let providerMessageId: string;
  try {
    const result = await sendProductAlertEmail({
      to: email, subject: input.subject,
      text: `${input.text}\n\nOpen Foremention: ${href}\n\nUnsubscribe from product alerts: ${unsubscribe}`,
      headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      idempotencyKey: workspaceAlertIdempotencyKey(delivery.id),
    });
    providerMessageId = result.id;
  } catch (error) {
    const uncertain = error instanceof ApplicationEmailSendUncertainError;
    await supabaseRest(`application_email_deliveries?id=eq.${delivery.id}&organization_id=eq.${input.organizationId}`, {
      method: "PATCH", serviceRole: true, prefer: "return=minimal",
      body: {
        // pending + explicit error code means NOT confirmed failed or sent.
        status: uncertain ? "pending" : "failed",
        error_code: uncertain ? "delivery_outcome_uncertain" : safeOperationalError(error),
        updated_at: new Date().toISOString(),
      },
    }).catch(() => undefined);
    return uncertain ? { status: "uncertain" as const } : { status: "failed" as const };
  }

  try {
    await supabaseRest(`application_email_deliveries?id=eq.${delivery.id}&organization_id=eq.${input.organizationId}`, {
      method: "PATCH", serviceRole: true, prefer: "return=minimal",
      body: { status: "sent", provider_message_id: providerMessageId, error_code: null, updated_at: new Date().toISOString() },
    });
    return { status: "sent" as const };
  } catch {
    // Provider accepted the message; PostgREST settlement is uncertain.
    // Do not rewrite its ledger row as failed or resend the same event.
    return { status: "uncertain" as const };
  }
}
