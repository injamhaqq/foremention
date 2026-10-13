import { NextResponse } from "next/server";
import { sourceGapReceiptFromRows } from "@/lib/public-intake-state";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

const UNAVAILABLE = "Requests are temporarily unavailable. Email hello@foremention.com instead.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, string>;
    const required = ["email", "name", "website", "category", "competitors", "buyer_question", "consent"];
    if (required.some((key) => !String(body[key] || "").trim())) return NextResponse.json({ error: "Complete every field before submitting." }, { status: 400 });
    if (!/^https?:\/\//i.test(body.website)) return NextResponse.json({ error: "Use a full website URL beginning with http:// or https://." }, { status: 400 });
    // A01 (Chat05): never answer "received" for a request that was only
    // validated. Without storage the request is unavailable, not accepted.
    if (!supabaseConfigured()) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    const rows = await supabaseRest("source_gap_requests?select=id", { method: "POST", serviceRole: true, prefer: "return=representation", body: { email: body.email.trim().toLowerCase(), contact_name: body.name.trim(), website: body.website.trim(), category: body.category.trim(), competitors: body.competitors.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean), buyer_question: body.buyer_question.trim(), consent_at: new Date().toISOString(), status: "new" } });
    const reference = sourceGapReceiptFromRows(rows);
    if (!reference) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    return NextResponse.json({ received: true, reference, message: "Your request is saved. We’ll review the public evidence for your buyer question and reply with what we can and cannot support." }, { status: 201 });
  } catch { return NextResponse.json({ error: "The request could not be saved. Please try again or email hello@foremention.com." }, { status: 500 }); }
}
