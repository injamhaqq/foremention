#!/usr/bin/env node
// OFFLINE audit: compare a private, hash-only ledger export to checked-in SQL.
// No database access, network calls, SQL execution, secret parsing or writes
// to production. Never publish a raw migration-ledger statement snapshot.
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const hex40 = /^[a-f0-9]{40}$/i;
const safeName = /^[a-zA-Z0-9_\-]+$/;
const allowedFields = new Set(["version", "name", "raw_git_blob_sha", "append_lf_git_blob_sha", "text_bytes"]);
export function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0", "utf8")).update(bytes).digest("hex");
}
export function auditMigrationFingerprints(snapshot, localFiles) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.records)) {
    throw Error("Expected a version-1 hash-only migration ledger snapshot.");
  }
  if (!Array.isArray(localFiles) || localFiles.some(x => !x || typeof x.name !== "string" || typeof x.content !== "string" || !/^\d{14}_[a-zA-Z0-9_\-]+\.sql$/.test(x.name))) {
    throw Error("Expected migration filenames and trusted local file contents.");
  }
  const localSha = new Map();
  for (const f of localFiles) {
    const digest = gitBlobSha(f.content);
    const matches = localSha.get(digest) || [];
    matches.push(f.name);
    localSha.set(digest, matches);
  }
  const identities = new Set();
  const groups = new Map();
  const rows = snapshot.records.map(record => {
    if (!record || typeof record !== "object" || Object.keys(record).some(k => !allowedFields.has(k))) {
      throw Error("The ledger export must contain hashes and labels only, never raw SQL or unknown columns.");
    }
    if (!/^\d{14}$/.test(record.version) || !safeName.test(record.name) ||
        !hex40.test(record.raw_git_blob_sha) || !hex40.test(record.append_lf_git_blob_sha)) {
      throw Error("Invalid migration label or hash-only export.");
    }
    const id = record.version + "_" + record.name;
    if (identities.has(record.version)) throw Error("Duplicate ledger version in exported snapshot.");
    identities.add(record.version);
    const siblings = groups.get(record.raw_git_blob_sha) || [];
    siblings.push(id);
    groups.set(record.raw_git_blob_sha, siblings);
    const exact = localSha.get(record.raw_git_blob_sha) || [];
    const appended = exact.length ? [] : localSha.get(record.append_lf_git_blob_sha) || [];
    return { remote: id, proof: exact.length ? "exact_git_blob" : appended.length ? "one_trailing_lf" : "unmatched",
      local: exact.length ? exact : appended };
  });
  const matchedFiles = new Set(rows.flatMap(r => r.local));
  const unmatchedLocal = localFiles.map(f => f.name).filter(f => !matchedFiles.has(f)).sort();
  const totals = { remote: rows.length, local: localFiles.length,
    exact: rows.filter(r => r.proof === "exact_git_blob").length,
    trailingLf: rows.filter(r => r.proof === "one_trailing_lf").length,
    unmatchedRemote: rows.filter(r => r.proof === "unmatched").length,
    unmatchedLocal: unmatchedLocal.length };
  const duplicatedContent = [...groups.values()].filter(ids => ids.length > 1);
  return { totals, rows, unmatchedLocal, duplicatedContent };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--snapshot") {
    throw Error("Usage: node scripts/audit/compare-migration-fingerprints.mjs --snapshot /private/ledger-hashes.local.json");
  }
  const path = resolve(args[1]);
  if (path === projectRoot || path.startsWith(projectRoot + sep)) {
    throw Error("Keep the private ledger snapshot OUTSIDE the repository working tree.");
  }
  const snapshot = JSON.parse(await readFile(path, "utf8"));
  const base = join(projectRoot, "supabase", "migrations");
  const files = (await readdir(base)).filter(x => /^\d{14}_.+\.sql$/.test(x)).sort();
  const local = await Promise.all(files.map(async name => ({ name, content: await readFile(join(base, name), "utf8") })));
  const report = auditMigrationFingerprints(snapshot, local);
  // Minimal stdout: no raw statements, SQL hashes, secrets or customer records.
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (report.totals.unmatchedRemote || report.totals.unmatchedLocal) {
    process.stderr.write("Unmatched entries require manual semantic and live-schema review. No repair was performed.\n");
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write("Migration fingerprint audit rejected: " + error.message + "\n"); process.exitCode = 1; });
}
