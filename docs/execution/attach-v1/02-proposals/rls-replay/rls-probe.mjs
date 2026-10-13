// Chat02 RLS probe: executed against the locally replayed repo migrations
// (whose 215 policies were verified identical to production's pg_policies).
import { writeFileSync } from "node:fs";

const A = "aaaaaaaa-0000-4000-8000-00000000000a", B = "bbbbbbbb-0000-4000-8000-00000000000b";
const A1 = "a1a1a1a1-0000-4000-8000-0000000000a1", A2 = "a2a2a2a2-0000-4000-8000-0000000000a2", B1 = "b1b1b1b1-0000-4000-8000-0000000000b1";
const CA = "ca000000-0000-4000-8000-00000000000a", CB = "cb000000-0000-4000-8000-00000000000b";
const U = { aOwner: "11111111-0000-4000-8000-000000000001", aAnalyst: "11111111-0000-4000-8000-000000000002", aViewer: "11111111-0000-4000-8000-000000000003", bOwner: "22222222-0000-4000-8000-000000000001", outsider: "55555555-0000-4000-8000-000000000001" };
const PA1 = "9a100000-0000-4000-8000-0000000000a1", PA2 = "9a200000-0000-4000-8000-0000000000a2", PB1 = "9b100000-0000-4000-8000-0000000000b1";
const RA = "7a000000-0000-4000-8000-00000000000a", RB = "7b000000-0000-4000-8000-00000000000b";

export default async function rlsProbe(db) {
  const results = [];
  const q = (sql, p) => db.query(sql, p);
  const asUser = async (uid, role = "authenticated") => {
    await q("reset role");
    await q("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [uid || "", role]);
    await q(`set role ${role}`);
  };
  const t = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, error: e.message }); }
    finally { await q("reset role"); }
  };
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); };
  const rejects = async (sql, p, m) => { let threw = false; try { await q(sql, p); } catch { threw = true; } if (!threw) throw new Error(`expected rejection: ${m}`); };
  const affected = async (sql, p) => (await q(sql, p)).affectedRows ?? 0;

  // ---- seed as superuser (bypasses RLS)
  await q("reset role");
  for (const [k, id] of Object.entries(U)) await q("insert into auth.users(id,email) values ($1,$2)", [id, `${k}@example.test`]);
  await q("insert into organizations(id,name,slug) values ($1,'Org A','org-a'),($2,'Org B','org-b')", [A, B]);
  await q("insert into organization_members(organization_id,user_id,role) values ($1,$2,'owner'),($1,$3,'analyst'),($1,$4,'viewer'),($5,$6,'owner')", [A, U.aOwner, U.aAnalyst, U.aViewer, B, U.bOwner]);
  await q("insert into projects(id,organization_id,name,slug,client_brand,status) values ($1,$2,'A1','a1','A1','active'),($3,$2,'A2','a2','A2','active'),($4,$5,'B1','b1','B1','active')", [A1, A, A2, B1, B]);
  await q("insert into categories(id,organization_id,name) values ($1,$2,'cat a'),($3,$4,'cat b')", [CA, A, CB, B]);
  await q("insert into prompts(id,organization_id,category_id,project_id,prompt_key,prompt_text) values ($1,$2,$3,$4,'k-a1','A1 question'),($5,$2,$3,$6,'k-a2','A2 question'),($7,$8,$9,$10,'k-b1','B1 question')", [PA1, A, CA, A1, PA2, A2, PB1, B, CB, B1]);
  await q("insert into runs(id,organization_id,category_id,project_id) values ($1,$2,$3,$4),($5,$6,$7,$8)", [RA, A, CA, A1, RB, B, CB, B1]);
  await q("insert into invitations(organization_id,email,token_hash,expires_at) values ($1,'x@a.test',repeat('a',64),now()+interval '1 day'),($2,'x@b.test',repeat('b',64),now()+interval '1 day')", [A, B]);
  await q("insert into billing_accounts(organization_id) values ($1),($2)", [A, B]);
  await q("insert into account_deletion_requests(organization_id,requested_by,scheduled_for) values ($1,$2,now()+interval '7 days'),($3,$4,now()+interval '7 days')", [A, U.aOwner, B, U.bOwner]);
  await q("insert into audit_logs(organization_id,action,entity_type) values ($1,'x','y'),($2,'x','y')", [A, B]);

  const tenantTables = ["organization_members", "projects", "categories", "prompts", "runs", "invitations", "billing_accounts", "account_deletion_requests", "audit_logs"];

  await t("A owner reads no Org B rows in any seeded tenant table", async () => {
    await asUser(U.aOwner);
    for (const table of tenantTables) eq((await q(`select count(*)::int n from ${table} where organization_id=$1`, [B])).rows[0].n, 0, table);
    eq((await q("select count(*)::int n from organizations where id=$1", [B])).rows[0].n, 0, "organizations");
    eq((await q("select count(*)::int n from projects")).rows[0].n, 2, "sees exactly own two projects");
  });
  await t("A owner cannot update or delete Org B rows (0 affected)", async () => {
    await asUser(U.aOwner);
    eq(await affected("update projects set name='pwned' where organization_id=$1", [B]), 0, "projects update");
    eq(await affected("update prompts set prompt_text='pwned' where id=$1", [PB1]), 0, "prompts update");
    eq(await affected("update runs set status='cancelled' where id=$1", [RB]), 0, "runs update");
    eq(await affected("update organizations set name='pwned' where id=$1", [B]), 0, "org update");
    eq(await affected("delete from categories where organization_id=$1", [B]), 0, "categories delete");
    eq(await affected("delete from organization_members where organization_id=$1", [B]), 0, "members delete");
    await q("reset role");
    eq((await q("select name from projects where id=$1", [B1])).rows[0].name, "B1", "B1 untouched");
    eq((await q("select count(*)::int n from organization_members where organization_id=$1", [B])).rows[0].n, 1, "B membership untouched");
  });
  await t("A owner cannot insert into Org B or self-join Org B", async () => {
    await asUser(U.aOwner);
    await rejects("insert into projects(organization_id,name,slug,client_brand) values ($1,'x','x','x')", [B], "project in B");
    await rejects("insert into categories(organization_id,name) values ($1,'x')", [B], "category in B");
    await rejects("insert into organization_members(organization_id,user_id,role) values ($1,$2,'owner')", [B, U.aOwner], "self-join B as owner");
    await rejects("insert into invitations(organization_id,email,token_hash,expires_at) values ($1,'evil@x.test',repeat('c',64),now()+interval '1 day')", [B], "invite into B");
    await rejects("insert into audit_logs(organization_id,action,entity_type) values ($1,'forged','x')", [B], "forged B audit");
  });
  await t("A owner cannot move an A row into Org B", async () => {
    await asUser(U.aOwner);
    await rejects("update projects set organization_id=$1 where id=$2", [B, A1], "move project");
    await rejects("update prompts set organization_id=$1 where id=$2", [B, PA1], "move prompt");
  });
  await t("Viewer cannot write; analyst cannot manage members or invitations or self-escalate", async () => {
    await asUser(U.aViewer);
    eq(await affected("update projects set name='v' where id=$1", [A1]), 0, "viewer project update");
    await rejects("insert into categories(organization_id,name) values ($1,'v')", [A], "viewer category insert");
    await asUser(U.aAnalyst);
    eq(await affected("update organization_members set role='owner' where user_id=$1", [U.aAnalyst]), 0, "analyst self-escalation");
    eq(await affected("update organization_members set role='viewer' where user_id=$1", [U.aOwner]), 0, "analyst demotes owner");
    await rejects("insert into invitations(organization_id,email,token_hash,expires_at) values ($1,'e@x.test',repeat('d',64),now()+interval '1 day')", [A], "analyst invites");
    eq((await q("select count(*)::int n from invitations")).rows[0].n, 0, "analyst cannot read invitation token hashes");
    eq((await q("select count(*)::int n from account_deletion_requests")).rows[0].n, 0, "analyst cannot read deletion requests");
    await q("reset role");
    eq((await q("select role::text from organization_members where user_id=$1", [U.aAnalyst])).rows[0].role, "analyst", "no escalation persisted");
  });
  await t("Anonymous and non-member identities see nothing", async () => {
    // Production grants anon no SELECT on public tables (verified read-only);
    // the local shim over-grants, so a permission error OR zero rows is a denial.
    for (const table of tenantTables) {
      await asUser("", "anon");
      try { eq((await q(`select count(*)::int n from ${table}`)).rows[0].n, 0, `anon ${table}`); }
      catch (e) { if (!/permission denied/.test(e.message)) throw e; }
    }
    await asUser(U.outsider);
    for (const table of tenantTables) eq((await q(`select count(*)::int n from ${table}`)).rows[0].n, 0, `outsider ${table}`);
  });
  await t("Revoked membership loses all reads immediately", async () => {
    await q("delete from organization_members where user_id=$1", [U.aViewer]);
    await asUser(U.aViewer);
    for (const table of tenantTables) eq((await q(`select count(*)::int n from ${table}`)).rows[0].n, 0, `revoked ${table}`);
  });
  await t("RPC update_prompt_versioned: cross-org denied", async () => {
    await asUser(U.aAnalyst);
    await rejects("select public.update_prompt_versioned($1,$2,'pwned',null,'x')", [PB1, A], "B prompt with A org id");
    await rejects("select public.update_prompt_versioned($1,$2,'pwned',null,'x')", [PB1, B], "B prompt with B org id");
    await q("reset role");
    eq((await q("select prompt_text from prompts where id=$1", [PB1])).rows[0].prompt_text, "B1 question", "B prompt untouched");
  });
  // Documents (does not endorse) the A11 finding: no project predicate.
  await t("FINDING A11: RPC update_prompt_versioned lets an org analyst edit a sibling-project prompt", async () => {
    await asUser(U.aAnalyst);
    const before = (await q("select prompt_text from prompts where id=$1", [PA2])).rows[0].prompt_text;
    await q("select public.update_prompt_versioned($1,$2,'edited from any project context',null,'x')", [PA2, A]);
    await q("reset role");
    const after = (await q("select prompt_text from prompts where id=$1", [PA2])).rows[0].prompt_text;
    if (before === after) throw new Error("sibling-project edit did not happen; finding not reproduced");
  });
  await t("SECURITY DEFINER functions are not executable by anon", async () => {
    await q("reset role");
    // Trigger functions cannot be invoked directly; the local shim's default
    // privileges also over-grant compared with production (checked read-only).
    const rows = (await q(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and pg_get_function_result(p.oid) <> 'trigger' and has_function_privilege('anon', p.oid, 'execute')`)).rows;
    eq(rows.map((r) => r.proname), [], "anon-executable SECURITY DEFINER functions");
  });

  const authCallable = (await q(`select p.proname, pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and pg_get_function_result(p.oid) <> 'trigger' and has_function_privilege('authenticated', p.oid, 'execute') order by 1`)).rows;
  writeFileSync("rls-probe-result.json", JSON.stringify({ results, authenticatedCallableSecurityDefiner: authCallable }, null, 2));
  for (const r of results) console.log(r.ok ? "ok  " : "FAIL", r.name, r.error ? `:: ${r.error}` : "");
  console.log("authenticated-callable SECURITY DEFINER (local):", authCallable.map((r) => `${r.proname}(${r.args})`).join("; "));
  console.log(`# pass ${results.filter((r) => r.ok).length} fail ${results.filter((r) => !r.ok).length}`);
}
