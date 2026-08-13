import { sendProductAlertEmail } from "@/lib/application-email";
import { createEmailUnsubscribeToken } from "@/lib/email-unsubscribe";
import { safeOperationalError } from "@/lib/collection-policy";
import { supabaseRest } from "@/lib/supabase-rest";

export type WorkspaceEmailAlertKind = "first_run_completed" | "brand_new_source" | "brand_lost_source" | "competitor_overtook" | "weekly_digest" | "mention";
type WorkspaceEmailAlert = { organizationId: string; userId: string; eventKey: string; kind: WorkspaceEmailAlertKind; subject: string; text: string; href: string };

export async function sendWorkspaceEmailAlert(input: WorkspaceEmailAlert) {
  // The legacy collection worker can still request this comparison-derived email
  // while a run is waiting for human review. Customer movement must now pass the
  // Safe Intelligence exact-question/provider/model/methodology gate first, so
  // no competitor comparison email is allowed to escape through this generic
  // delivery helper. A future reviewed-comparison notifier can introduce a
  // separately named event only after that evidence boundary is satisfied.
  if (input.kind === "competitor_overtook") return { status: "withheld_comparability" as const };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !siteUrl || !secret) return { status: "not_configured" as const };
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
  try {
    const token = await createEmailUnsubscribeToken(input.organizationId, input.userId, secret);
    const href = new URL(input.href, siteUrl).toString(); const unsubscribe = new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, siteUrl).toString();
    const result = await sendProductAlertEmail({ to: email, subject: input.subject, text: `${input.text}\n\nOpen Foremention: ${href}\n\nUnsubscribe from product alerts: ${unsubscribe}`, headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
    await supabaseRest(`application_email_deliveries?id=eq.${delivery.id}&organization_id=eq.${input.organizationId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { status: "sent", provider_message_id: result.id, updated_at: new Date().toISOString() } });
    return { status: "sent" as const };
  } catch (error) {
    await supabaseRest(`application_email_deliveries?id=eq.${delivery.id}&organization_id=eq.${input.organizationId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { status: "failed", error_code: safeOperationalError(error), updated_at: new Date().toISOString() } }).catch(() => undefined);
    return { status: "failed" as const };
  }
}
