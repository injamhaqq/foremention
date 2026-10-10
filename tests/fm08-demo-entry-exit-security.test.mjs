import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isTrustedMutationOrigin } from "../lib/request-security.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("demo entry and exit require canonical origin before mutating demo state", async () => {
  const paths = [
    "app/api/auth/demo/route.ts",
    "app/api/auth/demo/exit/route.ts",
  ];
  for (const path of paths) {
    const code = await read(path);
    assert.match(code, /import \{ isTrustedMutationOrigin \} from "@\/lib\/request-security"/);
    assert.match(code, /if \(!isTrustedMutationOrigin\(request\)\)/);
    assert.match(code, /status: 403/);
    assert.match(code, /cache-control", "private, no-store"/);
    assert.equal((code.match(/export async function POST\(/g) || []).length, 1);
  }
});

test("demo origin validation refuses cross-site and missing-origin POSTs", () => {
  const target = "https://foremention.com/api/auth/demo";
  assert.equal(isTrustedMutationOrigin(new Request(target, {
    method: "POST", headers: { origin: "https://foremention.com" },
  })), true);
  assert.equal(isTrustedMutationOrigin(new Request(target, {
    method: "POST", headers: { origin: "https://untrusted.example" },
  })), false);
  assert.equal(isTrustedMutationOrigin(new Request(target, { method: "POST" })), false);
});

test("demo cookie follows session cookie production safety defaults", async () => {
  const [demo, session] = await Promise.all([
    read("app/api/auth/demo/route.ts"),
    read("lib/session-cookies.ts"),
  ]);
  assert.match(demo, /httpOnly: true/);
  assert.match(demo, /sameSite: "lax"/);
  assert.match(demo, /secure: process\.env\.NODE_ENV === "production"/);
  assert.match(session, /secure: process\.env\.NODE_ENV === "production"/);
  assert.doesNotMatch(demo, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|INNGEST_EVENT_KEY/);
});
