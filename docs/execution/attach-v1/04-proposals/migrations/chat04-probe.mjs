// Chat04 probe for 04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql
// Runs AFTER replay.mjs applied every repo migration on disposable PGlite. Never production.
import { readFileSync, writeFileSync } from "node:fs";

const PROPOSAL = process.env.CHAT04_PROPOSAL;
const A = "aaaaaaaa-0000-4000-8000-00000000000a", B = "bbbbbbbb-0000-4000-8000-00000000000b";
const A1 = "a1a1a1a1-0000-4000-8000-0000000000a1", A2 = "a2a2a2a2-0000-4000-8000-0000000000a2", B1 = "b1b1b1b1-0000-4000-8000-0000000000b1";
const CA = "ca000000-0000-4000-8000-00000000000a", CB = "cb000000-0000-4000-8000-00000000000b";
const U = { aOwner: "11111111-0000-4000-8000-000000000001", aAnalyst: "11111111-0000-4000-8000-000000000002", aViewer: "11111111-0000-4000-8000-000000000003", bOwner: "22222222-0000-4000-8000-000000000001", outsider: "55555555-0000-4000-8000-000000000001" };
const PA1 = "9a100000-0000-4000-8000-0000000000a1", PA2 = "9a200000-0000-4000-8000-0000000000a2", PB1 = "9b100000-0000-4000-8000-0000000000b1";
const RA = "7a000000-0000-4000-8000-00000000000a", RA2 = "7a200000-0000-4000-8000-0000000000a2", RB = "7b000000-0000-4000-8000-00000000000b";
const KEY = (s) => `savekey-${s}-0123456789abcdef`;

export default async function chat04Probe(db) {
  const results = [];
  const q = (sql, p) => db.query(sql, p);
  const asUser = async (uid, role = "authenticated") => {
    await q("reset role");
    await q("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [uid || "", role]);
    await q(`set role ${role}`);
  };
  const asService = async () => { await q("reset role"); await q("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false)"); };
  const t = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, error: e.message }); }
    finally { await q("reset role"); await q("select set_config('request.jwt.claim.sub', '', false)"); }
  };
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); };
  const rejects = async (sql, p, pattern, m) => {
    let err = null;
    try { await q(sql, p); } catch (e) { err = e; }
    if (!err) throw new Error(`expected rejection: ${m}`);
    const text = `${err.code || ""} ${err.message}`;
    if (pattern && !pattern.test(text)) throw new Error(`${m}: wrong error ${text}`);
  };
  const save = "select public.save_record_decision($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,null,$12) r";
  const saveArgs = (o) => [o.org ?? A, o.project ?? A1, o.run ?? RA, o.key, o.kind ?? "no_action", o.state ?? "DO_NOT_DO", o.rationale ?? "Evidence insufficient for a company change.", o.ownerId ?? null, o.ownerRole ?? null, o.action ?? null, o.due ?? null, o.approve ?? false];
  const epoch = async (project) => (await q("select version from project_question_set_versions where project_id=$1", [project])).rows[0]?.version ?? null;

  // ---- seed BEFORE the proposal (historical data)
  await q("reset role");
  for (const [k, id] of Object.entries(U)) await q("insert into auth.users(id,email) values ($1,$2)", [id, `${k}@example.test`]);
  await q("insert into organizations(id,name,slug) values ($1,'Org A','org-a'),($2,'Org B','org-b')", [A, B]);
  await q("insert into organization_members(organization_id,user_id,role) values ($1,$2,'owner'),($1,$3,'analyst'),($1,$4,'viewer'),($5,$6,'owner')", [A, U.aOwner, U.aAnalyst, U.aViewer, B, U.bOwner]);
  await q("insert into projects(id,organization_id,name,slug,client_brand,status) values ($1,$2,'A1','a1','A1','active'),($3,$2,'A2','a2','A2','active'),($4,$5,'B1','b1','B1','active')", [A1, A, A2, B1, B]);
  await q("insert into categories(id,organization_id,name) values ($1,$2,'cat a'),($3,$4,'cat b')", [CA, A, CB, B]);
  await q("insert into prompts(id,organization_id,category_id,project_id,prompt_key,prompt_text) values ($1,$2,$3,$4,'k-a1','A1 question'),($5,$2,$3,$6,'k-a2','A2 question'),($7,$8,$9,$10,'k-b1','B1 question')", [PA1, A, CA, A1, PA2, A2, PB1, B, CB, B1]);
  await q("insert into runs(id,organization_id,category_id,project_id,status) values ($1,$2,$3,$4,'complete'),($5,$2,$3,$6,'complete'),($7,$8,$9,$10,'complete')", [RA, A, CA, A1, RA2, A2, RB, B, CB, B1]);

  // ---- apply the proposal on top of populated data
  await q("reset role");
  await db.exec(readFileSync(PROPOSAL, "utf8"));
  results.push({ name: "proposal applies on top of all repo migrations with existing rows", ok: true });

  await t("backfill: every project gets epoch 1; historical runs stay NULL (unknown), nothing inferred", async () => {
    eq(await epoch(A1), 1, "A1 epoch"); eq(await epoch(B1), 1, "B1 epoch");
    eq((await q("select question_set_version v, cycle_origin o from runs where id=$1", [RA])).rows[0], { v: null, o: null }, "historical run");
  });

  let runA1v1, runA1v2;
  await t("member-created run is stamped with the current epoch and customer_cycle; client value ignored", async () => {
    await asUser(U.aAnalyst);
    runA1v1 = (await q("insert into runs(organization_id,category_id,project_id,status,question_set_version) values ($1,$2,$3,'queued',999) returning id, question_set_version v, cycle_origin o", [A, CA, A1])).rows[0];
    eq([runA1v1.v, runA1v1.o], [1, "customer_cycle"], "stamped");
  });
  await t("service-role run without explicit origin stays unknown; explicit fixture is kept", async () => {
    await asService();
    const r1 = (await q("insert into runs(organization_id,category_id,project_id,status) values ($1,$2,$3,'queued') returning cycle_origin o", [A, CA, A1])).rows[0];
    const r2 = (await q("insert into runs(organization_id,category_id,project_id,status,cycle_origin) values ($1,$2,$3,'queued','fixture') returning cycle_origin o", [A, CA, A1])).rows[0];
    eq([r1.o, r2.o], [null, "fixture"], "origins");
  });
  await t("question-set epoch: reword/retire/add bump; inactive-only edits and no-op updates do not; sibling project untouched", async () => {
    await asUser(U.aAnalyst);
    await q("update prompts set prompt_text='A1 question reworded' where id=$1", [PA1]);
    await q("reset role");
    eq(await epoch(A1), 2, "reword bumps");
    eq(await epoch(A2), 1, "sibling project unchanged");
    await q("update prompts set updated_at=now() where id=$1", [PA1]);
    eq(await epoch(A1), 2, "no-op does not bump");
    await q("insert into prompts(organization_id,category_id,project_id,prompt_key,prompt_text,active) values ($1,$2,$3,'k-a1-off','Inactive draft question',false)", [A, CA, A1]);
    eq(await epoch(A1), 2, "inactive insert does not bump");
    await q("update prompts set prompt_text='Inactive draft question v2' where prompt_key='k-a1-off'");
    eq(await epoch(A1), 2, "inactive edit does not bump");
    await q("update prompts set active=true where prompt_key='k-a1-off'");
    eq(await epoch(A1), 3, "activation bumps");
    await asUser(U.aAnalyst);
    runA1v2 = (await q("insert into runs(organization_id,category_id,project_id,status) values ($1,$2,$3,'queued') returning id, question_set_version v", [A, CA, A1])).rows[0];
    eq(runA1v2.v, 3, "new run uses new epoch");
  });
  await t("run cycle identity is immutable (analyst has runs write policy, still cannot rewrite)", async () => {
    await asUser(U.aAnalyst);
    await rejects("update runs set question_set_version=1 where id=$1", [runA1v2.id], /immutable/, "rewrite epoch");
    await rejects("update runs set cycle_origin='fixture' where id=$1", [runA1v1.id], /immutable/, "rewrite origin");
    await q("update runs set status='running' where id=$1", [runA1v1.id]);
  });
  await t("project epoch table is read-only to members and invisible across orgs", async () => {
    await asUser(U.aAnalyst);
    await rejects("update project_question_set_versions set version=1 where project_id=$1", [A1], /permission/, "member write");
    await asUser(U.bOwner);
    eq((await q("select count(*)::int n from project_question_set_versions where organization_id=$1", [A])).rows[0].n, 0, "B sees A epochs");
  });
  await t("answer observation method/sampling derive only from raw_json; direct edits cannot drift; missing stays NULL", async () => {
    await asService();
    const withRaw = (await q(`insert into run_answers(run_id,organization_id,prompt_id,prompt_key,provider,model,answer_text,raw_json,observation_method,collected_at)
      values ($1,$2,$3,'k-a1','cloudflare','m1','answer',$4,'forged',now()) returning id, observation_method m, sampling_json s`,
      [RA, A, PA1, JSON.stringify({ observationMethod: "api_hosted_model_with_independent_retrieval", sampling: { temperature: 0.1, samples: 1 } })])).rows[0];
    eq([withRaw.m, withRaw.s], ["api_hosted_model_with_independent_retrieval", { samples: 1, temperature: 0.1 }], "derived");
    const bare = (await q("insert into run_answers(run_id,organization_id,prompt_id,prompt_key,provider,model,answer_text,raw_json,collected_at) values ($1,$2,$3,'k-a1','other','m1','answer',$4,now()) returning observation_method m, sampling_json s", [RA, A, PA1, JSON.stringify({ sampling: "0.2" })])).rows[0];
    eq([bare.m, bare.s], [null, null], "unavailable stays null (non-object sampling ignored)");
    const pinned = (await q("update run_answers set observation_method='forged', review_status='verified' where id=$1 returning observation_method m", [withRaw.id])).rows[0];
    eq(pinned.m, "api_hosted_model_with_independent_retrieval", "direct edit pinned");
    const rederived = (await q("update run_answers set raw_json='{\"observationMethod\":\"provider_api\"}' where id=$1 returning observation_method m, sampling_json s", [withRaw.id])).rows[0];
    eq([rederived.m, rederived.s], ["provider_api", null], "re-derived from new raw");
    const ctx = (await q("select measurement_context_json->>'locale' l from run_answers where id=$1", [withRaw.id])).rows[0];
    eq(typeof ctx.l, "string", "existing nine-field stamp still runs alongside");
  });

  let noActionId;
  await t("save_record_decision: analyst saves explicit no-action; same-key replay returns the same row (lost ACK)", async () => {
    await asUser(U.aAnalyst);
    const first = (await q(save, saveArgs({ key: KEY("noaction") }))).rows[0].r;
    const replay = (await q(save, saveArgs({ key: KEY("noaction") }))).rows[0].r;
    eq([first.outcome, replay.outcome, replay.id === first.id], ["created", "existing", true], "idempotent");
    noActionId = first.id;
    await q("reset role");
    const row = (await q("select decided_by, owner_id, owner_role, due_date, approved_by from record_decisions where id=$1", [first.id])).rows[0];
    eq(row, { decided_by: U.aAnalyst, owner_id: null, owner_role: null, due_date: null, approved_by: null }, "actor from auth.uid, no fabricated owner");
    eq((await q("select count(*)::int n from record_decisions")).rows[0].n, 1, "no duplicate");
  });
  await t("same save key for a different Record is a conflict (PT409), not an overwrite", async () => {
    await asUser(U.aAnalyst);
    await rejects(save, saveArgs({ key: KEY("noaction"), run: runA1v1.id }), /PT409|different decision/, "key reuse");
  });
  await t("tenant/project/role denials: viewer, other org ids, sibling project, other-org project, outsider", async () => {
    await asUser(U.aViewer);
    await rejects(save, saveArgs({ key: KEY("viewer") }), /PT403/, "viewer");
    await asUser(U.aAnalyst);
    await rejects(save, saveArgs({ key: KEY("xorg"), org: B, project: B1, run: RB }), /PT403/, "A analyst into Org B");
    await rejects(save, saveArgs({ key: KEY("xorgproj"), project: B1, run: RB }), /PT404/, "Org A id with Org B project");
    await rejects(save, saveArgs({ key: KEY("sibling"), project: A2, run: RA }), /PT404/, "A1 Record via sibling project A2");
    await rejects(save, saveArgs({ key: KEY("unreviewed"), run: runA1v2.id }), /PT404/, "queued run is not a reviewed Record");
    await asUser(U.outsider);
    await rejects(save, saveArgs({ key: KEY("outsider") }), /PT403/, "outsider");
    await asUser("", "anon");
    await rejects(save, saveArgs({ key: KEY("anon") }), /permission|PT401/, "anon");
  });
  await t("no-action/disagreement cannot carry an owner; analyst cannot approve; bad save key rejected", async () => {
    await asUser(U.aAnalyst);
    await rejects(save, saveArgs({ key: KEY("fakeowner"), ownerRole: "Marketing lead" }), /no_fabricated_owner/, "owner on no-action");
    await rejects(save, saveArgs({ key: KEY("disowner"), kind: "reviewer_disagreement", state: "MONITOR_ONLY", action: "do it" }), /no_fabricated_owner/, "action on disagreement");
    await rejects(save, saveArgs({ key: KEY("analystapprove"), kind: "change_specification", state: "DO_NOW", approve: true }), /PT403/, "analyst approve");
    await rejects(save, saveArgs({ key: "short" }), /save_key/, "short key");
    await rejects(save, saveArgs({ key: KEY("nastate"), state: "DO_NOW" }), /no_action_state/, "no-action with DO_NOW");
  });
  let csId;
  await t("Change Specification decision: saved incomplete, approval requires owner+action+date, then immutable", async () => {
    await asUser(U.aAnalyst);
    csId = (await q(save, saveArgs({ key: KEY("cs"), kind: "change_specification", state: "DO_NOW", rationale: "Comparison page lacks verified pricing evidence." }))).rows[0].r.id;
    await asUser(U.aOwner);
    const complete = "select public.complete_record_decision_action($1,$2,$3,$4,$5,$6,$7,$8) r";
    await rejects(complete, [csId, A, A1, null, "Marketing lead", "Publish verified pricing table", null, true], /approved_action_complete/, "approve without due date");
    await rejects(complete, [csId, A, A1, U.bOwner, null, "x action", "2026-11-01", false], /PT400|member/, "owner from other org");
    await rejects(complete, [csId, A, A2, null, "Marketing lead", "Publish verified pricing table", "2026-11-01", true], /PT404/, "via sibling project");
    await asUser(U.aAnalyst);
    await rejects(complete, [csId, A, A1, U.aOwner, null, "Publish verified pricing table", "2026-11-01", true], /PT403/, "analyst approves");
    await q(complete, [csId, A, A1, U.aOwner, null, "Publish verified pricing table", "2026-11-01", false]);
    await asUser(U.aOwner);
    const done = (await q(complete, [csId, A, A1, U.aOwner, null, "Publish verified pricing table", "2026-11-01", true])).rows[0].r;
    eq(done.approved, true, "approved");
    await rejects(complete, [csId, A, A1, null, "Other", "Changed later", "2026-12-01", false], /PT409|immutable/, "approved is immutable");
    await rejects(complete, [noActionId, A, A1, null, "Owner", "Action text", "2026-11-01", false], /PT400/, "no-action takes no owner");
    await q("reset role");
    const row = (await q("select approved_by, owner_id, due_date::text d from record_decisions where id=$1", [csId])).rows[0];
    eq(row, { approved_by: U.aOwner, owner_id: U.aOwner, d: "2026-11-01" }, "persisted");
  });
  await t("direct table writes are denied to members; reads are org-scoped", async () => {
    await asUser(U.aOwner);
    await rejects("insert into record_decisions(organization_id,project_id,baseline_run_id,save_key,decision_kind,decision_state,rationale,decided_by) values ($1,$2,$3,$4,'no_action','DO_NOT_DO','direct write',$5)", [A, A1, RA, KEY("direct"), U.aOwner], /permission/, "direct insert");
    await rejects("update record_decisions set rationale='rewritten' where id=$1", [noActionId], /permission/, "direct update");
    await rejects("delete from record_decisions where id=$1", [noActionId], /permission/, "direct delete");
    eq((await q("select count(*)::int n from record_decisions")).rows[0].n, 2, "A owner sees A decisions");
    await asUser(U.bOwner);
    eq((await q("select count(*)::int n from record_decisions")).rows[0].n, 0, "B owner sees none of A's decisions");
  });
  await t("service role cannot rewrite a saved decision body either (trigger)", async () => {
    await asService();
    await rejects("update record_decisions set rationale='rewritten by worker' where id=$1", [noActionId], /immutable/, "service body rewrite");
  });
  await t("RPC execute grants: authenticated + service_role only", async () => {
    const fns = ["public.save_record_decision(uuid,uuid,uuid,text,text,text,text,uuid,text,text,date,uuid,boolean)", "public.complete_record_decision_action(uuid,uuid,uuid,uuid,text,text,date,boolean)"];
    for (const fn of fns) {
      eq((await q("select has_function_privilege('anon',$1,'execute') a", [fn])).rows[0].a, false, `anon ${fn}`);
      eq((await q("select has_function_privilege('authenticated',$1,'execute') a", [fn])).rows[0].a, true, `authenticated ${fn}`);
    }
    for (const fn of ["private.bump_project_question_set_version()", "private.stamp_run_cycle_identity()", "private.stamp_run_answer_observation_identity()", "private.guard_record_decision()"]) {
      eq((await q("select has_function_privilege('authenticated',$1,'execute') a", [fn])).rows[0].a, false, `authenticated ${fn}`);
    }
  });
  await t("org deletion cascades decisions and epochs (deletion graph not blocked)", async () => {
    await q("reset role");
    await q("delete from organizations where id=$1", [A]);
    eq((await q("select count(*)::int n from record_decisions")).rows[0].n, 0, "decisions gone");
    eq((await q("select count(*)::int n from project_question_set_versions where organization_id=$1", [A])).rows[0].n, 0, "epochs gone");
  });

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(r.ok ? "ok  " : "FAIL", r.name, r.ok ? "" : `:: ${r.error}`);
  console.log(`chat04 probe ${results.length - failed.length}/${results.length}`);
  writeFileSync(process.env.CHAT04_PROBE_OUT || "chat04-probe-result.json", JSON.stringify(results, null, 2));
  if (failed.length) process.exitCode = 1;
}
