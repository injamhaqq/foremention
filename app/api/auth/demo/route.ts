import { DEMO_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/app", request.url), 303);
  response.cookies.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });
  return response;
}
