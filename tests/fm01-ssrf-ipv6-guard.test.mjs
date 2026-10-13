// Chat01 (owner of lib/source-inspection.ts) regression for the IPv6 SSRF gaps
// first reported by Chat02 as a `todo` test (tests/attach02-ssrf-url-guard.test.mjs,
// patch docs/execution/attach-v1/02-proposals/ssrf-guard-ipv6-gaps.patch.md) and
// composed by FM-00 in 5425d1ee. The lib change on this branch is byte-identical
// to fm-attach-v1/00-coordinator so composition stays conflict-free. This file
// is namespaced to Chat01 so it never collides with Chat02's fixture file.
import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicSourceResolution, validatePublicSourceUrl } from "../lib/source-inspection.ts";

const blocked = (value) => assert.throws(() => validatePublicSourceUrl(value), undefined, `must block ${value}`);

test("FM-01 SSRF: IPv4-compatible ::/96, Teredo 2001:0::/32 and discard 100::/64 are blocked (was Chat02 todo)", async () => {
  for (const value of [
    "http://[::127.0.0.1]/",
    "http://[::7f00:1]/",
    "http://[::a9fe:a9fe]/",
    "http://[2001:0000:4136:e378:8000:63bf:3fff:fdd2]/",
    "http://[2001::1]/",
    "http://[100::1]/",
    "http://[100:0:0:0:1::]/",
  ]) blocked(value);
  await assert.rejects(() => assertPublicSourceResolution("https://aaaa.example.com/", { resolver: async () => ["::7f00:1"] }));
  await assert.rejects(() => assertPublicSourceResolution("https://teredo.example.com/", { resolver: async () => ["2001:0:4136:e378:8000:63bf:3fff:fdd2"] }));
  await assert.rejects(() => assertPublicSourceResolution("https://discard.example.com/", { resolver: async () => ["100::1"] }));
});

test("FM-01 SSRF: public IPv6 outside the new ranges stays allowed", async () => {
  for (const value of ["http://[2001:4860:4860::8888]/", "http://[2606:4700:4700::1111]/"]) {
    assert.doesNotThrow(() => validatePublicSourceUrl(value), `must allow ${value}`);
  }
  assert.equal(
    await assertPublicSourceResolution("https://v6.example.com/", { resolver: async () => ["2001:4860:4860::8888"] }),
    "https://v6.example.com/",
  );
});
