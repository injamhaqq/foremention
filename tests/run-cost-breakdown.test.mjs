import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("run cost breakdown uses persisted org-scoped attempt events", async () => {
  const data = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/app/runs/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(data, /ai_cost_events\?select=provider,model,input_tokens,output_tokens,total_tokens,estimated_cost_usd,cost_source/);
  assert.match(data, /organization_id=eq\.\$\{organizationId\}/);
  assert.match(page, /Per question/);
  assert.match(page, /Per citation/);
  assert.match(page, /Tokens/);
  assert.match(page, /providerCosts/);
  assert.match(page, /does not interpret missing cost as free usage/);
});
