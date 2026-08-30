import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [bridge, navigation] = await Promise.all([
  text("components/retention-surface-bridge.tsx"),
  text("components/workspace-navigation.tsx"),
]);

test("secondary tools are collapsed instead of competing with core product content", () => {
  assert.match(bridge, /<details className="panel retention-context-tools">/);
  assert.match(bridge, /<summary>Supporting tools<\/summary>/);
});

test("question intent categories are presented as a legend, not fake controls", () => {
  assert.match(bridge, /aria-label="Question intent categories"/);
  assert.match(bridge, /className="intent-label"/);
  const questionBlock = bridge.slice(bridge.indexOf("function QuestionExtensions"), bridge.indexOf("function CompetitorExtensions"));
  assert.doesNotMatch(questionBlock, /status-chip/);
});

test("benchmark boundary explains withholding instead of looking like a broken feature", () => {
  assert.match(bridge, /data-benchmark-state="withheld"/);
  assert.match(bridge, /Benchmark held until the cohort is eligible/);
  assert.doesNotMatch(bridge, /<h2>Benchmark unavailable<\/h2>/);
});

test("mobile workspace menu closes on Escape and restores focus", () => {
  assert.match(navigation, /summaryRef/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /summaryRef\.current\?\.focus\(\)/);
  assert.match(navigation, /onKeyDown=\{handleKeyDown\}/);
});
