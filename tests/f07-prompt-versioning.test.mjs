import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("buyer-question edits use one atomic versioning RPC and preserve question identity", async () => {
  const route = await text("app/api/prompts/route.ts");
  assert.match(route, /\.rpc\("update_prompt_versioned"/);
  assert.doesNotMatch(route, /current\.version \+ 1/);
  assert.doesNotMatch(route, /supabaseRest\("prompt_versions"[\s\S]*change_reason: "Edited by workspace member"/);
});

test("atomic prompt versioning locks the canonical prompt row and appends coherent history", async () => {
  const migration = await text("supabase/migrations/20260915160000_atomic_prompt_versioning.sql");
  assert.match(migration, /create or replace function public\.update_prompt_versioned/);
  assert.match(migration, /for update/);
  assert.match(migration, /v_next_version := v_current_version \+ 1/);
  assert.match(migration, /update public\.prompts/);
  assert.match(migration, /insert into public\.prompt_versions/);
  assert.match(migration, /prompt_key/);
  assert.match(migration, /array\['owner','admin','analyst'\]/);
  assert.match(migration, /revoke all on function public\.update_prompt_versioned/);
  assert.match(migration, /grant execute on function public\.update_prompt_versioned/);
});
