import { writeFileSync } from "node:fs";
export default async function dumpPolicies(db) {
  const pol = await db.query(`select schemaname, tablename, policyname, cmd, roles::text as roles, coalesce(qual,'') as qual, coalesce(with_check,'') as with_check from pg_policies where schemaname='public' order by 2,3`);
  const rls = await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1`);
  const fns = await db.query(`select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef order by 1`);
  writeFileSync("local-policies.json", JSON.stringify({ policies: pol.rows, rls: rls.rows, secdef: fns.rows }, null, 1));
  console.log("local policies", pol.rows.length, "tables", rls.rows.length, "rls on", rls.rows.filter(r=>r.relrowsecurity).length, "secdef fns", fns.rows.length);
}
