# Proposal (Chat02 → Chat01 owner, FM-00 integration): close three IPv6 gaps in the public-URL guard

**Owner of file:** Chat01 (`lib/source-inspection.ts`, retrieval). Also used by Chat06 webhook egress via `assertPublicSourceResolution`. Chat02 did **not** edit the file; this is a reviewed patch.

**Severity:** low. Found with bounded fixtures (`tests/attach02-ssrf-url-guard.test.mjs`, the `todo` test), not exploited anywhere.

| Input (after WHATWG normalization) | Current result | Why it matters |
|---|---|---|
| `http://[::127.0.0.1]/` → `[::7f00:1]` | allowed | IPv4-compatible `::/96` (deprecated) embeds 127.0.0.1; also accepted as a DNS AAAA answer by `isPublicResolvedAddress` |
| `http://[2001:0000:4136:…]/` → `[2001:0:4136:…]` | allowed | the existing Teredo rule compares against `"2001:0000:"`, which WHATWG serialization never produces, so the rule is dead code |
| `http://[100::1]/` | allowed | discard-only `100::/64` |

Exploitability through Cloudflare Workers `fetch` is unproven (most stacks will not route `::/96`), but these are guard-correctness defects and the Teredo rule is visibly intended and inert.

## Patch (verified: with it applied the `todo` test passes and 36/36 source-inspection, webhook and Chat02 SSRF tests pass; reverted afterwards)

```diff
diff --git a/lib/source-inspection.ts b/lib/source-inspection.ts
index e2495d68..9faca408 100644
--- a/lib/source-inspection.ts
+++ b/lib/source-inspection.ts
@@ -97,8 +97,13 @@ function isPrivateIpv6(hostname: string) {
   const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
   const mapped = mappedIpv4(normalized);
   if (mapped) return isPrivateIpv4(mapped);
+  // WHATWG URL serializes IPv6 in compressed lowercase form, so prefixes must
+  // be matched on that form ("2001:0:" not "2001:0000:").
+  if (/^::[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(normalized)) return true; // IPv4-compatible ::/96 (deprecated)
   return normalized === "::"
     || normalized === "::1"
+    || /^2001:0?:/.test(normalized) // Teredo 2001:0::/32
+    || /^100::/.test(normalized) || normalized.startsWith("100:0:0:0:") // discard-only 100::/64
     || /^f[cd][0-9a-f]{2}:/.test(normalized)
     || /^fe[89a-f][0-9a-f]:/.test(normalized)
     || normalized.startsWith("ff")
```

## Acceptance
- `node --experimental-strip-types --test tests/attach02-ssrf-url-guard.test.mjs` shows `ok 6 … # TODO`; then remove the `todo` option in the same owner PR.
- Full `pnpm test` green; Browser/CI unchanged (no public behavior change for valid public URLs).

Rollback: revert the three added lines.
