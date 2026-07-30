import { NextResponse } from "next/server";
import { clearDemoCookie } from "@/lib/session-cookies";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/app/runs", request.url), 303);
  clearDemoCookie(response);
  return response;
}
