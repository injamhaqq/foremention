// Chat02 bounded SSRF fixtures for the shared public-URL guard used by source
// inspection and (via assertPublicSourceResolution) workspace webhook egress.
// lib/source-inspection.ts is owned by Chat01; Chat02 only adds these fixtures.
// Known gaps are recorded as `todo` tests (reported, not failing CI) with the
// patch in docs/execution/attach-v1/02-proposals/ssrf-guard-ipv6-gaps.patch.md.
import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicSourceResolution, validatePublicSourceUrl } from "../lib/source-inspection.ts";

const blocked = (value) => assert.throws(() => validatePublicSourceUrl(value), undefined, `must block ${value}`);

test("Chat02 SSRF: loopback, metadata, private and alternate IPv4 encodings are blocked", () => {
  for (const value of [
    "http://127.0.0.1/", "http://2130706433/", "http://0x7f.1/", "http://017700000001/", "http://127.1/",
    "http://0.0.0.0/", "http://10.0.0.1/", "http://172.16.0.1/", "http://192.168.1.1/", "http://100.64.0.1/",
    "http://169.254.169.254/latest/meta-data/", "http://metadata.google.internal/", "http://localhost./", "http://foo.localhost/",
  ]) blocked(value);
});

test("Chat02 SSRF: IPv6 loopback, link-local, ULA, mapped, NAT64 and 6to4 are blocked", () => {
  for (const value of [
    "http://[::1]/", "http://[::]/", "http://[fe80::1]/", "http://[fd00:ec2::254]/",
    "http://[::ffff:127.0.0.1]/", "http://[0:0:0:0:0:ffff:7f00:1]/", "http://[::ffff:a9fe:a9fe]/",
    "http://[64:ff9b::a9fe:a9fe]/", "http://[2002:a9fe:a9fe::]/",
  ]) blocked(value);
});

test("Chat02 SSRF: non-http schemes, credentials and nonstandard ports are blocked", () => {
  for (const value of ["file:///etc/passwd", "gopher://x/", "javascript:alert(1)", "http://user:pw@example.com/", "https://example.com:8443/"]) blocked(value);
});

test("Chat02 SSRF: public names and addresses remain allowed", () => {
  assert.equal(validatePublicSourceUrl("https://example.com/a#frag").toString(), "https://example.com/a");
  assert.equal(validatePublicSourceUrl("https://1.1.1.1/").hostname, "1.1.1.1");
});

test("Chat02 SSRF: DNS rebinding to a private answer is refused after resolution", async () => {
  const resolver = async () => ["10.0.0.5"];
  await assert.rejects(() => assertPublicSourceResolution("https://rebind.example.com/", { resolver }));
  await assert.rejects(() => assertPublicSourceResolution("https://rebind.example.com/", { resolver: async () => ["::1"] }));
  assert.equal(await assertPublicSourceResolution("https://ok.example.com/", { resolver: async () => ["93.184.216.34"] }), "https://ok.example.com/");
});

test("Chat02 SSRF (closed by FM-00 composed patch): IPv4-compatible ::/96, Teredo 2001:0::/32 and discard 100::/64 are blocked", async () => {
  for (const value of ["http://[::127.0.0.1]/", "http://[::7f00:1]/", "http://[2001:0000:4136:e378:8000:63bf:3fff:fdd2]/", "http://[100::1]/"]) blocked(value);
  await assert.rejects(() => assertPublicSourceResolution("https://aaaa.example.com/", { resolver: async () => ["::7f00:1"] }));
});
