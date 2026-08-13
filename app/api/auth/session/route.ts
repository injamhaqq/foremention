import { NextResponse } from "next/server";
import { clearRecoverySession, markRecoverySession, setSessionCookies } from "@/lib/session-cookies";

export async function POST(request: Request) {
  const { access_token, expires_in, refresh_token, recovery } = await request.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    recovery?: boolean;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!access_token || !url || !anon) return NextResponse.json({ error: "The verification session could not be completed." }, { status: 400 });

  const profile = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!profile.ok) return NextResponse.json({ error: "This verification link is invalid or has expired. Please request a new one." }, { status: 401 });

  const response = NextResponse.json({ ok: true, recovery: Boolean(recovery) });
  setSessionCookies(response, {
    accessToken: access_token,
    expiresIn: Math.max(60, Number(expires_in || 3600)),
    refreshToken: refresh_token,
  });
  if (recovery) markRecoverySession(response);
  else clearRecoverySession(response);
  return response;
}
