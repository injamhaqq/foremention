// FM-00 coordinator: adopted worker proposals must stay byte-identical to their reviewed
// proposal files, and held proposals must stay out of supabase/migrations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

const ADOPTED = [
  ["supabase/migrations/20261013140000_chat04_customer_value_loop_persistence.sql",
    "docs/execution/attach-v1/04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql"],
  ["supabase/migrations/20261013150000_chat06_email_delivery_claim_settle.sql",
    "docs/execution/attach-v1/06-proposals/migrations/20261013150000_chat06_email_delivery_claim_settle.proposal.sql"],
];

for (const [migration, proposal] of ADOPTED) {
  test(`FM-00 adopted ${migration.split("/").pop()} byte-for-byte from its reviewed proposal`, async () => {
    assert.equal(await read(migration), await read(proposal));
  });
}

test("FM-00 holds back the Chat08 commercial-proof proposal (not in supabase/migrations)", async () => {
  const files = await readdir(new URL("supabase/migrations/", root));
  assert.ok(!files.some((f) => /chat08|commercial_proof/.test(f)), "Chat08 commercial-proof migration stays held");
  assert.ok((await read("docs/execution/attach-v1/08-proposals/migrations/20261013120000_chat08_commercial_proof_fields.proposal.sql")).length > 0);
});

test("Chat06 email delivery lease stays flag-off by default", async () => {
  const env = await read(".env.example");
  assert.doesNotMatch(env, /^FOREMENTION_EMAIL_DELIVERY_LEASE=enabled\s*$/m, "lease flag is not enabled in the example env");
  const lib = await read("lib/workspace-email-alerts.ts");
  assert.match(lib, /FOREMENTION_EMAIL_DELIVERY_LEASE/);
});
