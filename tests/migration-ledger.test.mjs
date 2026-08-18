import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);

test("Supabase migration versions are unique", async () => {
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql"));
  const byVersion = new Map();

  for (const file of files) {
    const match = file.match(/^(\d{14})_/);
    assert.ok(match, `migration must start with a 14-digit version: ${file}`);
    const version = match[1];
    const existing = byVersion.get(version);
    assert.equal(existing, undefined, `duplicate migration version ${version}: ${existing} and ${file}`);
    byVersion.set(version, file);
  }
});