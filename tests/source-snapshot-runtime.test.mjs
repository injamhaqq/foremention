import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifySourceSnapshotChange, hashBoundedSourceText } from "../lib/source-snapshots.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("snapshot fingerprints are deterministic and bounded", async () => {
  assert.equal(await hashBoundedSourceText("Hello   world"), await hashBoundedSourceText("Hello world"));
  assert.notEqual(await hashBoundedSourceText("Hello world"), await hashBoundedSourceText("Hello changed"));
});

test("snapshot change classification separates reachable changes from unreachable outcomes", () => {
  const previous = { access: "open", httpStatus: 200, contentLength: 100, contentSignature: "a", contentHash: "hash-a", finalUrl: "https://example.com" };
  const unchanged = classifySourceSnapshotChange(previous, { ...previous });
  assert.equal(unchanged.changeState, "unchanged");
  const changed = classifySourceSnapshotChange(previous, { ...previous, contentHash: "hash-b", contentLength: 180, contentSignature: "b" });
  assert.equal(changed.changeState, "changed");
  const unreachable = classifySourceSnapshotChange(previous, { ...previous, access: "blocked", httpStatus: 403, contentHash: null, contentSignature: null });
  assert.equal(unreachable.changeState, "unreachable");
});

test("snapshot persistence stores bounded metadata and citation links without page content", async () => {
  const source = await read("lib/source-snapshots.ts");
  assert.match(source, /SOURCE_SNAPSHOT_REPRESENTATION_VERSION/);
  assert.match(source, /content_hash/);
  assert.match(source, /source_snapshot_observations/);
  assert.doesNotMatch(source, /page_text|page_body/);
});

test("inspection route links a saved snapshot to only its exact run-scoped citation observations", async () => {
  const route = await read("app/api/sources/[id]/inspect/route.ts");
  assert.match(route, /source_observations\?select=id,run_id,source_id/);
  assert.match(route, /run_id=eq\.\$\{encodeURIComponent\(runId\)\}/);
  assert.match(route, /source_id=eq\.\$\{sourceId\}/);
  assert.match(route, /observationIds:/);
  assert.match(route, /changeState: snapshot\.changeState/);
  assert.doesNotMatch(route, /pageText: inspection\.pageText/);
});

test("snapshot write policy includes every role allowed by live inspection while viewers remain read-only", async () => {
  const migration = await read("supabase/migrations/20260813083100_source_snapshot_admin_policy.sql");
  assert.match(migration, /array\['owner','admin','analyst'\]::public\.organization_role\[\]/g);
  assert.doesNotMatch(migration, /array\[[^\]]*'viewer'/);
  assert.match(migration, /observation\.organization_id = snapshot\.organization_id/);
  assert.match(migration, /observation\.source_id = snapshot\.source_id/);
});

test("contained Recommendation Record evidence explains saved observations without making causal claims", async () => {
  const evidence = await read("components/recommendation-source-evidence.tsx");
  assert.match(evidence, /Saved page observations/);
  assert.match(evidence, /saves bounded retrieval metadata and a text fingerprint—not the page body/);
  assert.match(evidence, /does not prove what caused the difference/);
  assert.match(evidence, /Evidence inspection|Observed evidence chain/);
  assert.doesNotMatch(evidence, /changed because/i);
});

test("Source Snapshot history exposes immutable provenance without exposing retained page content", async () => {
  const runtime = await read("lib/source-snapshots.ts");
  const evidence = await read("components/recommendation-source-evidence.tsx");

  assert.match(runtime, /runId: row\.run_id/);
  assert.match(runtime, /previousSnapshotId: row\.previous_snapshot_id/);
  assert.match(runtime, /representationVersion: row\.representation_version/);
  assert.match(runtime, /contentLength: row\.content_length/);
  assert.match(runtime, /fingerprint: row\.content_hash\?\.slice\(0, 12\) \|\| row\.content_signature \|\| null/);
  assert.match(evidence, /Collection \{shortRecord\(snapshot\.runId\)\}/);
  assert.match(evidence, /Previous \$\{shortRecord\(snapshot\.previousSnapshotId\)\}/);
  assert.match(evidence, /Representation: \{snapshot\.representationVersion\}/);
  assert.match(evidence, /Fingerprint: \{snapshot\.fingerprint \|\| "Unavailable"\}/);
  assert.match(evidence, /not stored page content/);
  assert.doesNotMatch(evidence, /page body:\s*\{/i);
});
