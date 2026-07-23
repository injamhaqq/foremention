import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const data = await supabaseAuth("token?grant_type=password", { email, password });
    const token = String(data.access_token || "");
    if (!token) throw new Error("No session was returned.");
    const response = NextResponse.json({ ok: true, session: true });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Number(data.expires_in || 3600) });
    response.cookies.delete("foremention-demo");
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication failed." }, { status: 401 }); }
}
