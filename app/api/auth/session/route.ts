import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const { access_token, expires_in } = await request.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!access_token || !url || !anon) return NextResponse.json({ error: "The verification session could not be completed." }, { status: 400 });

  const profile = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!profile.ok) return NextResponse.json({ error: "This verification link is invalid or has expired. Please request a new one." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(60, Number(expires_in || 3600)),
  });
  return response;
}
