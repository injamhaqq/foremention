import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Google account auth is feature-gated and reuses the verified Supabase session handoff", async () => {
  const [gate, route, form, login, signup, callback, session, env] = await Promise.all([
    text("lib/google-auth.ts"),
    text("app/api/auth/google/route.ts"),
    text("components/auth-form.tsx"),
    text("app/login/page.tsx"),
    text("app/signup/page.tsx"),
    text("components/auth-callback.tsx"),
    text("app/api/auth/session/route.ts"),
    text(".env.example"),
  ]);

  assert.match(gate, /FOREMENTION_GOOGLE_AUTH_ENABLED === "1"/);
  assert.match(gate, /!value\.startsWith\("\/"\)/);
  assert.match(gate, /new URL\(value, AUTH_NEXT_BASE\)/);
  assert.match(gate, /parsed\.origin !== AUTH_NEXT_BASE\.origin/);
  assert.match(route, /\/auth\/v1\/authorize/);
  assert.match(route, /provider", "google"/);
  assert.match(route, /redirect_to/);
  assert.match(route, /google_unavailable/);
  assert.match(route, /private, no-store/);

  assert.match(form, /googleEnabled/);
  assert.match(form, /Continue with Google/);
  assert.match(form, /Sign up with Google/);
  assert.match(form, /\/api\/auth\/google/);
  assert.match(form, /\/api\/auth\/\$\{mode\}/);
  assert.match(form, /Confirm password/);
  assert.match(form, /\{12,\}/);

  assert.match(login, /googleAuthEnabled\(\)/);
  assert.match(signup, /googleAuthEnabled\(\)/);
  assert.match(callback, /access_token/);
  assert.match(callback, /refresh_token/);
  assert.match(callback, /\/api\/auth\/session/);
  assert.match(session, /auth\/v1\/user/);
  assert.match(session, /setSessionCookies/);
  assert.match(env, /FOREMENTION_GOOGLE_AUTH_ENABLED=0/);
});
