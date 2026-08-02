import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("overview exposes the four persisted getting-started outcomes", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  for (const label of [
    "Complete onboarding",
    "Review the first Source Map",
    "Record the first action",
    "Invite a teammate",
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /sources\.some\(\(source\) => Boolean\(source\.reviewedAt\)\)/);
  assert.match(source, /team\.members\.length > 1 \|\| team\.invitations\.length > 0/);
});
