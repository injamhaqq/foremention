// Chat04 A26 wiring contract (source-level). Behaviour of the pure helper is
// covered in attach-v1-04-customer-value-journeys.test.mjs. This is not a
// browser receipt for a real account without an organization.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("A26: support API marks missing workspace with an explicit setup code and keeps auth/origin checks", async () => {
  const route = await read("app/api/support/tickets/route.ts");
  assert.match(route, /code: WORKSPACE_SETUP_REQUIRED_CODE/);
  assert.match(route, /status: 401/);
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /requester_id=eq\./, "history stays requester-scoped");
});

test("A26: support page resolves setup state server-side and never treats lookup failure as no workspace", async () => {
  const page = await read("app/app/support/page.tsx");
  assert.match(page, /resolveWorkspaceSetupState\(/);
  assert.match(page, /catch \{\s*hasWorkspace = true;/);
  assert.match(page, /setupState=\{setupState\}/);
});

test("A26: setup-required support view has no submit control, keeps account help and a setup CTA", async () => {
  const ui = await read("components/support-center.tsx");
  const start = ui.indexOf("if (setupRequired && !demo)");
  assert.ok(start > 0);
  const block = ui.slice(start, ui.indexOf("return <div className=\"settings-grid\">", start + 40));
  assert.doesNotMatch(block, /type="submit"|<form/);
  assert.match(block, /href=\{helpHref\}/);
  assert.match(block, /Continue workspace setup/);
  assert.match(ui, /isWorkspaceSetupRequiredPayload\(payload\)/);
  assert.match(ui, /if \(demo \|\| setupState\?\.kind === "setup_required"\) return;/, "no history fetch (no duplicate alerts) before setup");
});
