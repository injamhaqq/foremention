import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("provider response accounting is durable before answer persistence", async () => {
  const source = await readFile(new URL("lib/jobs/inngest.ts", root), "utf8");
  assert.match(source, /persistProviderCharge/);
  const collect = source.indexOf("collect-${providerId}");
  const account = source.indexOf("record-provider-charge-${providerId}");
  const persist = source.indexOf("persist-${providerId}");
  assert.ok(collect >= 0 && account > collect && persist > account);
});
