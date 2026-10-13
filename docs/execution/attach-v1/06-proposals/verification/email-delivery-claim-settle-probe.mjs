// Chat06 scratch probe for
//   06-proposals/migrations/20261013150000_chat06_email_delivery_claim_settle.proposal.sql
// Disposable PGlite only (NOT a repo dependency, never production). Run with
// Chat02's replay harness (fm-attach-v1/02-security
// docs/execution/attach-v1/02-proposals/rls-replay/replay.mjs):
//   mkdir -p /tmp/pgl && cd /tmp/pgl && npm init -y && npm i @electric-sql/pglite@0.5.9
//   cp <02 tree>/docs/execution/attach-v1/02-proposals/rls-replay/replay.mjs .
//   PROPOSAL=<06 tree>/docs/execution/attach-v1/06-proposals/migrations/20261013150000_chat06_email_delivery_claim_settle.proposal.sql \
//     node replay.mjs <repo tree whose migrations to replay> <06 tree>/docs/execution/attach-v1/06-proposals/verification/email-delivery-claim-settle-probe.mjs
// PGlite is a single connection: "simultaneous" claims are serialised here.
// A true two-connection race on real Postgres remains an FM-00/Chat09 gate.
import { readFileSync } from "node:fs";

const ORG = "0e000000-0000-4000-8000-0000000000e1";
const ORG2 = "0e000000-0000-4000-8000-0000000000e2";
const U1 = "0e000000-0000-4000-8000-0000000000a1";
const U2 = "0e000000-0000-4000-8000-0000000000a2";

export default async function probe(db) {
  const results = [];
  const q = async (sql, params = []) => (await db.query(sql, params)).rows;
  const one = async (sql, params = []) => (await q(sql, params))[0];
  const check = async (name, fn) => {
    try { await fn(); results.push([name, "PASS"]); }
    catch (error) { results.push([name, "FAIL " + String(error.message).slice(0, 200)]); try { await db.exec("rollback"); } catch {} try { await db.exec("reset role"); } catch {} }
  };
  const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
  const enqueue = async (event, user = U1, org = ORG, kind = "mention") =>
    (await one("select public.enqueue_application_email_delivery($1,$2,$3,$4) r", [org, user, event, kind])).r;
  const claim = async (id, org = ORG) => (await one("select public.claim_application_email_delivery($1,$2) r", [id, org])).r;
  const settle = async (id, c, outcome, msg = null, err = null, org = ORG) =>
    (await one("select public.settle_application_email_delivery($1,$2,$3,$4,$5,$6,$7) r", [id, org, c.generation, c.lease_token, outcome, msg, err])).r;
  const row = async (id) => one("select * from public.application_email_deliveries where id=$1", [id]);

  await check("proposal applies on replayed schema", async () => { await db.exec(readFileSync(process.env.PROPOSAL, "utf8")); });

  await db.exec(`
    insert into auth.users (id, email) values ('${U1}', 'u1@example.invalid'), ('${U2}', 'u2@example.invalid') on conflict do nothing;
    insert into public.organizations (id, name, slug) values ('${ORG}', 'Probe Org', 'probe-org-e1'), ('${ORG2}', 'Probe Org 2', 'probe-org-e2') on conflict do nothing;
    insert into public.organization_members (organization_id, user_id, role, member_email) values
      ('${ORG}', '${U1}', 'analyst', ' U1@Example.Invalid '), ('${ORG}', '${U2}', 'viewer', 'u2@example.invalid') on conflict do nothing;
    insert into public.notification_preferences (organization_id, user_id, email_enabled, weekly_digest_enabled) values
      ('${ORG}', '${U1}', true, false), ('${ORG}', '${U2}', true, true) on conflict do nothing;
  `);

  let id; let c1;
  await check("enqueue creates once; duplicate event returns same id, created=false", async () => {
    const a = await enqueue("evt:1"); const b = await enqueue("evt:1");
    expect(a.created === true && b.created === false && a.delivery_id === b.delivery_id, JSON.stringify([a, b]));
    id = a.delivery_id;
    const r = await row(id);
    expect(r.enqueued_via_lease && r.status === "pending" && r.provider_idempotency_key === "foremention-alert:" + id, "row shape");
  });
  await check("claim leases generation 1 with DB-current normalised recipient", async () => {
    c1 = await claim(id);
    expect(c1.claimed && c1.generation === 1 && c1.attempt === 1 && c1.recipient_email === "u1@example.invalid", JSON.stringify(c1));
    expect(c1.idempotency_key === "foremention-alert:" + id, "idempotency key");
  });
  await check("second claim while lease active is refused (leased_elsewhere)", async () => {
    const c = await claim(id); expect(!c.claimed && c.reason === "leased_elsewhere", JSON.stringify(c));
  });
  await check("cross-tenant claim/settle cannot see the row", async () => {
    const c = await claim(id, ORG2); expect(!c.claimed && c.reason === "not_found", JSON.stringify(c));
    const s = await settle(id, c1, "sent", "m-x", null, ORG2); expect(!s.settled && s.reason === "not_found", JSON.stringify(s));
  });
  let c2;
  await check("expired lease inside idempotency window is reclaimed as generation 2", async () => {
    await q("update public.application_email_deliveries set lease_expires_at = now() - interval '1 second' where id=$1", [id]);
    c2 = await claim(id); expect(c2.claimed && c2.generation === 2 && c2.lease_token !== c1.lease_token, JSON.stringify(c2));
    expect(c2.idempotency_key === c1.idempotency_key, "same provider idempotency key across generations");
  });
  await check("stale generation-1 settle is rejected after reclaim", async () => {
    const s = await settle(id, c1, "sent", "m-old"); expect(!s.settled && s.reason === "stale_generation", JSON.stringify(s));
    expect((await row(id)).status === "pending", "still pending");
  });
  await check("forged lease token with current generation is rejected", async () => {
    const s = await settle(id, { generation: 2, lease_token: "00000000-0000-4000-8000-000000000000" }, "sent", "m-forged");
    expect(!s.settled && s.reason === "lease_mismatch", JSON.stringify(s));
  });
  await check("sent requires a provider receipt", async () => {
    let threw = false; try { await settle(id, c2, "sent", null); } catch { threw = true; } expect(threw, "accepted sent without receipt");
  });
  await check("current generation settles sent; DB-ACK-loss retry is idempotent; no further claim", async () => {
    const s = await settle(id, c2, "sent", "resend-msg-1"); expect(s.settled && s.status === "sent", JSON.stringify(s));
    const again = await settle(id, c2, "sent", "resend-msg-1"); expect(again.settled && again.reason === "already_settled_same", JSON.stringify(again));
    const c = await claim(id); expect(!c.claimed && c.reason === "already_settled", JSON.stringify(c));
    const r = await row(id); expect(r.provider_message_id === "resend-msg-1" && r.lease_token === null && r.settled_at, "settled row");
  });
  await check("uncertain outcome is held: stays pending, never failed, never reclaimable", async () => {
    const e = await enqueue("evt:uncertain"); const c = await claim(e.delivery_id);
    const s = await settle(e.delivery_id, c, "uncertain"); expect(s.settled && s.held, JSON.stringify(s));
    const r = await row(e.delivery_id); expect(r.status === "pending" && r.outcome_uncertain && r.error_code === "delivery_outcome_uncertain", JSON.stringify(r));
    const again = await claim(e.delivery_id); expect(!again.claimed && again.reason === "held_uncertain", JSON.stringify(again));
  });
  await check("expired lease OUTSIDE idempotency window is held uncertain, not replayed", async () => {
    const e = await enqueue("evt:old"); await claim(e.delivery_id);
    await q("update public.application_email_deliveries set lease_expires_at = now() - interval '1 minute', created_at = now() - interval '2 days' where id=$1", [e.delivery_id]);
    const c = await claim(e.delivery_id); expect(!c.claimed && c.reason === "held_uncertain", JSON.stringify(c));
    const r = await row(e.delivery_id); expect(r.outcome_uncertain && r.error_code === "lease_expired_outside_idempotency_window", JSON.stringify(r));
  });
  await check("retryable failure backs off, then is reclaimable; exhaustion marks failed", async () => {
    const e = await enqueue("evt:retry");
    await q("update public.application_email_deliveries set max_attempts = 2 where id=$1", [e.delivery_id]);
    const a = await claim(e.delivery_id);
    const s = await settle(e.delivery_id, a, "failed_retryable", null, "provider_429");
    expect(s.settled && s.status === "pending" && s.retry_at, JSON.stringify(s));
    const early = await claim(e.delivery_id); expect(!early.claimed && early.reason === "not_due", JSON.stringify(early));
    await q("update public.application_email_deliveries set next_attempt_at = now() - interval '1 second' where id=$1", [e.delivery_id]);
    const b = await claim(e.delivery_id); expect(b.claimed && b.generation === 2 && b.attempt === 2, JSON.stringify(b));
    const f = await settle(e.delivery_id, b, "failed_retryable", null, "provider_429"); expect(f.settled && f.status === "failed", JSON.stringify(f));
    expect((await row(e.delivery_id)).error_code === "provider_429", "error code kept");
  });
  await check("unsafe error text is sanitised to a slug", async () => {
    const e = await enqueue("evt:err"); const c = await claim(e.delivery_id);
    await settle(e.delivery_id, c, "failed_permanent", null, "Bad https://x.example/?token=SECRET Header: v");
    const r = await row(e.delivery_id); expect(r.status === "failed" && r.error_code === "unclassified_error", JSON.stringify(r));
  });
  await check("mid-flight opt-out: claim after unsubscribe skips without a lease", async () => {
    const e = await enqueue("evt:optout", U2);
    await q("update public.notification_preferences set unsubscribed_at = now() where organization_id=$1 and user_id=$2", [ORG, U2]);
    const c = await claim(e.delivery_id); expect(!c.claimed && c.reason === "recipient_not_eligible", JSON.stringify(c));
    const r = await row(e.delivery_id); expect(r.status === "skipped" && r.lease_token === null, JSON.stringify(r));
  });
  await check("weekly digest respects weekly_digest_enabled=false at claim time", async () => {
    const e = await enqueue("evt:digest", U1, ORG, "weekly_digest");
    const c = await claim(e.delivery_id); expect(!c.claimed && c.reason === "recipient_not_eligible", JSON.stringify(c));
  });
  await check("legacy direct-path pending row is never claimed", async () => {
    const r = await one("insert into public.application_email_deliveries (organization_id,user_id,event_key,kind,status) values ($1,$2,'legacy:1','mention','pending') returning id", [ORG, U1]);
    const c = await claim(r.id); expect(!c.claimed && c.reason === "legacy_row_held", JSON.stringify(c));
  });
  await check("legacy direct-path PATCH flow still works (status pending->sent)", async () => {
    const r = await one("insert into public.application_email_deliveries (organization_id,user_id,event_key,kind,status) values ($1,$2,'legacy:2','mention','pending') returning id", [ORG, U1]);
    await q("update public.application_email_deliveries set status='sent', provider_message_id='m', updated_at=now() where id=$1", [r.id]);
  });
  await check("anon and authenticated cannot execute any RPC; service_role can", async () => {
    for (const fn of [
      "public.enqueue_application_email_delivery(uuid,uuid,text,text,integer)",
      "public.claim_application_email_delivery(uuid,uuid,integer,interval)",
      "public.settle_application_email_delivery(uuid,uuid,integer,uuid,text,text,text,integer)",
      "public.email_delivery_safe_error(text)",
    ]) {
      for (const role of ["anon", "authenticated"]) {
        const r = await one(`select has_function_privilege('${role}', '${fn}', 'execute') p`);
        expect(r.p === false, `${role} can execute ${fn}`);
      }
      expect((await one(`select has_function_privilege('service_role', '${fn}', 'execute') p`)).p === true, "service_role lacks " + fn);
    }
  });
  await check("authenticated member still reads only own rows (RLS unchanged)", async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [U2]);
    await db.exec("set role authenticated");
    try {
      const rows = await q("select user_id from public.application_email_deliveries");
      expect(rows.every((r) => r.user_id === U2) && rows.length >= 1, JSON.stringify(rows));
    } finally { await db.exec("reset role"); }
  });
  await check("authenticated cannot write delivery rows directly", async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [U1]);
    await db.exec("set role authenticated");
    let changed = 0;
    try { changed = (await db.query("update public.application_email_deliveries set status='sent' where user_id=$1", [U1])).affectedRows ?? 0; }
    catch { changed = 0; }
    finally { await db.exec("reset role"); }
    expect(changed === 0, "authenticated updated " + changed + " rows");
  });

  for (const [n, r] of results) console.log(r === "PASS" ? "PASS" : "FAIL", "-", n, r === "PASS" ? "" : r);
  const failed = results.filter(([, r]) => r !== "PASS").length;
  console.log(`chat06 email claim/settle probe: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exitCode = 1;
}
