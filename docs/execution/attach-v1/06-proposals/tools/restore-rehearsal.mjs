#!/usr/bin/env node
// Chat06 (A05 / CV-12): LOCAL, DISPOSABLE backup -> restore -> rollback rehearsal.
//
// Runs entirely in-process on PGlite (Postgres compiled to WASM). It never
// connects to Supabase or any network database. PGlite is deliberately NOT a
// repository dependency (no unreviewed runtime additions): run it from a
// scratch directory that has `@electric-sql/pglite` installed:
//
//   mkdir /tmp/fm06-restore && cd /tmp/fm06-restore && npm i @electric-sql/pglite@0.5.9
//   node <repo>/docs/execution/attach-v1/06-proposals/tools/restore-rehearsal.mjs <repo> [prod-catalog.json] > receipt.json
//
// Steps:
//  1. replay every repository migration (sorted) into a fresh database with a
//     minimal Supabase auth/role shim; record per-file success;
//  2. fingerprint the public catalog (catalog-fingerprint.sql);
//  3. seed a synthetic two-organization customer loop through the real schema
//     (org -> member -> project -> category -> question -> run -> answer ->
//     review) and digest every seeded table;
//  4. take a PHYSICAL backup (data-directory tarball) and record its sha256;
//  5. restore into a NEW instance, prove catalog + data digests are identical,
//     then continue the customer loop on the restored copy (second run);
//  6. ROLLBACK rehearsal: apply a throwaway forward change, then restore the
//     pre-change backup and prove the catalog returned to the pre-change hash;
//  7. optionally diff the local catalog against a production fingerprint
//     exported read-only with the same SQL.
//
// Limits (stated in the receipt): PGlite is not Supabase (no auth service,
// storage, realtime, pg_cron, Vault, or real roles/grants defaults); a
// physical PGlite tarball is not a Supabase/WAL-G backup; synthetic data is not
// production data. This proves procedure and repository replayability only.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repo = resolve(process.argv[2] || ".");
const prodCatalogPath = process.argv[3] ? resolve(process.argv[3]) : null;
const localRequire = createRequire(join(process.cwd(), "noop.js"));
const pgliteEntry = localRequire.resolve("@electric-sql/pglite");
const { PGlite } = await import(pathToFileURL(pgliteEntry).href);
const { pgcrypto } = await import(pathToFileURL(localRequire.resolve("@electric-sql/pglite/contrib/pgcrypto")).href);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fingerprintSql = readFileSync(new URL("./catalog-fingerprint.sql", import.meta.url), "utf8");

const SHIM = `
create extension if not exists pgcrypto;
create schema if not exists extensions;
create or replace function extensions.digest(data text, type text) returns bytea language sql immutable as $$ select public.digest(data, type) $$;
create or replace function extensions.digest(data bytea, type text) returns bytea language sql immutable as $$ select public.digest(data, type) $$;
create or replace function extensions.gen_random_bytes(integer) returns bytea language sql volatile as $$ select public.gen_random_bytes($1) $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
`;

async function fingerprint(db) {
  const { rows } = await db.query(fingerprintSql);
  const items = rows.map((row) => `${row.kind}\t${row.key}\t${row.def_md5}`);
  const byKind = {};
  for (const row of rows) byKind[row.kind] = (byKind[row.kind] || 0) + 1;
  return { hash: sha256(items.join("\n")), counts: byKind, rows };
}

async function replay(db) {
  const dir = join(repo, "supabase/migrations");
  const files = readdirSync(dir).filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const results = [];
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8").replace(/create extension if not exists (?:"?pgcrypto"?)[^;]*;/gi, "");
    try {
      await db.exec(sql);
      results.push({ file, ok: true });
    } catch (error) {
      results.push({ file, ok: false, error: String(error.message).slice(0, 240) });
      try { await db.exec("rollback"); } catch { /* not in a transaction */ }
    }
  }
  return results;
}

const ID = {
  orgA: "0a000000-0000-4000-8000-00000000000a", orgB: "0b000000-0000-4000-8000-00000000000b",
  userA: "1a000000-0000-4000-8000-00000000000a", userB: "1b000000-0000-4000-8000-00000000000b",
  projA: "2a000000-0000-4000-8000-00000000000a", projB: "2b000000-0000-4000-8000-00000000000b",
  catA: "3a000000-0000-4000-8000-00000000000a", catB: "3b000000-0000-4000-8000-00000000000b",
  promptA: "4a000000-0000-4000-8000-00000000000a", promptB: "4b000000-0000-4000-8000-00000000000b",
  runA: "5a000000-0000-4000-8000-00000000000a", runB: "5b000000-0000-4000-8000-00000000000b",
  runA2: "5a000000-0000-4000-8000-0000000000a2",
};
const SEEDED_TABLES = ["organizations", "organization_members", "projects", "categories", "prompts", "runs", "run_prompt_selections", "run_answers"];

async function tryStep(log, name, fn) {
  try { await fn(); log.push({ step: name, ok: true }); return true; } catch (error) {
    log.push({ step: name, ok: false, error: String(error.message).slice(0, 240) });
    return false;
  }
}

async function seedCustomerLoop(db, log) {
  for (const side of ["A", "B"]) {
    const org = ID[`org${side}`], user = ID[`user${side}`], proj = ID[`proj${side}`], cat = ID[`cat${side}`];
    const prompt = ID[`prompt${side}`], run = ID[`run${side}`];
    await tryStep(log, `auth.user ${side}`, () => db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [user, `owner-${side.toLowerCase()}@example.invalid`]));
    await tryStep(log, `organization ${side}`, () => db.query("insert into public.organizations (id, name, slug) values ($1, $2, $3)", [org, `Synthetic Org ${side}`, `synthetic-org-${side.toLowerCase()}`]));
    await tryStep(log, `owner membership ${side}`, () => db.query("insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'owner')", [org, user]));
    await tryStep(log, `project ${side}`, () => db.query("insert into public.projects (id, organization_id, name, slug, client_brand, status) values ($1, $2, $3, $4, $5, 'active')", [proj, org, `Synthetic Project ${side}`, `synthetic-project-${side.toLowerCase()}`, `Brand${side}`]));
    await tryStep(log, `category ${side}`, () => db.query("insert into public.categories (id, organization_id, name) values ($1, $2, $3)", [cat, org, `Category ${side}`]));
    await tryStep(log, `approved question ${side}`, () => db.query("insert into public.prompts (id, organization_id, project_id, category_id, prompt_key, prompt_text, locale) values ($1, $2, $3, $4, $5, $6, 'en-US')", [prompt, org, proj, cat, `q-${side.toLowerCase()}`, `Which tool should a synthetic buyer ${side} choose?`]));
    await tryStep(log, `queued run ${side}`, () => db.query("insert into public.runs (id, organization_id, project_id, category_id, status, provider_ids, prompt_count, created_by) values ($1, $2, $3, $4, 'queued', array['groq'], 1, $5)", [run, org, proj, cat, user]));
    await tryStep(log, `prompt snapshot ${side}`, () => db.query("insert into public.run_prompt_selections (organization_id, run_id, prompt_id, prompt_key, prompt_text, locale) values ($1, $2, $3, $4, $5, 'en-US')", [org, run, prompt, `q-${side.toLowerCase()}`, `Which tool should a synthetic buyer ${side} choose?`]));
    await tryStep(log, `run running ${side}`, () => db.query("update public.runs set status = 'running', started_at = now() where id = $1 and status = 'queued'", [run]));
    await tryStep(log, `answer ${side}`, () => db.query("insert into public.run_answers (run_id, organization_id, prompt_id, prompt_key, prompt_text, provider, model, answer_text, citations_json, raw_json, collected_at, review_status) values ($1, $2, $3, $4, $5, 'groq', 'synthetic-model', $6, '[]'::jsonb, '{}'::jsonb, now(), 'unreviewed')", [run, org, prompt, `q-${side.toLowerCase()}`, `Which tool should a synthetic buyer ${side} choose?`, `Synthetic answer mentioning Brand${side}.`]));
    await tryStep(log, `run review ${side}`, () => db.query("update public.runs set status = 'review', answer_count = 1, completed_at = now() where id = $1 and status = 'running'", [run]));
  }
}

async function dataDigest(db) {
  const digests = {};
  for (const table of SEEDED_TABLES) {
    try {
      const { rows } = await db.query(`select coalesce(md5(string_agg(t::text, E'\\n' order by t::text)), 'empty') as d, count(*)::int as n from public.${table} t`);
      digests[table] = { rows: rows[0].n, md5: rows[0].d };
    } catch (error) {
      digests[table] = { error: String(error.message).slice(0, 120) };
    }
  }
  return digests;
}

// Catalog keys are "<kind>\t<key>"; render every tab as a space for the readable examples.
const displayKey = (key) => key.replaceAll("\t", " ");

function diffCatalog(local, prod) {
  const index = (rows) => new Map(rows.map((row) => [`${row.kind}\t${row.key}`, row.def_md5]));
  const L = index(local), P = index(prod);
  const summary = {};
  const bump = (kind, field) => { summary[kind] ??= { identical: 0, differing: 0, only_production: 0, only_repository_replay: 0 }; summary[kind][field] += 1; };
  const examples = { differing: [], only_production: [], only_repository_replay: [] };
  for (const [key, md5] of P) {
    const kind = key.split("\t")[0];
    if (!L.has(key)) { bump(kind, "only_production"); if (examples.only_production.length < 40) examples.only_production.push(displayKey(key)); }
    else if (L.get(key) !== md5) { bump(kind, "differing"); if (examples.differing.length < 40) examples.differing.push(displayKey(key)); }
    else bump(kind, "identical");
  }
  for (const key of L.keys()) if (!P.has(key)) {
    bump(key.split("\t")[0], "only_repository_replay");
    if (examples.only_repository_replay.length < 40) examples.only_repository_replay.push(displayKey(key));
  }
  return { summary, examples };
}

const receipt = { tool: "chat06-restore-rehearsal", started_at: new Date().toISOString(), environment: "local PGlite (disposable, in-memory)", repo_head: null, limits: [
  "PGlite is not Supabase: auth/storage/realtime/pg_cron/Vault and Supabase default grants are shimmed or absent.",
  "The physical backup is a PGlite data-directory tarball, not a Supabase/WAL-G backup or PITR restore.",
  "All data is synthetic. No production data was read, copied or restored.",
] };
try { receipt.repo_head = readFileSync(join(repo, ".git/HEAD"), "utf8").trim(); } catch { /* optional */ }

const source = new PGlite({ extensions: { pgcrypto } });
await source.exec(SHIM);
const replayResults = await replay(source);
receipt.replay = { total: replayResults.length, ok: replayResults.filter((r) => r.ok).length, failed: replayResults.filter((r) => !r.ok) };
const before = await fingerprint(source);
receipt.catalog_after_replay = { hash: before.hash, counts: before.counts };
const seedLog = [];
await seedCustomerLoop(source, seedLog);
receipt.seed = { ok: seedLog.filter((s) => s.ok).length, total: seedLog.length, failed: seedLog.filter((s) => !s.ok) };
const seededData = await dataDigest(source);
receipt.seeded_data = seededData;

const backupBlob = await source.dumpDataDir("gzip");
const backupBytes = Buffer.from(await backupBlob.arrayBuffer());
receipt.backup = { kind: "pglite-physical-datadir-tar.gz", bytes: backupBytes.length, sha256: sha256(backupBytes), taken_at: new Date().toISOString() };

const restored = new PGlite({ extensions: { pgcrypto }, loadDataDir: new Blob([backupBytes]) });
const restoredCatalog = await fingerprint(restored);
const restoredData = await dataDigest(restored);
const continueLog = [];
await tryStep(continueLog, "restored: tenant B cannot be read through tenant A RLS context", async () => {
  await restored.exec("begin; set local role authenticated;");
  await restored.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)`, [ID.userA]);
  const { rows } = await restored.query("select id from public.runs where organization_id = $1", [ID.orgB]);
  const own = await restored.query("select id from public.runs where organization_id = $1", [ID.orgA]);
  await restored.exec("rollback;");
  if (rows.length !== 0) throw new Error(`cross-tenant rows visible: ${rows.length}`);
  if (own.rows.length !== 1) throw new Error(`own-tenant rows visible: ${own.rows.length} (expected 1)`);
});
await tryStep(continueLog, "restored: second (later) run for the same project and question", async () => {
  await restored.query("insert into public.runs (id, organization_id, project_id, category_id, status, provider_ids, prompt_count, created_by) values ($1, $2, $3, $4, 'queued', array['groq'], 1, $5)", [ID.runA2, ID.orgA, ID.projA, ID.catA, ID.userA]);
  await restored.query("insert into public.run_prompt_selections (organization_id, run_id, prompt_id, prompt_key, prompt_text, locale) values ($1, $2, $3, 'q-a', 'Which tool should a synthetic buyer A choose?', 'en-US')", [ID.orgA, ID.runA2, ID.promptA]);
  await restored.query("update public.runs set status = 'running', started_at = now() where id = $1 and status = 'queued'", [ID.runA2]);
  await restored.query("update public.runs set status = 'review', answer_count = 0, completed_at = now() where id = $1 and status = 'running'", [ID.runA2]);
});
await tryStep(continueLog, "restored: fenced cancel cannot overwrite a reviewed run", async () => {
  const { rows } = await restored.query("update public.runs set status = 'cancelled' where id = $1 and status in ('queued','running') returning id", [ID.runA2]);
  if (rows.length !== 0) throw new Error("reviewed run was overwritten");
});
receipt.restore = {
  catalog_identical: restoredCatalog.hash === before.hash,
  data_identical: JSON.stringify(restoredData) === JSON.stringify(seededData),
  restored_catalog_hash: restoredCatalog.hash,
  continued_customer_loop: continueLog,
};

// Rollback: a throwaway forward change, then restore the pre-change backup.
await restored.exec("create table public.chat06_throwaway_forward_change (id uuid primary key); alter table public.runs add column chat06_throwaway text;");
const changed = await fingerprint(restored);
const rolledBack = new PGlite({ extensions: { pgcrypto }, loadDataDir: new Blob([backupBytes]) });
const rolledBackCatalog = await fingerprint(rolledBack);
receipt.rollback = {
  forward_change_hash: changed.hash,
  forward_change_differs: changed.hash !== before.hash,
  restored_pre_change_hash: rolledBackCatalog.hash,
  returned_to_pre_change: rolledBackCatalog.hash === before.hash,
  data_identical_after_rollback: JSON.stringify(await dataDigest(rolledBack)) === JSON.stringify(seededData),
};

if (prodCatalogPath) {
  const prodRows = JSON.parse(readFileSync(prodCatalogPath, "utf8"));
  receipt.production_parity = {
    production_fingerprint_source: prodCatalogPath.split("/").pop(),
    note: "Production fingerprint is md5 digests only, exported via the Supabase read-only query endpoint. Grant differences partly reflect the local role shim.",
    ...diffCatalog(before.rows, prodRows),
  };
}
receipt.finished_at = new Date().toISOString();
process.stdout.write(JSON.stringify(receipt, null, 1) + "\n");
await Promise.all([source.close(), restored.close(), rolledBack.close()]).catch(() => undefined);
process.exit(0);
