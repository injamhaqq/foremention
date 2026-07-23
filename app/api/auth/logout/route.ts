import { NextResponse } from "next/server";
import { DEMO_COOKIE, SESSION_COOKIE } from "@/lib/auth";
export async function POST(request: Request) { const response = NextResponse.redirect(new URL("/", request.url), 303); response.cookies.delete(DEMO_COOKIE); response.cookies.delete(SESSION_COOKIE); return response; }
