// Chat02 scratch: replay repo migrations into PGlite (local Postgres in WASM)
// with a minimal Supabase auth shim, then run two-tenant RLS probes.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const repo = process.argv[2];
const dir = `${repo}/supabase/migrations`;
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
create extension if not exists pgcrypto;
create schema if not exists extensions;
create or replace function extensions.digest(data text, type text) returns bytea language sql immutable as $$ select public.digest(data, type) $$;
create or replace function extensions.digest(data bytea, type text) returns bytea language sql immutable as $$ select public.digest(data, type) $$;
create role anon nologin; create role supabase_auth_admin nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const results = [];
for (const file of files) {
  let sql = readFileSync(`${dir}/${file}`, "utf8").replace(/create extension if not exists pgcrypto[^;]*;/gi, "");
  try {
    await db.exec(sql);
    results.push({ file, ok: true });
  } catch (error) {
    results.push({ file, ok: false, error: String(error.message).slice(0, 300) });
    try { await db.exec("rollback"); } catch {}
  }
}
const failed = results.filter((r) => !r.ok);
console.log(`migrations applied ${results.length - failed.length}/${results.length}`);
for (const f of failed) console.log("FAILED", f.file, "::", f.error);
writeFileSync("replay-result.json", JSON.stringify(results, null, 2));
if (process.argv[3]) { const probe = await import(process.argv[3]); await probe.default(db); }
