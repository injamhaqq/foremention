import { NextResponse } from "next/server";
import { clearRecoverySession, markRecoverySession, setSessionCookies } from "@/lib/session-cookies";

const allowedTypes = new Set(["signup", "recovery", "invite", "magiclink", "email_change"]);

export async function POST(request: Request) {
  const { token_hash, type } = await request.json().catch(() => ({})) as {
    token_hash?: string;
    type?: string;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token_hash || !type || !allowedTypes.has(type) || !url || !anon) {
    return NextResponse.json({ error: "This verification link is incomplete." }, { status: 400 });
  }

  const verification = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ token_hash, type }),
    cache: "no-store",
  });
  const data = await verification.json().catch(() => ({})) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    msg?: string;
    message?: string;
    error_description?: string;
  };

  if (!verification.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.msg || data.error_description || data.message || "This verification link is invalid or has expired." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, recovery: type === "recovery" });
  setSessionCookies(response, {
    accessToken: data.access_token,
    expiresIn: Math.max(60, Number(data.expires_in || 3600)),
    refreshToken: data.refresh_token,
  });
  if (type === "recovery") markRecoverySession(response);
  else clearRecoverySession(response);
  return response;
}
