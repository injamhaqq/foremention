import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/session-cookies";
import { SupabaseAuthError, supabaseAuth } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return NextResponse.json({ error: "Send a valid sign-in form." }, { status: 400 });
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const data = await supabaseAuth("token?grant_type=password", { email, password });
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
    if (error instanceof SupabaseAuthError && error.retryable) {
      return NextResponse.json({ error: "Sign-in is temporarily unavailable. Your account was not changed. Please try again in a moment." }, { status: error.status === 429 ? 429 : 503 });
    }
    const message = error instanceof Error ? error.message : "Authentication failed.";
    const friendly = /invalid login credentials/i.test(message)
      ? "The email or password is incorrect. If this is a new account, confirm the newest email first."
      : message;
    return NextResponse.json({ error: friendly }, { status: 401 });
  }
}
