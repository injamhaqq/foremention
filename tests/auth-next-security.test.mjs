import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("browser URL parsing treats a slash-backslash next target as cross-origin", () => {
  const parsed = new URL("/\\evil.example", "https://foremention.invalid");
  assert.equal(parsed.origin, "https://evil.example");
});

test("auth next validation rejects browser-normalized cross-origin targets", async () => {
  const auth = await text("lib/google-auth.ts");
  assert.match(auth, /new URL\(value,/);
  assert.match(auth, /\.origin/);
  assert.match(auth, /return "\/app"/);
});

test("session refresh reuses the canonical auth-next validator", async () => {
  const refresh = await text("app/api/auth/refresh/route.ts");
  assert.match(refresh, /import \{ safeAuthNext \} from "@\/lib\/google-auth"/);
  assert.match(refresh, /safeAuthNext\(new URL\(request\.url\)\.searchParams\.get\("next"\)\)/);
  assert.doesNotMatch(refresh, /candidate\.startsWith/);
});
