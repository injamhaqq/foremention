import { NextResponse } from "next/server";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, string>;
    const required = ["email", "name", "website", "category", "competitors", "buyer_question", "consent"];
    if (required.some((key) => !String(body[key] || "").trim())) return NextResponse.json({ error: "Complete every field before submitting." }, { status: 400 });
    if (!/^https?:\/\//i.test(body.website)) return NextResponse.json({ error: "Use a full website URL beginning with http:// or https://." }, { status: 400 });
    if (supabaseConfigured()) {
      await supabaseRest("source_gap_requests", { method: "POST", serviceRole: true, prefer: "return=minimal", body: { email: body.email.trim().toLowerCase(), contact_name: body.name.trim(), website: body.website.trim(), category: body.category.trim(), competitors: body.competitors.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean), buyer_question: body.buyer_question.trim(), consent_at: new Date().toISOString(), status: "new" } });
    }
    return NextResponse.json({ ok: true, message: supabaseConfigured() ? "Your check is saved. We’ll review the category and reply with the next step." : "Demo mode is active, so this request was validated but not stored. Connect Supabase to persist live requests." }, { status: 202 });
  } catch { return NextResponse.json({ error: "The request could not be saved. Please try again." }, { status: 500 }); }
}
