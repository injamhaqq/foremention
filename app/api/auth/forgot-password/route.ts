import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid recovery form." }, { status: 400 });
  const email = cleanText(body.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (supabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const incomingOrigin = new URL(request.url).origin;
    const origin = /localhost|127\.0\.0\.1|\[::1\]/.test(incomingOrigin)
      ? incomingOrigin
      : (process.env.NEXT_PUBLIC_SITE_URL || incomingOrigin).replace(/\/$/, "");
    const delivery = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${origin}/auth/callback`)}`, { method: "POST", headers: { apikey: anon, "content-type": "application/json" }, body: JSON.stringify({ email }) });
    if (!delivery.ok && delivery.status === 429) {
      return NextResponse.json({ error: "Email delivery is temporarily busy. Wait a few minutes, then request one new link." }, { status: 429 });
    }
    if (!delivery.ok && delivery.status >= 500) {
      return NextResponse.json({ error: "The email provider is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
  }
  return NextResponse.json({ message: "If an account exists for that email, a recovery link is on its way." });
}
