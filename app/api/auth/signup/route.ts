import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = (await request.json()) as { email?: string; password?: string; full_name?: string };
    if (!email || !password || !full_name) return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    const origin = new URL(request.url).origin;
    const data = await supabaseAuth("signup", {
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: full_name.trim() },
        emailRedirectTo: `${origin}/auth/callback?next=/app`,
      },
    });
    const token = String(data.access_token || "");
    if (!token) return NextResponse.json({ ok: true, session: false, message: "Check your email to confirm the account, then sign in." });
    const response = NextResponse.json({ ok: true, session: true });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Number(data.expires_in || 3600) });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account.";
    if (/email rate limit|rate limit/i.test(message)) return NextResponse.json({ error: "Email delivery is temporarily limited by the email provider. Please wait a few minutes before trying again." }, { status: 429 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
