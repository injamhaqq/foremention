import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  inspectSourceUrl,
  isBlockedResolution,
  isPrivateIp,
  isSafePublicSourceUrl,
  resolveAndValidatePublicHost,
  validatePublicSourceUrl,
} from "../lib/source-inspection.ts";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];

test("private and local source URLs are rejected before fetch", async () => {
  assert.equal(isPrivateIp("127.0.0.1"), true);
  assert.equal(isPrivateIp("10.0.0.8"), true);
  assert.equal(isPrivateIp("172.20.0.1"), true);
  assert.equal(isPrivateIp("192.168.1.1"), true);
  assert.equal(isPrivateIp("169.254.169.254"), true);
  assert.equal(isPrivateIp("::1"), true);
  assert.equal(isPrivateIp("fc00::1"), true);
  assert.equal(isPrivateIp("fe80::1"), true);
  assert.equal(isPrivateIp("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateIp("::ffff:10.0.0.8"), true);
  assert.equal(isPrivateIp("::ffff:169.254.169.254"), true);
  assert.equal(isPrivateIp("64:ff9b::127.0.0.1"), true);
  assert.equal(isPrivateIp("64:ff9b::169.254.169.254"), true);
  assert.equal(isPrivateIp("2001:db8::1"), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isSafePublicSourceUrl("http://localhost/admin"), false);
  assert.equal(isSafePublicSourceUrl("https://127.0.0.1/admin"), false);
  assert.equal(isSafePublicSourceUrl("https://[::1]/admin"), false);
  assert.equal(isSafePublicSourceUrl("https://0x7f000001/admin"), false);
  assert.equal(isSafePublicSourceUrl("https://2130706433/admin"), false);
  assert.equal(isSafePublicSourceUrl("https://example.com/page"), true);
});

test("resolver blocks public-looking hosts that resolve privately", async () => {
  assert.equal(isBlockedResolution([{ address: "93.184.216.34", family: 4 }]), false);
  assert.equal(isBlockedResolution([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.2", family: 4 }]), true);
  await assert.rejects(() => resolveAndValidatePublicHost(new URL("https://example.com"), async () => [{ address: "127.0.0.1", family: 4 }]), /non-public/);
  await assert.doesNotReject(() => validatePublicSourceUrl("https://example.com/page", { resolver: publicResolver }));
});

test("inspection records open and blocked HTML responses without executing page code", async () => {
  const open = await inspectSourceUrl("https://example.com/page", {
    resolver: publicResolver,
    fetcher: async () => new Response("<html><head><title>Example Source</title></head><body><h1>Hello</h1><script>alert(1)</script></body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
  });
  assert.equal(open.access, "open");
  assert.equal(open.httpStatus, 200);
  assert.equal(open.pageTitle, "Example Source");
  assert.match(open.contentSignature || "", /h1:Hello/);
  assert.equal(open.pageText, undefined);

  const blocked = await inspectSourceUrl("https://example.com/page", {
    resolver: publicResolver,
    fetcher: async () => new Response("blocked", { status: 403, headers: { "content-type": "text/plain" } }),
  });
  assert.equal(blocked.access, "blocked");
  assert.equal(blocked.httpStatus, 403);
});

test("inspection follows redirects only after validating each hop", async () => {
  const visited = [];
  const result = await inspectSourceUrl("https://example.com/start", {
    resolver: publicResolver,
    fetcher: async (input) => {
      const url = String(input); visited.push(url);
      if (url.endsWith("/start")) return new Response(null, { status: 302, headers: { location: "/final" } });
      return new Response("<title>Final</title><main>Destination</main>", { status: 200, headers: { "content-type": "text/html" } });
    },
  });
  assert.deepEqual(visited, ["https://example.com/start", "https://example.com/final"]);
  assert.equal(result.finalUrl, "https://example.com/final");
  assert.equal(result.redirectCount, 1);
});

test("inspection records blocked, oversized, and network-failure outcomes truthfully", async () => {
  const resolver = publicResolver;
  const oversized = await inspectSourceUrl("https://example.com", {
    fetcher: async () => new Response("x".repeat(100), { status: 200, headers: { "content-type": "text/plain" } }),
    resolver,
    maxBytes: 20,
  });
  assert.equal(oversized.access, "partial");
  assert.match(oversized.message, /size limit/);

  const unavailable = await inspectSourceUrl("https://example.com", {
    fetcher: async () => { throw new Error("offline"); },
    resolver,
  });
  assert.equal(unavailable.access, "unknown");
  assert.equal(unavailable.httpStatus, null);
});

test("live source inspection is tenant-scoped, role-checked, origin-guarded, snapshotted, audited, and rendered inside Recommendation Record", async () => {
  const root = new URL("../", import.meta.url);
  const [route, evidence, component] = await Promise.all([
    readFile(new URL("app/api/sources/[id]/inspect/route.ts", root), "utf8"),
    readFile(new URL("components/recommendation-source-evidence.tsx", root), "utf8"),
    readFile(new URL("components/source-live-inspector.tsx", root), "utf8"),
  ]);
  assert.match(route, /isTrustedMutationOrigin/);
  assert.match(route, /getPrimaryWorkspaceRole/);
  assert.match(route, /!role \|\| role === "viewer"/);
  assert.match(route, /created_at=gte\.\$\{recentWindow\}/);
  assert.match(route, /retry-after/);
  assert.match(route, /source_map_entries\?select=id,source_id[\s\S]*organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /sources\?select=id,canonical_url[\s\S]*organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /includePageText: true/);
  assert.match(route, /persistSourceSnapshot/);
  assert.match(route, /crawler_checked_at: inspection\.checkedAt/);
  assert.match(route, /snapshot_id: snapshot\.id/);
  assert.match(route, /change_state: snapshot\.changeState/);
  assert.match(route, /action: "source\.inspected"/);
  assert.match(route, /snapshot\.materiallyChanged/);
  assert.match(route, /source_\$\{monitoringEvent\}/);
  assert.match(evidence, /loadSourceSnapshotHistory/);
  assert.match(evidence, /Fingerprint|text fingerprint/);
  assert.match(evidence, /SourceLiveInspector/);
  assert.match(component, /does not execute scripts, store the page body/);
  assert.match(component, /Saved page observation/);
});
