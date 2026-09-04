import { NextResponse } from "next/server";
import {
  normalizeResendWebhookEvent,
  verifyResendWebhookSignature,
} from "@/lib/acquisition-resend-webhook";
import { processResendAcquisitionWebhook } from "@/lib/acquisition-resend-webhook-runtime";

const SUPPORTED_EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.failed",
  "email.received",
]);

export async function POST(request: Request) {
  const raw = await request.text();
  const svixId = request.headers.get("svix-id") || "";
  const svixTimestamp = request.headers.get("svix-timestamp") || "";
  const svixSignature = request.headers.get("svix-signature") || "";
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";

  if (!secret) return NextResponse.json({ error: "Webhook processing is not configured." }, { status: 503 });
  const verified = await verifyResendWebhookSignature(
    raw,
    { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
    secret,
  ).catch(() => false);
  if (!verified) return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const type = payload && typeof payload === "object" && !Array.isArray(payload)
    ? String((payload as Record<string, unknown>).type || "")
    : "";
  if (!SUPPORTED_EVENTS.has(type)) return NextResponse.json({ ok: true, status: "ignored" });

  try {
    const event = normalizeResendWebhookEvent(payload);
    const result = await processResendAcquisitionWebhook({ svixId, event });
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.warn("Acquisition Resend webhook processing failed.", {
      eventType: type || "unknown",
      errorCode: error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN",
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
