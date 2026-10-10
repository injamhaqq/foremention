import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../scripts/setup-paddle-sandbox-catalog.mjs", import.meta.url));
const script = readFileSync(path, "utf8");

test("catalog script is sandbox-only with a strict API key boundary", () => {
  assert.match(script, /https:\/\/sandbox-api\.paddle\.com/);
  assert.doesNotMatch(script, /https:\/\/api\.paddle\.com/);
  assert.match(script, /pdl_sdbx_apikey_/);
  assert.match(script, /KEY_PATTERN/);
  assert.match(script, /"Paddle-Version": "1"/);
  assert.match(script, /"active", "archived"/);
  assert.match(script, /Conflicting Sandbox monthly price/);
  assert.match(script, /Conflicting Sandbox product/);
  assert.match(script, /\.env\.paddle-sandbox\.catalog\.local/);
  assert.doesNotMatch(script, /\/transactions|\/subscriptions|\/customers|notification-settings/);
});

test("without --apply, catalogue script does not need a key or perform mutations", () => {
  const out = spawnSync(process.execPath, [path], {
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, PADDLE_SANDBOX_API_KEY: "", PADDLE_API_KEY: "" },
  });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /No changes made/);
});

test("live credentials are rejected before contacting Paddle", () => {
  const live = "pdl_live_apikey_" + "a".repeat(26) + "_" + "B".repeat(22) + "_XYZ";
  const out = spawnSync(process.execPath, [path, "--apply"], {
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, PADDLE_SANDBOX_API_KEY: "", PADDLE_API_KEY: live },
  });
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /SANDBOX API key/);
  assert.doesNotMatch(out.stderr + out.stdout, /pdl_live_apikey_/);
});

test("both test plan prices are fixed USD monthly and do not include free trial", () => {
  assert.match(script, /name: "Foremention Core"/);
  assert.match(script, /price: "9900"/);
  assert.match(script, /name: "Foremention Signal"/);
  assert.match(script, /price: "24900"/);
  assert.match(script, /interval: "month", frequency: 1/);
  assert.match(script, /quantity: \{ minimum: 1, maximum: 1 \}/);
  assert.match(script, /tax_category: "saas"/);
});
