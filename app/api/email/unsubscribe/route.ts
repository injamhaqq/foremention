import { NextResponse } from "next/server";
import { verifyEmailUnsubscribeToken } from "@/lib/email-unsubscribe";
import { supabaseRest } from "@/lib/supabase-rest";

async function unsubscribe(token: string) {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET || "";
  const payload = await verifyEmailUnsubscribeToken(token, secret);
  if (!payload) return null;
  await supabaseRest("notification_preferences?on_conflict=organization_id,user_id", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { organization_id: payload.organizationId, user_id: payload.userId, email_enabled: false, unsubscribed_at: new Date().toISOString() } });
  return payload;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const token = contentType.includes("application/json") ? String((await request.json().catch(() => ({})) as { token?: string }).token || "") : String((await request.formData().catch(() => new FormData())).get("token") || "");
  if (!await unsubscribe(token)) return NextResponse.json({ error: "This unsubscribe link is invalid or expired." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
