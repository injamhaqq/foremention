// Chat08 scratch probe for migrations/20261013120000_chat08_commercial_proof_fields.proposal.sql.
// Run with Chat02's replay harness (pglite is NOT a repo dependency):
//   mkdir -p /tmp/pgl && cd /tmp/pgl && npm init -y && npm i @electric-sql/pglite@0.5.9
//   cp <repo>/docs/execution/attach-v1/02-proposals/rls-replay/replay.mjs .   (from fm-attach-v1/02-security)
//   cp <repo>/docs/execution/attach-v1/08-proposals/verification/commercial-proposal-probe.mjs .
//   REPO=<repo> node replay.mjs <repo> ./commercial-proposal-probe.mjs
import { readFileSync } from "node:fs";

export default async function probe(db) {
  const repo = process.env.REPO;
  const sql = readFileSync(`${repo}/docs/execution/attach-v1/08-proposals/migrations/20261013120000_chat08_commercial_proof_fields.proposal.sql`, "utf8");
  const results = [];
  const check = async (name, fn, expectError) => {
    try { await fn(); results.push([name, expectError ? "FAIL (accepted)" : "PASS"]); }
    catch (e) { results.push([name, expectError ? "PASS" : "FAIL " + String(e.message).slice(0, 160)]); }
    try { await db.exec("rollback"); } catch {}
  };
  await check("proposal applies on replayed schema", () => db.exec(sql), false);
  await db.exec(`insert into public.commercial_accounts (id, company_name) values ('00000000-0000-0000-0000-0000000000a1', 'Probe Account')`);
  const ev = t => db.exec(`insert into public.commercial_events (account_id, event_type) values ('00000000-0000-0000-0000-0000000000a1', '${t}')`);
  await check("existing type customer_interview still accepted", () => ev("customer_interview"), false);
  await check("existing type payment_verified still accepted", () => ev("payment_verified"), false);
  await check("new type scoped_offer_delivered accepted", () => ev("scoped_offer_delivered"), false);
  await check("unknown type rejected", () => ev("made_up_event"), true);
  await check("continuation_decided without outcome rejected", () => ev("continuation_decided"), true);
  await check("continuation_decided with outcome accepted", () => db.exec(
    `insert into public.commercial_events (account_id, event_type, continuation_outcome) values ('00000000-0000-0000-0000-0000000000a1','continuation_decided','cancel')`), false);
  await check("invalid continuation outcome rejected", () => db.exec(
    `insert into public.commercial_events (account_id, event_type, continuation_outcome) values ('00000000-0000-0000-0000-0000000000a1','continuation_decided','auto_renew')`), true);
  const consent = (vol, scopes) => db.exec(`insert into public.commercial_case_study_consents
    (account_id, voluntary, scopes, approved_text_version, revocation_contact, evidence_ref, granted_at)
    values ('00000000-0000-0000-0000-0000000000a1', ${vol}, ${scopes}, 'v1', 'hello@example.test', 'signed-consent-0001', now())`);
  await check("voluntary scoped consent accepted", () => consent("true", "array['named_quote']"), false);
  await check("non-voluntary consent rejected", () => consent("false", "array['logo']"), true);
  await check("empty consent scopes rejected", () => consent("true", "array[]::text[]"), true);
  await check("unknown consent scope rejected", () => consent("true", "array['billboard']"), true);
  const time = (min, cost, ref, at = "now()") => db.exec(`insert into public.commercial_service_time_entries
    (account_kind, category, minutes, cash_cost_cents, cash_cost_ref, occurred_at) values ('external_customer','support',${min},${cost},${ref},${at})`);
  await check("valid time entry accepted", () => time(30, "null", "null"), false);
  await check("zero minutes rejected", () => time(0, "null", "null"), true);
  await check("cash cost without receipt ref rejected", () => time(30, 500, "null"), true);
  await check("anon cannot read service-time log", async () => {
    await db.exec("set role anon");
    try { await db.query("select * from public.commercial_service_time_entries"); }
    finally { await db.exec("reset role"); }
  }, true);
  await check("authenticated cannot read consents", async () => {
    await db.exec("set role authenticated");
    try { await db.query("select * from public.commercial_case_study_consents"); }
    finally { await db.exec("reset role"); }
  }, true);
  for (const [n, r] of results) console.log(r.startsWith("PASS") ? "PASS" : "FAIL", "-", n, r.startsWith("PASS") ? "" : r);
  const failed = results.filter(([, r]) => !r.startsWith("PASS")).length;
  console.log(`chat08 proposal probe: ${results.length - failed}/${results.length} pass`);
}
