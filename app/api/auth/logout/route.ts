import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/session-cookies";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  clearSessionCookies(response);
  return response;
}
