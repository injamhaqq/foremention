import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Supabase sign-out uses the authenticated REST logout endpoint with an explicit scope", async () => {
  const helper = await text("lib/supabase-rest.ts");
  assert.match(helper, /type SupabaseSignOutScope = "global" \| "local" \| "others"/);
  assert.match(helper, /auth\/v1\/logout\?scope=\$\{encodeURIComponent\(scope\)\}/);
  assert.match(helper, /authorization: `Bearer \$\{accessToken\}`/);
  assert.match(helper, /apikey: anonKey/);
  assert.match(helper, /Supabase access-token JWTs remain stateless until their encoded expiry/);
});

test("ordinary Sign out revokes only the current Supabase session and clears this browser", async () => {
  const route = await text("app/api/auth/logout/route.ts");
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /supabaseSignOut\(accessToken, "local"\)/);
  assert.doesNotMatch(route, /supabaseSignOut\(accessToken, "global"\)/);
  assert.match(route, /clearSessionCookies\(response\)/);
  assert.match(route, /signed_out_cleanup_unconfirmed/);
  assert.match(route, /remote refresh-session cleanup was not confirmed/i);
});

test("all-device sign out is explicit, origin-guarded, and does not report success after an upstream failure", async () => {
  const route = await text("app/api/auth/logout-all/route.ts");
  const revoke = route.indexOf('supabaseSignOut(accessToken, "global")');
  const success = route.indexOf('reason=all_sessions_revoked');
  const failure = route.indexOf('session_action=global_failed');
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.ok(revoke >= 0);
  assert.ok(success > revoke);
  assert.ok(failure > revoke);
  assert.match(route, /Preserve the current browser session so the customer can retry/);
  assert.match(route, /status === 401 \|\| status === 403/);
});

test("Settings distinguishes current-device and all-device sign out and states the JWT expiry limit", async () => {
  const [settings, control] = await Promise.all([
    text("app/app/settings/page.tsx"),
    text("components/session-security.tsx"),
  ]);
  assert.match(settings, /Account security/);
  assert.match(settings, /Signed-in devices/);
  assert.match(settings, /SessionSecurity/);
  assert.match(control, /Sign out this device/);
  assert.match(control, /Sign out all devices/);
  assert.match(control, /refresh sessions immediately/);
  assert.match(control, /access-token JWTs on another device can remain valid until their encoded expiry/);
  assert.match(control, /fictional demo/);
});

test("login feedback never claims global access-token JWTs are instantly invalidated", async () => {
  const login = await text("app/login/page.tsx");
  assert.match(login, /all_sessions_revoked/);
  assert.match(login, /Already-issued access tokens on another device can remain valid until their encoded expiry/);
  assert.match(login, /You signed out of this device\. Other signed-in devices were left unchanged/);
  assert.doesNotMatch(login, /all devices (?:were )?instantly logged out/i);
});
