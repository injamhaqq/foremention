import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("#504: an edge HTML 503 yields a plain transient message, never a JSON parse error", async () => {
  const { readApiJson, TRANSIENT_EDGE_MESSAGE } = await import("../lib/api-response.ts");
  const edge = new Response("<!DOCTYPE html><title>Error 1102</title>", { status: 503, headers: { "content-type": "text/html" } });
  assert.deepEqual(await readApiJson(edge), { error: TRANSIENT_EDGE_MESSAGE });
  const broken = new Response("{not json", { status: 503, headers: { "content-type": "application/json" } });
  assert.deepEqual(await readApiJson(broken), { error: TRANSIENT_EDGE_MESSAGE });
  const ok = new Response(JSON.stringify({ data: { id: "x" } }), { status: 201, headers: { "content-type": "application/json" } });
  assert.deepEqual(await readApiJson(ok), { data: { id: "x" } });
  const library = await readFile(new URL("../components/prompt-library.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(library, /await response\.json\(\)/);
  const liveCreate = library.slice(library.indexOf('const response = await fetch("/api/prompts"'), library.indexOf("async function toggle("));
  assert.ok(liveCreate.includes('if (!response.ok || !result.data) throw'), "real submissions fail before modifying the input");
  assert.ok(liveCreate.indexOf('setText("")') > liveCreate.indexOf("if (!response.ok || !result.data) throw"), "real input is cleared only after confirmed success");
  const demoCreate = library.slice(library.indexOf("async function addPrompt("), library.indexOf('const response = await fetch("/api/prompts"'));
  assert.match(demoCreate, /if \(demo\) \{/);
  assert.match(demoCreate, /setText\(" "\)/);
});
