import assert from "node:assert/strict";
import test from "node:test";
import { inspectSourceUrl, SourceInspectionError } from "../lib/source-inspection.ts";

test("DNS preflight rejects private, malformed, and non-IP answers before fetch", async () => {
  for (const address of [
    "not-an-ip", "example.com", "999.888.77.66", "127.0.0.1",
    "10.1.2.3", "169.254.169.254", "::1", "fe80::1",
    "2001:db8::1", "::ffff:127.0.0.1", "2001:zzzz::1",
    "[2606:4700::1", "2606:4700::1]", "fe80::1%eth0",
  ]) {
    let fetchCount = 0;
    await assert.rejects(
      inspectSourceUrl("https://example.com/guide", {
        resolver: async () => [address],
        fetcher: async () => {
          fetchCount += 1;
          return new Response("<html><body>Should not retrieve</body></html>");
        },
      }),
      SourceInspectionError,
      `DNS result ${address} should fail closed`,
    );
    assert.equal(fetchCount, 0, `must not send request for DNS result ${address}`);
  }
});

test("DNS preflight refuses a mixed public/private address set", async () => {
  let fetchCount = 0;
  await assert.rejects(inspectSourceUrl("https://example.com/guide", {
    resolver: async () => ["93.184.216.34", "10.0.0.1"],
    fetcher: async () => {
      fetchCount += 1;
      return new Response("Not used");
    },
  }), SourceInspectionError);
  assert.equal(fetchCount, 0);
});

test("valid public IPv4 and IPv6 answers still allow bounded inspection", async () => {
  for (const address of ["93.184.216.34", "2606:4700:4700::1111"]) {
    let fetchCount = 0;
    const result = await inspectSourceUrl("https://example.com/guide", {
      resolver: async () => [address],
      fetcher: async () => {
        fetchCount += 1;
        return new Response("<html><body>Public reference</body></html>", {
          headers: { "content-type": "text/html" },
        });
      },
      includePageText: true,
    });
    assert.equal(fetchCount, 1);
    assert.equal(result.access, "open");
    assert.match(result.pageText, /Public reference/);
  }
});
