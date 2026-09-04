import { NextResponse } from "next/server";
import { suppressAcquisitionContact } from "@/lib/acquisition-outreach-persistence";
import { verifyAcquisitionUnsubscribeToken } from "@/lib/acquisition-outreach-unsubscribe";

function tokenFrom(request: Request) {
  return new URL(request.url).searchParams.get("token") || "";
}

async function verifiedPayload(request: Request) {
  return verifyAcquisitionUnsubscribeToken(tokenFrom(request), process.env.EMAIL_UNSUBSCRIBE_SECRET || "");
}

export async function GET(request: Request) {
  const payload = await verifiedPayload(request);
  if (!payload) {
    return new NextResponse("This unsubscribe link is invalid or expired.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const action = new URL(request.url);
  action.hash = "";
  const escapedAction = action.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe from Foremention outreach</title></head><body><main><h1>Stop Foremention outreach</h1><p>This page has not changed your preferences yet.</p><form method="post" action="${escapedAction}"><button type="submit">Unsubscribe</button></form></main></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const payload = await verifiedPayload(request);
  if (!payload) {
    return NextResponse.json({ error: "This unsubscribe link is invalid or expired." }, { status: 400 });
  }

  await suppressAcquisitionContact({
    accountId: payload.accountId,
    contactId: payload.contactId,
    reason: "unsubscribe",
    sourceSystem: "one_click_unsubscribe",
    sourceReference: "signed_token",
  });

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
