// Fixture: must be flagged by foremention-auth-mutation-requires-trusted-origin.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  // ruleid: foremention-auth-mutation-requires-trusted-origin
  return NextResponse.json({ ok: Boolean(body) });
}
