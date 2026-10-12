// Fixture: origin check exists but only after work — must be flagged.
import { NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export async function DELETE(request: Request) {
  await fetch("https://example.invalid/side-effect", { method: "POST" });
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
