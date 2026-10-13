import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isTrustedMutationOrigin } from "../lib/request-security.ts";

const root = new URL("../", import.meta.url);
const routes = [
  "app/api/auth/login/route.ts",
  "app/api/auth/signup/route.ts",
  "app/api/auth/session/route.ts",
  "app/api/auth/verify/route.ts",
  "app/api/auth/password/route.ts",
  "app/api/auth/forgot-password/route.ts",
  "app/api/auth/demo/route.ts",
  "app/api/auth/demo/exit/route.ts"
];

test("untrusted forwarded host never authorizes an external mutation origin", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://foremention.com";
  try {
    const backend = "https://foremention-mvp.workers.dev/api/auth/session";
    const forged = new Request(backend, { method: "POST", headers: {
      origin: "https://external.example",
      host: "foremention.com",
      "x-forwarded-host": "external.example",
      "x-forwarded-proto": "https",
    } });
    assert.equal(isTrustedMutationOrigin(forged), false);
    const configured = new Request(backend, { method: "POST", headers: { origin: "https://foremention.com" } });
    assert.equal(isTrustedMutationOrigin(configured), true);
    const direct = new Request("https://foremention.com/api/auth/session", { method: "POST", headers: { origin: "https://foremention.com" } });
    assert.equal(isTrustedMutationOrigin(direct), true);
    assert.equal(isTrustedMutationOrigin(new Request(backend, { method: "POST" })), false);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  }
});

test("every browser auth POST route fails closed on origin before touching a token, cookie or provider", async () => {
  const guard = 'if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });';
  for (const path of routes) {
    const content = await readFile(new URL(path, root), "utf8");
    assert.ok(content.includes('import { isTrustedMutationOrigin } from "@/lib/request-security";'), path);
    const entry = content.indexOf("export async function POST(request: Request) {");
    assert.ok(entry >= 0, path);
    const body = content.slice(entry + "export async function POST(request: Request) {".length);
    assert.ok(body.trimStart().startsWith(guard), path);
  }
});
