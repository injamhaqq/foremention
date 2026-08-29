import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pricing = await readFile(new URL("../app/pricing/page.tsx", import.meta.url), "utf8");
const entitlement = await readFile(new URL("../supabase/migrations/20260724000100_free_beta_usage_controls.sql", import.meta.url), "utf8");
const providers = await readFile(new URL("../app/subprocessors/page.tsx", import.meta.url), "utf8");
const privacy = await readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
const policy = await readFile(new URL("../docs/PRIVATE-BETA-OPERATING-POLICY.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const firstWaveMerge = await readFile(new URL("../docs/FIRST-WAVE-MERGE.md", import.meta.url), "utf8");
const stripe = await readFile(new URL("../lib/stripe-billing.ts", import.meta.url), "utf8");

test("design-partner access stays free while self-serve billing is configuration-gated", () => {
  assert.match(entitlement, /plan text not null default 'free_beta'/);
  assert.match(entitlement, /check\s*\(\s*plan\s+in\s*\(\s*'free_beta'\s*\)\s*\)/);
  assert.match(pricing, /Founder-led design-partner pricing is being validated with real teams/i);
  assert.match(pricing, /Self-serve paid checkout is shown[\s\S]*only when billing is configured/i);
  assert.match(pricing, /does[\s\S]*not charge a card/i);
  assert.match(pricing, /Intelligence remains sales-led and custom-scoped/i);
  assert.doesNotMatch(pricing, /\$149|\$499/);
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_CORE_PRICE_ID", "STRIPE_SIGNAL_PRICE_ID"]) assert.match(stripe, new RegExp(key));
  assert.match(stripe, /mode:\s*"subscription"/);
  assert.match(stripe, /billing_portal\/sessions/);
});

test("repository documentation matches the configuration-gated commercial boundary", () => {
  for (const document of [readme, firstWaveMerge]) {
    assert.match(document, /Core/);
    assert.match(document, /Signal/);
    assert.match(document, /Intelligence/);
    assert.match(document, /design-partner/i);
    assert.match(document, /Stripe/i);
    assert.match(document, /fail-closed/i);
    assert.doesNotMatch(document, /\$149|\$499|149\/month|499\/month/);
  }
  assert.doesNotMatch(firstWaveMerge, /Meridian OS|Source Eclipse|Copper `#CF8B5C`/i);
  assert.match(firstWaveMerge, /Register\. Prove\. Prepare\./);
});

test("provider transparency does not overclaim activation or contracts", () => {
  for (const name of ["Cloudflare", "Supabase", "Inngest", "Resend", "Groq", "PostHog EU", "Microsoft Clarity", "Contentsquare"]) {
    assert.match(providers, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(providers, /not automatically active for every workspace/);
  assert.match(providers, /does not represent Sentry as an active production processor/);
  assert.match(providers, /does not expose enough information to name that underlying relay reliably/);
  assert.match(privacy, /feature that requires a provider or customer integration remains labelled until that connection is active/);
  assert.match(privacy, /<Link href="\/subprocessors">Subprocessors<\/Link>/);
});

test("operating policy refuses invented commercial and legal facts", () => {
  assert.match(policy, /no automatic paid checkout/);
  assert.match(policy, /no invented legal-entity or jurisdiction statement/);
  assert.match(policy, /does \*\*not\*\* authorize the product to fabricate facts/);
  assert.match(policy, /Primary incident owner: \*\*Founder \/ Operator\*\*/);
});