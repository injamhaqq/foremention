import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Source Snapshot runtime hashes only a bounded normalized representation and never persists page text", async () => {
  const runtime = await read("lib/source-snapshots.ts");

  assert.match(runtime, /SOURCE_SNAPSHOT_REPRESENTATION_VERSION = "visible-text-prefix-24k-v1"/);
  assert.match(runtime, /replace\(\/\\s\+\/g, " "\)\.trim\(\)\.slice\(0, 24_000\)/);
  assert.match(runtime, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(runtime, /content_hash: contentHash/);
  assert.match(runtime, /input\.inspection\.pageText/);
  assert.doesNotMatch(runtime, /page_text\s*:/i);
  assert.doesNotMatch(runtime, /page_body\s*:/i);
  assert.doesNotMatch(runtime, /raw_page\s*:/i);
});

test("Source Snapshot change classification separates exact change from material alerting and reachability", async () => {
  const runtime = await read("lib/source-snapshots.ts");

  assert.match(runtime, /previous\.contentHash === current\.contentHash/);
  assert.match(runtime, /changeState: "unchanged"/);
  assert.match(runtime, /hasSignificantSourceChange/);
  assert.match(runtime, /changeState: "changed"/);
  assert.match(runtime, /changeState: "unreachable"/);
  assert.match(runtime, /becameUnreachable: true/);
  assert.match(runtime, /materiallyChanged/);
  assert.match(runtime, /does not prove|did not allow|differed|changed materially/i);
});

test("Source Map snapshots are idempotent and link the exact citation observations for the run", async () => {
  const sourceMap = await read("lib/source-map-generation.ts");
  const runtime = await read("lib/source-snapshots.ts");

  assert.match(sourceMap, /select=id,source_id,provider,observed_at,review_status/);
  assert.match(sourceMap, /observationIds: \[observation\.id\]/);
  assert.match(sourceMap, /current\.observationIds\.push\(observation\.id\)/);
  assert.match(sourceMap, /persistSourceSnapshot\(\{/);
  assert.match(sourceMap, /snapshotKey: `\$\{run\.id\}:\$\{source\.sourceId\}:source-map-v1`/);
  assert.match(sourceMap, /observationIds: source\.observationIds/);
  assert.match(runtime, /source_observations\?select=id&organization_id=eq\.\$\{input\.organizationId\}&source_id=eq\.\$\{input\.sourceId\}/);
  assert.match(runtime, /source_snapshot_observations\?on_conflict=source_snapshot_id,source_observation_id/);
  assert.match(runtime, /resolution=ignore-duplicates,return=minimal/);
});

test("manual page checks append snapshot history and return no extracted page text", async () => {
  const route = await read("app/api/sources/[id]/inspect/route.ts");

  assert.match(route, /includePageText: true/);
  assert.match(route, /maxExtractedTextChars: 24_000/);
  assert.match(route, /persistSourceSnapshot\(\{/);
  assert.match(route, /token: viewer\.accessToken/);
  assert.match(route, /snapshot_id: snapshot\.id/);
  assert.match(route, /changeState: snapshot\.changeState/);
  assert.doesNotMatch(route, /pageText: inspection\.pageText/);
});

test("snapshot write policy includes every role allowed by live inspection while viewers remain read-only", async () => {
  const migration = await read("supabase/migrations/20260813083000_source_snapshot_admin_policy.sql");

  assert.match(migration, /array\['owner','admin','analyst'\]::public\.organization_role\[\]/g);
  assert.doesNotMatch(migration, /array\[[^\]]*'viewer'/);
  assert.match(migration, /observation\.organization_id = snapshot\.organization_id/);
  assert.match(migration, /observation\.source_id = snapshot\.source_id/);
});

test("source detail explains saved observations without making causal claims", async () => {
  const page = await read("app/app/sources/[id]/page.tsx");

  assert.match(page, /Saved page observations/);
  assert.match(page, /saves bounded retrieval metadata and a text fingerprint—not the page body/);
  assert.match(page, /does not prove what caused the difference/);
  assert.match(page, /Back to Sources/);
  assert.match(page, /Open Opportunities/);
  assert.doesNotMatch(page, /changed because/i);
});
