import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("public brand surfaces publish only intentionally retained verified social destinations", async () => {
  const [shell, layout] = await Promise.all([
    text("components/public-shell.tsx"),
    text("app/layout.tsx"),
  ]);

  for (const source of [shell, layout]) {
    assert.doesNotMatch(source, /x\.com\/forementionhq/i);
    assert.doesNotMatch(source, /facebook\.com\/foremention/i);
  }

  assert.match(shell, /linkedin\.com\/company\/foremention/i);
  assert.doesNotMatch(shell, /instagram\.com\/forementionhq/i);
});

test("homepage trust links go directly to canonical methodology and Recommendation Record routes", async () => {
  const [page, experience] = await Promise.all([
    text("app/page.tsx"),
    text("components/goat-home-experience.tsx"),
  ]);
  const home = `${page}\n${experience}`;
  assert.doesNotMatch(home, /href="\/honesty"|href="\/standards"/);
  assert.match(home, /href="\/methodology"/);
  assert.match(home, /href="\/recommendation-record"/);
});

test("about page speaks to customers instead of exposing internal product-brief taxonomy", async () => {
  const about = await text("app/about/page.tsx");
  for (const internalLabel of [
    "Current operating truth",
    "Lead product",
    "Core system",
    "Primary buyer",
  ]) {
    assert.doesNotMatch(about, new RegExp(internalLabel, "i"));
  }

  assert.match(about, /recommendation intelligence/i);
  assert.match(about, /evidence/i);
});
