import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const inspection = await import("../lib/source-inspection.ts");

test("source inspection accepts only ordinary public web URLs", () => {
  assert.equal(inspection.validatePublicSourceUrl("https://example.com/guide#section").toString(), "https://example.com/guide");
  for (const unsafe of [
    "file:///etc/passwd",
    "http://localhost/admin",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.1/",
    "http://[::1]/",
    "http://[fc00::1]/",
    "http://[ff02::1]/",
    "http://[2002:7f00:1::]/",
    "http://[::ffff:127.0.0.1]/",
    "https://user:password@example.com/",
    "https://example.com:8443/",
  ]) {
    assert.throws(() => inspection.validatePublicSourceUrl(unsafe), inspection.SourceInspectionError, unsafe);
  }
});

test("source inspection follows only validated redirects and extracts bounded metadata", async () => {
  const calls = [];
  const fetcher = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://example.com/start") {
      return new Response(null, { status: 302, headers: { location: "/guide" } });
    }
    return new Response("<html><head><title>Evidence &amp; trust</title><meta name=\"description\" content=\"Dated answers &amp; exact sources\"></head><body>Not stored</body></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
  const result = await inspection.inspectSourceUrl("https://example.com/start", {
    fetcher,
    resolver: async () => ["93.184.216.34"],
    now: () => new Date("2026-07-29T12:00:00.000Z"),
  });
  assert.deepEqual(calls, ["https://example.com/start", "https://example.com/guide"]);
  assert.equal(result.access, "open");
  assert.equal(result.pageTitle, "Evidence & trust");
  assert.equal(result.pageDescription, "Dated answers & exact sources");
  assert.equal(result.redirectCount, 1);
  assert.match(result.contentSignature, /^[0-9a-f]{8}$/);
  assert.ok(result.contentLength > 0);
  assert.equal(result.checkedAt, "2026-07-29T12:00:00.000Z");
  assert.equal("body" in result, false);
});

test("source monitoring flags material changes without storing page content", () => {
  assert.equal(inspection.hasSignificantSourceChange(
    { contentSignature: "00000000", contentLength: 1000 },
    { contentSignature: "ffffffff", contentLength: 1000 },
  ), true);
  assert.equal(inspection.hasSignificantSourceChange(
    { contentSignature: "00000000", contentLength: 1000 },
    { contentSignature: "00000001", contentLength: 1010 },
  ), false);
  assert.equal(inspection.hasSignificantSourceChange(
    { contentSignature: null, contentLength: null },
    { contentSignature: "ffffffff", contentLength: 1000 },
  ), false);
});

test("source inspection blocks redirect pivots into private networks", async () => {
  await assert.rejects(
    inspection.inspectSourceUrl("https://example.com/start", {
      fetcher: async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }),
      resolver: async () => ["93.184.216.34"],
    }),
    inspection.SourceInspectionError,
  );
});

test("source inspection can return bounded visible text only when explicitly requested", async () => {
  const result = await inspection.inspectSourceUrl("https://example.com", {
    fetcher: async () => new Response("<html><body><h1>Acme</h1><script>secret()</script><p>Compare Acme with Contoso.</p></body></html>", { headers: { "content-type": "text/html" } }),
    resolver: async () => ["93.184.216.34"],
    includePageText: true,
    maxExtractedTextChars: 1000,
  });
  assert.match(result.pageText, /Compare Acme with Contoso/);
  assert.doesNotMatch(result.pageText, /secret/);
});

test("source inspection records blocked, oversized, and network-failure outcomes truthfully", async () => {
  const resolver = async () => ["93.184.216.34"];
  const blocked = await inspection.inspectSourceUrl("https://example.com", {
    fetcher: async () => new Response("Denied", { status: 403, headers: { "content-type": "text/plain" } }),
    resolver,
  });
  assert.equal(blocked.access, "blocked");
  assert.equal(blocked.httpStatus, 403);

  const oversized = await inspection.inspectSourceUrl("https://example.com", {
    fetcher: async () => new Response("Too large", { status: 200, headers: { "content-type": "text/html", "content-length": "999999" } }),
    resolver,
    maxBytes: 20,
  });
  assert.equal(oversized.access, "partial");
  assert.match(oversized.message, /size limit/);

  const unavailable = await inspection.inspectSourceUrl("https://example.com", {
    fetcher: async () => { throw new Error("offline"); },
    resolver,
  });
  assert.equal(unavailable.access, "unknown");
  assert.equal(unavailable.httpStatus, null);
});

test("live source inspection is tenant-scoped, role-checked, origin-guarded, and audited", async () => {
  const root = new URL("../", import.meta.url);
  const [route, page, component] = await Promise.all([
    readFile(new URL("app/api/sources/[id]/inspect/route.ts", root), "utf8"),
    readFile(new URL("app/app/sources/[id]/page.tsx", root), "utf8"),
    readFile(new URL("components/source-live-inspector.tsx", root), "utf8"),
  ]);
  assert.match(route, /isTrustedMutationOrigin/);
  assert.match(route, /getPrimaryWorkspaceRole/);
  assert.match(route, /!role \|\| role === "viewer"/);
  assert.match(route, /created_at=gte\.\$\{recentWindow\}/);
  assert.match(route, /retry-after/);
  assert.match(route, /source_map_entries\?select=id,source_id[\s\S]*organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /sources\?select=id,canonical_url[\s\S]*organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /crawler_checked_at: inspection\.checkedAt/);
  assert.match(route, /action: "source\.inspected"/);
  assert.match(route, /hasSignificantSourceChange/);
  assert.match(route, /source_\$\{monitoringEvent\}/);
  assert.match(page, /SourceLiveInspector/);
  assert.match(component, /does not execute scripts, store the page body/);
});
