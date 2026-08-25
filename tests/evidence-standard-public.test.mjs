import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Evidence Standard tokens replace the legacy public visual grammar", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/evidence-standard.css");

  assert.match(layout, /import "\.\/evidence-standard\.css"/);
  for (const token of [
    "--fm-paper: #F7F5EF",
    "--fm-surface: #FCFBF7",
    "--fm-ink: #10110F",
    "--fm-graphite: #3F403B",
    "--fm-muted: #6E7068",
    "--fm-rule: #D8D5CC",
    "--fm-evidence: #879A4A",
    "--fm-evidence-wash: #E2E6CF",
    "--fm-evidence-deep: #4D5837",
  ]) assert.ok(css.includes(token), `missing ${token}`);

  assert.match(css, /--fm-font-display:/);
  assert.match(css, /--fm-font-sans:/);
  assert.match(css, /--fm-font-mono:/);
  assert.match(css, /\.button--ink[\s\S]*background:\s*var\(--fm-ink\)/);
  assert.doesNotMatch(css, /\.public-nav[^}]*var\(--fm-evidence\)/);
});

test("public navigation reflects the Evidence Standard information architecture", () => {
  const shell = read("components/public-shell.tsx");
  for (const item of ["Product", "Evidence", "Method", "Insights"]) assert.ok(shell.includes(`"${item}"`));
  assert.match(shell, /Sign in/);
  assert.match(shell, /Create workspace/);
  assert.doesNotMatch(shell, /\["\/pricing", "Pricing"\]/);
});

test("homepage hero and public record use the approved category and evidence language", () => {
  const experience = read("components/goat-home-experience.tsx");
  const home = read("app/page.tsx");
  const combined = `${experience}\n${home}`;

  assert.match(experience, /See what AI recommends\. Inspect the evidence behind the record\./);
  assert.match(experience, /Private beta/);
  assert.match(experience, /Creating a workspace does not charge a card/);
  assert.match(combined, /Recommendation intelligence for B2B SaaS/);
  assert.match(combined, /01 \/ QUESTION/);
  assert.match(combined, /02 \/ ANSWER/);
  assert.match(combined, /\[03\]/);
  assert.match(combined, /SOURCE \/ 03/);
  assert.match(combined, /— NOT OBSERVED/);
  assert.match(combined, /≠ NOT COMPARABLE/);
  assert.match(combined, /± INSUFFICIENT EVIDENCE/);
});

test("Source X-Ray preserves returned-source truth without causal overclaim", () => {
  const experience = read("components/goat-home-experience.tsx");
  const home = read("app/page.tsx");
  const combined = `${experience}\n${home}`;

  assert.match(experience, /id="source-xray"/);
  assert.match(experience, /id="source-xray-stage"/);
  assert.match(experience, /What evidence came with the answer\?/);
  assert.match(experience, /Returned reference/);
  assert.match(experience, /Distinct source/);
  assert.doesNotMatch(combined, /What shaped the answer/i);
});

test("semantic primitives keep evidence meaning visible without color", () => {
  const primitives = read("components/evidence-standard-primitives.tsx");
  assert.match(primitives, /export function RunningLabel/);
  assert.match(primitives, /export function EvidenceReference/);
  assert.match(primitives, /export function HonestyState/);
  assert.match(primitives, /NOT OBSERVED/);
  assert.match(primitives, /NOT COMPARABLE/);
  assert.match(primitives, /INSUFFICIENT EVIDENCE/);
});
