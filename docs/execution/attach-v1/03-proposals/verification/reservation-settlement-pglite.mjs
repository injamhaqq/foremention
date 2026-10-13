import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const repo = process.argv[2];
const db = new PGlite();
const q = (s, p) => db.query(s, p);
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log("ok  -", name); } catch (e) { fail++; console.log("FAIL-", name, e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table public.organizations (id uuid primary key);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create table public.billing_accounts (organization_id uuid primary key, provider text, state text, external_customer_id text, external_subscription_id text);
create table public.organization_entitlements (organization_id uuid primary key, status text, expires_at timestamptz);
`);
await db.exec(readFileSync(repo + "/supabase/migrations/20261010090000_fm09_paddle_checkout_reservations.sql", "utf8"));
await db.exec(readFileSync(repo + "/docs/execution/attach-v1/03-proposals/migrations/20261013090000_billing_checkout_reservation_settlement.sql", "utf8"));
const org = "11111111-1111-4111-8111-111111111111";
const r1 = "22222222-2222-4222-8222-222222222222", r2 = "33333333-3333-4333-8333-333333333333", r3 = "44444444-4444-4444-8444-444444444444";
const txn1 = "txn_" + "a".repeat(26), txn2 = "txn_" + "b".repeat(26);
await q("insert into organizations values ($1)", [org]);
const reserve = async (id) => (await q("select public.reserve_paddle_checkout($1,$2,'core','monthly') as ok", [id, org])).rows[0].ok;
const record = async (id, txn) => (await q("select public.record_paddle_checkout_session($1,$2,$3,'https://foremention.com/pay?_ptxn='||$3) as ok", [id, org, txn])).rows[0].ok;
await t("main defect reproduced: second reservation blocked while first is ready", async () => {
  eq(await reserve(r1), true, "first"); eq(await record(r1, txn1), true, "record");
  eq(await reserve(r2), false, "second blocked");
});
await t("settle rejects mismatched evidence", async () => {
  let threw = false; try { await q("select public.settle_paddle_checkout_reservation($1,$2,'paid:txn_x')", [org, txn1]); } catch { threw = true; }
  eq(threw, true, "threw");
});
await t("release refuses evidence for a different transaction", async () => {
  eq((await q("select public.release_paddle_checkout_reservation($1,$2,$3) as ok", [r1, org, "released:canceled:" + txn2])).rows[0].ok, false, "no release");
});
await t("settle ready -> reconciled with paid evidence, idempotent", async () => {
  eq((await q("select public.settle_paddle_checkout_reservation($1,$2,$3) as ok", [org, txn1, "paid:" + txn1])).rows[0].ok, true, "settle");
  eq((await q("select public.settle_paddle_checkout_reservation($1,$2,$3) as ok", [org, txn1, "paid:" + txn1])).rows[0].ok, true, "idempotent");
  eq((await q("select state, reconciliation_evidence from billing_checkout_reservations where id=$1", [r1])).rows[0], { state: "reconciled", reconciliation_evidence: "paid:" + txn1 }, "row");
});
await t("after settlement a later checkout can be reserved (after cancellation lifecycle)", async () => {
  eq(await reserve(r2), true, "second allowed"); eq(await record(r2, txn2), true, "record2");
});
await t("release ready -> reconciled for canceled/abandoned checkout, then next reservation allowed", async () => {
  eq((await q("select public.release_paddle_checkout_reservation($1,$2,$3) as ok", [r2, org, "released:abandoned:" + txn2])).rows[0].ok, true, "release");
  eq(await reserve(r3), true, "third allowed");
});
await t("uncertain reservation cannot be released by function (operator review only)", async () => {
  await q("select public.mark_paddle_checkout_uncertain($1,$2)", [r3, org]);
  eq((await q("select public.release_paddle_checkout_reservation($1,$2,$3) as ok", [r3, org, "released:canceled:" + txn2])).rows[0].ok, false, "not released");
});
await t("functions are not executable by authenticated", async () => {
  const r = (await q("select has_function_privilege('authenticated','public.settle_paddle_checkout_reservation(uuid,text,text)','execute') a, has_function_privilege('authenticated','public.release_paddle_checkout_reservation(uuid,uuid,text)','execute') b, has_function_privilege('service_role','public.settle_paddle_checkout_reservation(uuid,text,text)','execute') c")).rows[0];
  eq(r, { a: false, b: false, c: true }, "privileges");
});
console.log(`# pass ${pass} fail ${fail}`);
process.exit(fail ? 1 : 0);
