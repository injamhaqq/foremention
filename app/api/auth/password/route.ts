import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { readJsonObject } from "@/lib/input-validation";

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid password reset form." }, { status: 400 });
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });

  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return NextResponse.json({ error: "Your recovery session has expired. Request a new reset link." }, { status: 401 });

  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anon, authorization: `Bearer ${decodeURIComponent(token)}`, "content-type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Your recovery session has expired. Request a new reset link." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
