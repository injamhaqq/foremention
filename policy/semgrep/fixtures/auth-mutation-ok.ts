// Fixture: compliant — must NOT be flagged.
import { NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
