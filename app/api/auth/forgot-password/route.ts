import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (supabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${origin}/auth/callback?next=/reset-password`)}`, { method: "POST", headers: { apikey: anon, "content-type": "application/json" }, body: JSON.stringify({ email }) });
  }
  return NextResponse.json({ message: "If an account exists for that email, a recovery link is on its way." });
}
