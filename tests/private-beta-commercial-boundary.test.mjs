import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pricing = await readFile(new URL("../app/pricing/page.tsx", import.meta.url), "utf8");
const entitlement = await readFile(new URL("../supabase/migrations/20260724000100_free_beta_usage_controls.sql", import.meta.url), "utf8");
const providers = await readFile(new URL("../app/subprocessors/page.tsx", import.meta.url), "utf8");
const privacy = await readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
const policy = await readFile(new URL("../docs/PRIVATE-BETA-OPERATING-POLICY.md", import.meta.url), "utf8");

test("self-serve production remains explicitly free beta", () => {
  assert.match(entitlement, /plan text not null default 'free_beta' check \(plan in \('free_beta'\)\)/);
  assert.match(pricing, /Self-serve signup currently creates a controlled free-beta workspace/);
  assert.match(pricing, /Planned paid packaging/);
  assert.match(pricing, /Creating a workspace does not charge a card or activate Core, Signal, or Intelligence/);
  assert.match(pricing, /Join private beta/);
});

test("provider transparency does not overclaim activation or contracts", () => {
  for (const name of ["Cloudflare", "Supabase", "Inngest", "Resend", "Groq", "PostHog EU", "Microsoft Clarity", "Contentsquare"]) {
    assert.match(providers, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(providers, /not automatically active for every workspace/);
  assert.match(providers, /does not represent Sentry as an active production processor/);
  assert.match(providers, /does not expose enough information to name that underlying relay reliably/);
  assert.match(privacy, /Service providers &amp; subprocessors/);
});

test("operating policy refuses invented commercial and legal facts", () => {
  assert.match(policy, /no automatic paid checkout/);
  assert.match(policy, /no invented legal-entity or jurisdiction statement/);
  assert.match(policy, /does not authorize the product to fabricate facts/);
  assert.match(policy, /Primary incident owner: \*\*Founder \/ Operator\*\*/);
});
