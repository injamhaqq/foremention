import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { extractBrandMentionContexts } from "../lib/mention-context.ts";

test("brand mention context preserves the full sentence and surrounding paragraph", () => {
  const answer = "Acme is one option. Foremention is designed for evidence review. It stores sources.\n\nAnother paragraph without the brand.";
  assert.deepEqual(extractBrandMentionContexts(answer, "Foremention"), [{ sentence: "Foremention is designed for evidence review.", paragraph: "Acme is one option. Foremention is designed for evidence review. It stores sources." }]);
  assert.deepEqual(extractBrandMentionContexts(answer, "Missing"), []);
});

test("run detail exposes only persisted answer context", async () => {
  const page = await readFile(new URL("../app/app/runs/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /extractBrandMentionContexts\(answer\.answer/);
  assert.match(page, /Sentence and surrounding paragraph are extracted verbatim/);
});
