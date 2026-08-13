import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/input-validation";
import { checkPasswordSafety, HashRangeUnavailable } from "@/lib/password-safety";
import { clearRecoverySession, RECOVERY_COOKIE, SESSION_COOKIE } from "@/lib/session-cookies";

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid password reset form." }, { status: 400 });
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) return NextResponse.json({ error: "Use at least 12 characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });

  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const recovery = cookieHeader.match(new RegExp(`(?:^|;\\s*)${RECOVERY_COOKIE}=([^;]+)`))?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || recovery !== "1" || !url || !anon) return NextResponse.json({ error: "Your recovery session has expired. Request a new reset link." }, { status: 401 });

  try {
    const safety = await checkPasswordSafety(password);
    if (safety.compromised) {
      return NextResponse.json({ error: "This password appears in known breach data. Choose a unique password you have not used elsewhere." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof HashRangeUnavailable) {
      return NextResponse.json({ error: "Password safety verification is temporarily unavailable. Your password was not changed. Please try again." }, { status: 503 });
    }
    throw error;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anon, authorization: `Bearer ${decodeURIComponent(token)}`, "content-type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Your recovery session has expired. Request a new reset link." }, { status: 401 });

  const result = NextResponse.json({ ok: true });
  clearRecoverySession(result);
  return result;
}
