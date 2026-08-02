import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("ROI calculator is a customer-supplied arithmetic scenario without outcome promises", async () => {
  const [page, calculator] = await Promise.all([text("app/roi/page.tsx"), text("components/roi-calculator.tsx")]);
  assert.match(page, /path: "\/roi"/);
  assert.match(calculator, /Monthly content spend/);
  assert.match(calculator, /Current brand mention rate/);
  assert.match(calculator, /Documented category benchmark/);
  assert.match(calculator, /gap \/ current/);
  assert.match(calculator, /arithmetic, not a forecast/);
  assert.match(calculator, /does not claim that spending causes AI mentions/);
  assert.doesNotMatch(calculator, /guaranteed ROI|guaranteed improvement/i);
});
