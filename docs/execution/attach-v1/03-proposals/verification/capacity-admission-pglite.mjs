import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite(); const q = (s, p) => db.query(s, p);
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log("ok  -", n); } catch (e) { fail++; console.log("FAIL-", n, e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
await db.exec(`create role anon; create role authenticated; create role service_role;
create table public.organization_entitlements (organization_id uuid primary key, status text, package_key text, billing_source text, expires_at timestamptz, max_prompts int default 10, monthly_run_units int default 20, max_brands int default 1);
create table public.prompts (id uuid primary key default gen_random_uuid(), organization_id uuid not null, active boolean not null default true);`);
await db.exec(readFileSync(process.argv[2] + "/supabase/migrations/20261011090000_package_capacity_from_verified_billing.sql", "utf8"));
const org = "11111111-1111-4111-8111-111111111111";
const asUser = async (fn) => { await db.exec(`select set_config('request.jwt.claims','{"role":"authenticated"}',false)`); try { return await fn(); } finally { await db.exec(`select set_config('request.jwt.claims','',false)`); } };
const insert = () => asUser(() => q("insert into prompts (organization_id) values ($1)", [org]));
const tryInsert = async () => { try { await insert(); return true; } catch (e) { if (/Prompt limit exceeded/.test(e.message)) return false; throw e; } };
await t("verified paddle core active -> trigger derives 25", async () => {
  await q("insert into organization_entitlements (organization_id,status,package_key,billing_source,expires_at,max_prompts) values ($1,'active','core','paddle', now()+interval '30 days', 999)", [org]);
  eq((await q("select max_prompts from organization_entitlements")).rows[0].max_prompts, 25, "cap");
});
await t("admission allows 25 then rejects 26th", async () => {
  let ok = 0; for (let i = 0; i < 26; i++) if (await tryInsert()) ok++;
  eq(ok, 25, "admitted");
});
await t("expired paid entitlement fails closed to 10 for new admission (reactivation)", async () => {
  await q("update organization_entitlements set expires_at = now() - interval '1 second'");
  await q("update prompts set active=false"); // service path
  let ok = 0; for (let i = 0; i < 12; i++) if (await tryInsert()) ok++;
  eq(ok, 10, "admitted after expiry");
});
await t("cancelled verified entitlement -> foundation 10 derived", async () => {
  await q("update organization_entitlements set status='cancelled', expires_at=null");
  eq((await q("select max_prompts from organization_entitlements")).rows[0].max_prompts, 10, "cap");
});
await t("signal active -> 100 derived; client-written max_prompts cannot exceed package", async () => {
  await q("update organization_entitlements set status='active', package_key='signal', expires_at=now()+interval '30 days', max_prompts=5000");
  eq((await q("select max_prompts from organization_entitlements")).rows[0].max_prompts, 100, "cap");
});
console.log(`# pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
