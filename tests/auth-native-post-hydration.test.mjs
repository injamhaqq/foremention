import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("authentication form never exposes credentials via native GET navigation during hydration", async () => {
  const [form, canary] = await Promise.all([
    read("components/auth-form.tsx"),
    read("scripts/first-evidence-production-canary.mjs"),
  ]);
  assert.ok(form.includes('method="post" onSubmit={submit}'), "Native fallback must never issue GET with password");
  assert.ok(form.includes('data-auth-hydrated={hydrated ? "true" : "false"}'));
  assert.ok(form.includes("disabled={busy || !hydrated}"), "Submit must be disabled until JS handler is attached");
  assert.ok(canary.includes('form[data-auth-hydrated="true"]'), "Acceptance must wait for hydration before submitting a credential");
  assert.ok(form.includes('method: "POST"'), "Hydrated login must use credential-bearing POST");
  assert.ok(form.includes("event.preventDefault()"), "Hydrated handler must disable native navigation");
});
