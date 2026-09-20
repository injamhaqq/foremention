import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("light opportunity evidence surfaces keep dark readable foregrounds", async () => {
  const css = await text("app/accessibility-hardening.css");
  assert.match(
    css,
    /\.app-frame \.opportunity-score--review > strong,[\s\S]*\.app-frame \.opportunity-evidence > span\s*\{[^}]*color:\s*#173327 !important;[^}]*\}/,
  );
});

test("horizontally scrollable question performance table is keyboard reachable", async () => {
  const page = await text("app/app/analytics/page.tsx");
  assert.match(
    page,
    /className="question-performance__table" tabIndex=\{0\} role="region" aria-label="Question performance table"/,
  );
});
