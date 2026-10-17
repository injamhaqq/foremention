import { isTrustedMutationOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase-rest";
import { cleanText, readJsonObject } from "@/lib/input-validation";
import { AuthLinkError, authEmailDeliveryAvailable, generateAuthLink, sendRecoveryEmail } from "@/lib/auth-email-delivery";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Send a valid recovery form." }, { status: 400 });
  const email = cleanText(body.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const genericMessage = "If an account exists and delivery is available, a recovery link may arrive. If none arrives, try again later or contact support.";
  if (supabaseConfigured() && authEmailDeliveryAvailable()) {
    const incomingOrigin = new URL(request.url).origin;
    const origin = /localhost|127\.0\.0\.1|\[::1\]/.test(incomingOrigin)
      ? incomingOrigin
      : (process.env.NEXT_PUBLIC_SITE_URL || incomingOrigin).replace(/\/$/, "");
    try {
      const { actionLink } = await generateAuthLink({ type: "recovery", email, redirectTo: `${origin}/auth/callback` });
      await sendRecoveryEmail(email, actionLink);
    } catch (error) {
      // Never expose account existence through provider error/status differences.
      if (!(error instanceof AuthLinkError && error.userMissing)) {
        console.warn("Recovery delivery failed.", {
          category: error instanceof AuthLinkError && error.status === 429 ? "rate_limited" : "provider_unavailable",
        });
      }
      return NextResponse.json({ message: genericMessage });
    }
    return NextResponse.json({ message: genericMessage });
  }
  if (supabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const incomingOrigin = new URL(request.url).origin;
    const origin = /localhost|127\.0\.0\.1|\[::1\]/.test(incomingOrigin)
      ? incomingOrigin
      : (process.env.NEXT_PUBLIC_SITE_URL || incomingOrigin).replace(/\/$/, "");
    const delivery = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${origin}/auth/callback`)}`, { method: "POST", headers: { apikey: anon, "content-type": "application/json" }, body: JSON.stringify({ email }) });
    if (!delivery.ok) {
      console.warn("Recovery fallback transport failed.", { statusClass: Math.floor(delivery.status / 100) * 100 });
    }
  }
  return NextResponse.json({ message: genericMessage });
}
