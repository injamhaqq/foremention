import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { assertPublicSourceResolution } from "../lib/source-inspection.ts";

const DESTINATION = "https://delivery.example/webhook";

test("synthetic public DNS answers allow inspection of a webhook destination", async () => {
  const actual = await assertPublicSourceResolution(DESTINATION, {
    resolver: async () => ["1.1.1.1", "2606:4700:4700::1111"],
  });
  assert.equal(actual, DESTINATION);
});

test("synthetic private, metadata, mapped, and malformed DNS answers fail closed", async () => {
  const rejected = [
    ["10.0.0.1"],
    ["127.0.0.1"],
    ["169.254.169.254"],
    ["::ffff:7f00:1"],
    ["fd00::1"],
    ["1.1.1.1", "192.168.0.3"],
    ["not-an-ip-address"],
    [],
  ];
  for (const addresses of rejected) {
    await assert.rejects(
      () => assertPublicSourceResolution(DESTINATION, {
        resolver: async () => addresses,
      }),
      /did not resolve exclusively to public internet addresses/,
      `Unexpectedly accepted DNS response: ${addresses.join(",")}`,
    );
  }
});

test("DNS outages fail closed rather than authorizing outbound delivery", async () => {
  await assert.rejects(
    () => assertPublicSourceResolution(DESTINATION, {
      resolver: async () => { throw new Error("synthetic DNS failure"); },
    }),
    /synthetic DNS failure/,
  );
});

test("workspace webhook DNS preflight runs before every outbound fetch", async () => {
  const source = await readFile(new URL("../lib/workspace-webhooks.ts", import.meta.url), "utf8");
  assert.match(source, /import \{ assertPublicSourceResolution, validatePublicSourceUrl \}/);
  const loopStart = source.indexOf("for (const endpoint of endpoints.filter");
  const preflight = source.indexOf("await assertPublicSourceResolution(destination);", loopStart);
  const outbound = source.indexOf("await fetch(destination", loopStart);
  assert.ok(loopStart >= 0 && preflight > loopStart && outbound > preflight);
  assert.match(source, /redirect: "error"/);
});

test("registration refuses non-public DNS before persisting a webhook", async () => {
  const source = await readFile(new URL("../app/api/webhooks/route.ts", import.meta.url), "utf8");
  assert.match(source, /await assertPublicSourceResolution\(destinationUrl\)/);
  const validated = source.indexOf("await assertPublicSourceResolution(destinationUrl)");
  const persisted = source.indexOf('supabaseRest("workspace_webhook_endpoints"');
  assert.ok(validated >= 0 && persisted > validated);
});
