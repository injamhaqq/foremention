import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/session-cookies";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/app", request.url), 303);
  response.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400,
  });
  response.headers.set("cache-control", "private, no-store");
  return response;
}
