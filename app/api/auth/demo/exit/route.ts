import { isTrustedMutationOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { clearDemoCookie } from "@/lib/session-cookies";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.redirect(new URL("/app/runs", request.url), 303);
  clearDemoCookie(response);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
