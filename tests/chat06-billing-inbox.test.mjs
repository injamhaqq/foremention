// Route-level signed ingress fixtures. No remote Paddle, database, or mail.
import "./attach-v1-03-support/register.mjs";
import { createHmac, createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SECRET = "chat06-fixture-only-paddle-secret";
Object.assign(process.env, {
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL: "https://chat06-db.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-secret",
  BILLING_PROVIDER_ID: "paddle",
  PADDLE_ENVIRONMENT: "sandbox",
  PADDLE_SANDBOX_ADAPTER_ENABLED: "1",
  PADDLE_API_KEY: "pdl_sdbx_fixture",
  PADDLE_WEBHOOK_SECRET: SECRET,
  PADDLE_CORE_MONTHLY_PRICE_ID: "pri_" + "c".repeat(26),
  FOREMENTION_BILLING_DURABLE_INBOX: "enabled",
});
delete process.env.PADDLE_LIVE_ENABLED;
const { POST } = await import("../app/api/billing/webhook/route.ts");
const { verifiedBillingEnvelope } = await import("../lib/billing-verified-inbox.ts");
let num = 0;
function makeEvent() {
  num += 1;
  return JSON.stringify({
    event_id: "evt_" + String(num).padStart(26, "0"),
    event_type: "transaction.completed",
    occurred_at: new Date(Date.now() - 1000).toISOString(),
    data: { id: "txn_" + "x".repeat(26) },
  });
}
function signed(raw, tamper = false) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const h1 = createHmac("sha256", SECRET).update(ts + ":" + raw).digest("hex");
  return new Request("https://foremention.test/api/billing/webhook", {
    method: "POST",
    headers: { "paddle-signature": "ts=" + ts + ";h1=" + h1, "content-type": "application/json" },
    body: tamper ? raw + " " : raw,
  });
}
function fakeDatabase(resolver) {
  const original = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url,init) => {
    const u = new URL(url);
    assert.equal(u.origin, "https://chat06-db.invalid");
    const body = JSON.parse(init.body || "{}");
    calls.push({path:u.pathname,body});
    return resolver(body,u);
  };
  return {calls,restore:()=>{globalThis.fetch=original;}};
}
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});

test("valid signed event is durably enqueued and ACKed, without a paid entitlement",async()=>{
  const raw=makeEvent();
  const db=fakeDatabase((body)=>json({accepted:true,duplicate:false}));
  try{
    const r=await POST(signed(raw));const value=await r.json();
    assert.equal(r.status,200);assert.equal(value.queued,true);
    assert.equal(value.duplicate,false);
    assert.equal(db.calls.length,1);
    assert.equal(db.calls[0].path,"/rest/v1/rpc/enqueue_verified_billing_event");
    assert.equal(db.calls[0].body.p_raw_body,raw);
    assert.equal(db.calls[0].body.p_payload_sha256,createHash("sha256").update(raw).digest("hex"));
    assert.equal(db.calls[0].body.p_source_mode,"sandbox");
  } finally { db.restore(); }
});

test("identical provider replay is ACKed as duplicate when inbox confirms durable storage",async()=>{
  const raw=makeEvent();
  const db=fakeDatabase(()=>json({accepted:true,duplicate:true}));
  try{
    const r=await POST(signed(raw));
    assert.equal(r.status,200);assert.equal((await r.json()).duplicate,true);
    assert.equal(db.calls.length,1);
  } finally {db.restore();}
});

test("failed database commit and conflicting duplicate cannot be falsely ACKed",async()=>{
  for (const code of [409,503]) {
    const db=fakeDatabase(()=>json({message:"not committed"},code));
    try{ assert.equal((await POST(signed(makeEvent()))).status,503); }
    finally{db.restore();}
  }
});

test("tampered or unsigned events never call the database",async()=>{
  const db=fakeDatabase(()=>{throw Error("unsigned payload reached database");});
  try{
    assert.equal((await POST(signed(makeEvent(),true))).status,401);
    assert.equal((await POST(new Request("https://foremention.test/api/billing/webhook",{
      method:"POST",body:makeEvent()
    }))).status,401);
    assert.equal(db.calls.length,0);
  } finally {db.restore();}
});

test("oversize signed bodies fail before signature or database IO",async()=>{
  const db=fakeDatabase(()=>{throw Error("oversize event reached database");});
  try{
    const raw=JSON.stringify({event_id:"evt_"+"z".repeat(26),event_type:"transaction.completed",x:"x".repeat(262144)});
    assert.equal((await POST(signed(raw))).status,413);
    assert.equal(db.calls.length,0);
  } finally {db.restore();}
});

test("malformed signed envelope fails closed without writes",async()=>{
  const db=fakeDatabase(()=>{throw Error("malformed event reached database");});
  try{ assert.equal((await POST(signed("{}"))).status,503);assert.equal(db.calls.length,0); }
  finally{db.restore();}
});

test("fixture rejects missing or inconsistent Paddle envelope identifiers",()=>{
  for(const raw of ['{}','[1,2]',JSON.stringify({event_id:"bad",event_type:"hello"}),'not_json']) {
    assert.throws(()=>verifiedBillingEnvelope(raw));
  }
});

test("migration enforces role-only execution and row visibility; durable worker is feature gated",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/20261016190000_chat06_billing_verified_inbox.sql",import.meta.url),"utf8");
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on public\.billing_verified_event_inbox from public,anon,authenticated/i);
  assert.match(sql,/grant execute on function public\.claim_verified_billing_batch/i);
  assert.match(sql,/for update skip locked/i);
  assert.match(sql,/billing_event_integrity_conflict/);
  assert.match(sql,/billing_event_not_applied/);
  assert.match(sql,/billing_attempts_exhausted/);
});
