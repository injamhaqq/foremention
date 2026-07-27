import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/session-cookies";
import { supabaseAuth } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const data = await supabaseAuth("token?grant_type=password", { email: email.trim().toLowerCase(), password });
    const token = String(data.access_token || "");
    if (!token) throw new Error("No session was returned.");
    const response = NextResponse.json({ ok: true, session: true });
    setSessionCookies(response, {
      accessToken: token,
      expiresIn: Number(data.expires_in || 3600),
      refreshToken: String(data.refresh_token || ""),
    });
    response.cookies.delete("foremention-demo");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    const friendly = /invalid login credentials/i.test(message)
      ? "The email or password is incorrect. If this is a new account, confirm the newest email first."
      : message;
    return NextResponse.json({ error: friendly }, { status: 401 });
  }
}
