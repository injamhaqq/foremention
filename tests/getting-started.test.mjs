import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("overview exposes the five persisted first-use activation outcomes", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  for (const label of [
    "Add your website",
    "Review buyer questions",
    "Start your first collection",
    "See your first AI result",
    "Review your first source",
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /Boolean\(context\?\.website\)/);
  assert.match(source, /prompts\.some\(\(prompt\) => prompt\.approved\)/);
  assert.match(source, /runs\.length > 0/);
  assert.match(source, /runs\.find\(\(run\) => run\.answers > 0\)/);
  assert.match(source, /sources\.find\(\(source\) => Boolean\(source\.reviewedAt\)\)/);
});
