import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { billingProviderConfigured, billingProviderId } from "@/lib/billing-provider";
import { PaddleSandboxPayment } from "@/components/paddle-sandbox-payment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Payment",
  description: "Complete a Foremention payment through an approved checkout.",
  path: "/pay",
  noIndex: true,
});

function sandboxPaymentAvailable(): boolean {
  // Never load Paddle checkout scripts or tokens into a production build.
  // A separately approved live integration must replace this gate.
  return process.env.NODE_ENV !== "production"
    && process.env.PADDLE_ENVIRONMENT === "sandbox"
    && process.env.PADDLE_SANDBOX_ADAPTER_ENABLED === "1"
    && billingProviderId() === "paddle"
    && billingProviderConfigured();
}

export default function PaymentPage() {
  const token = process.env.PADDLE_SANDBOX_CLIENT_TOKEN?.trim() || "";
  const available = sandboxPaymentAvailable() && /^test_[a-z0-9]+$/i.test(token);

  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Secure payment</span>
          <h1>{available ? "Paddle sandbox checkout" : "Online checkout is not yet available."}</h1>
          <p>
            {available
              ? "This is a test checkout. No real payment is collected. Verify the transaction details in the Paddle overlay."
              : "Foremention subscriptions are currently arranged with the team. The live payment experience is not activated."}
          </p>
        </div>
      </section>
      {available ? (
        <section className="section section--paper">
          <div className="shell narrow-heading">
            <PaddleSandboxPayment clientToken={token} />
          </div>
        </section>
      ) : (
        <section className="section section--paper">
          <div className="shell narrow-heading">
            <p><Link href="/contact">Contact Foremention about a pilot or subscription.</Link></p>
          </div>
        </section>
      )}
    </PublicShell>
  );
}
