import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { extractBrandMentionContexts } from "../lib/mention-context.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("brand mention context preserves the full sentence and surrounding paragraph", () => {
  const answer = "Acme is one option. Foremention is designed for evidence review. It stores sources.\n\nAnother paragraph without the brand.";
  assert.deepEqual(extractBrandMentionContexts(answer, "Foremention"), [{ sentence: "Foremention is designed for evidence review.", paragraph: "Acme is one option. Foremention is designed for evidence review. It stores sources." }]);
  assert.deepEqual(extractBrandMentionContexts(answer, "Missing"), []);
});

test("Recommendation Record exposes only persisted answer context", async () => {
  const [page, record] = await Promise.all([
    text("app/app/runs/[id]/page.tsx"),
    text("components/recommendation-answer-record.tsx"),
  ]);
  assert.match(page, /RecommendationAnswerRecord/);
  assert.match(record, /extractBrandMentionContexts\(answer\.answer/);
  assert.match(record, /Sentence and surrounding paragraph are extracted verbatim/);
});
