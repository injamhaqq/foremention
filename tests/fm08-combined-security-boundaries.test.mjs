import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("FM-08 combined webhook boundaries require origin approval and live public DNS before registration", async () => {
  const s = await read("app/api/webhooks/route.ts");
  const isTrusted = s.indexOf("if (!isTrustedMutationOrigin(request))");
  const approved = s.indexOf("assertApprovedWorkspaceWebhookDestination(validateWebhookDestination");
  const dns = s.indexOf("await assertPublicSourceResolution(destinationUrl)");
  const save = s.indexOf('supabaseRest("workspace_webhook_endpoints"');
  assert.ok(isTrusted > 0 && isTrusted < approved, "request-origin verification must precede allowlist check");
  assert.ok(approved < dns && dns < save, "operator allowlist and public DNS must precede DB registration");
});

test("FM-08 combined webhook boundaries require origin approval and public DNS on every send", async () => {
  const s = await read("lib/workspace-webhooks.ts");
  const enabled = s.indexOf("!workspaceWebhookDeliveryEnabled()");
  const loop = s.indexOf("for (const endpoint of endpoints.filter");
  const approved = s.indexOf("assertApprovedWorkspaceWebhookDestination(validateWebhookDestination", loop);
  const dns = s.indexOf("await assertPublicSourceResolution(destination);", loop);
  const fetchPosition = s.indexOf("await fetch(destination", loop);
  assert.ok(enabled > 0 && enabled < loop, "global fail-closed guard must precede delivery processing");
  assert.ok(approved > loop && approved < dns && dns < fetchPosition, "no send before both guards");
  assert.match(s, /redirect: "error"/);
});

test("FM-08 combined candidate never treats forwarding headers as authoritative", async () => {
  const s = await read("lib/request-security.ts");
  assert.doesNotMatch(s, /request\.headers\.get\("x-forwarded-host"\)/);
  assert.doesNotMatch(s, /request\.headers\.get\("x-forwarded-proto"\)/);
  assert.match(s, /NEXT_PUBLIC_SITE_URL/);
});

test("FM-08 combined candidate guards all eight auth state-changing routes", async () => {
  for (const path of [
    "app/api/auth/login/route.ts",
    "app/api/auth/signup/route.ts",
    "app/api/auth/session/route.ts",
    "app/api/auth/verify/route.ts",
    "app/api/auth/password/route.ts",
    "app/api/auth/forgot-password/route.ts",
    "app/api/auth/demo/route.ts",
    "app/api/auth/demo/exit/route.ts",
  ]) {
    const s = await read(path);
    const start = s.indexOf("export async function POST(request: Request) {");
    const guard = s.indexOf("if (!isTrustedMutationOrigin(request))", start);
    assert.ok(start >= 0 && guard > start && guard - start < 150, `${path} must reject forged browser POSTs before side effects`);
  }
});
