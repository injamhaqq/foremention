import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("published privacy disclosures cover the Cloudflare browser RUM boundary", async () => {
  const [privacy, subprocessors, worker] = await Promise.all([
    text("app/privacy/page.tsx"),
    text("app/subprocessors/page.tsx"),
    text("worker/index.ts"),
  ]);

  assert.match(worker, /static\.cloudflareinsights\.com/);
  assert.match(worker, /cloudflareinsights\.com/);

  assert.match(privacy, /Cloudflare Web Analytics/);
  assert.match(privacy, /browser performance/i);
  assert.match(privacy, /does not use cookies or browser storage/i);

  assert.match(subprocessors, /Cloudflare Web Analytics/);
  assert.match(subprocessors, /browser performance/i);
  assert.match(subprocessors, /does not use cookies or browser storage/i);
});
