import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Evidence Standard foundation remains available beneath Registered Evidence", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/evidence-standard.css");

  assert.match(layout, /import "\.\/evidence-standard\.css"/);
  assert.match(layout, /import "\.\/registered-evidence\.css"/);
  assert.ok(layout.indexOf("registered-evidence.css") > layout.indexOf("evidence-standard.css"));
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
});

test("public Evidence Standard accessibility refinements remain explicit", () => {
  const homeCss = read("app/evidence-standard-home.css");
  const outreachCss = read("app/outreach-site.css");

  assert.match(homeCss, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(homeCss, /backdrop-filter:\s*none/);
  assert.match(homeCss, /\.fm-honesty-state[\s\S]*font-size:\s*11px/);
  assert.match(homeCss, /\.fm-record-meta[\s\S]*font-size:\s*11px/);
  assert.match(homeCss, /\.fm-readiness-states span[\s\S]*font-size:\s*11px/);
  assert.match(homeCss, /\.xray-product-shell[\s\S]*background:\s*var\(--fm-ink\)/);
  assert.match(outreachCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(outreachCss, /min-height:\s*44px/);
});

test("public navigation is compressed around product understanding and design-partner conversion", () => {
  const shell = read("components/public-shell.tsx");
  for (const item of ["Product", "How it works", "Methodology", "Trust"]) assert.ok(shell.includes('\"' + item + '\"'));
  assert.match(shell, /Apply as Design Partner/);
  assert.match(shell, /Sign in/);
  assert.match(shell, /href="\/privacy"/);
  assert.match(shell, /href="\/subprocessors"/);
  assert.match(shell, /public-footer__utility/);
  assert.doesNotMatch(shell, />Research</);
  assert.doesNotMatch(shell, />Glossary</);
  assert.doesNotMatch(shell, />Partners</);
  assert.doesNotMatch(shell, />Request a demo</);
  assert.doesNotMatch(shell, /Source X-Ray|\/source-x-ray/);
  assert.doesNotMatch(shell, /\["\/pricing", "Pricing"\]/);
});

test("public metadata states the company-change value while preserving the evidence boundary", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /Understand why competitors are being recommended/);
  assert.match(layout, /what your company can actually change/);
  assert.match(layout, /verify what happened after the change/);
  assert.match(layout, /Recommendation intelligence software/);
  assert.doesNotMatch(layout, /guaranteed|caused the recommendation|Category Leadership OS/i);
});

test("homepage leads with the company-change outcome while commercial truth remains explicit", () => {
  const experience = read("components/goat-home-experience.tsx");
  const pricing = read("app/pricing/page.tsx");
  const primitives = read("components/evidence-standard-primitives.tsx");

  assert.match(experience, /Know what your company should change next to become the stronger recommendation\./);
  assert.match(experience, /Recommendation intelligence for B2B software/i);
  assert.match(experience, /No ranking guarantees\. No fabricated scores\. No causal claims without evidence\./);
  assert.match(experience, /Illustrative example — not customer evidence\./);
  assert.match(experience, /Company Truth/);
  assert.match(experience, /Eligibility/);
  assert.match(experience, /Change Specification/);
  assert.match(pricing, /does\s+not charge a card/i);
  assert.match(pricing, /Self-serve paid checkout is shown\s+only when billing is configured/i);
  assert.match(primitives, /NOT OBSERVED/);
  assert.match(primitives, /NOT COMPARABLE/);
  assert.match(primitives, /INSUFFICIENT EVIDENCE/);
});

test("homepage exposes one complete Recommendation Engineering decision narrative", () => {
  const experience = read("components/goat-home-experience.tsx");

  for (const stage of [
    "Buyer question",
    "Recommendation observation",
    "Evidence",
    "Company Truth",
    "Eligibility",
    "Change Specification",
    "Human approval",
    "Execution",
    "Comparable remeasurement",
    "Learning",
  ]) assert.match(experience, new RegExp(stage, "i"));

  assert.match(experience, /CONTROLLABLE/);
  assert.match(experience, /PARTIALLY ELIGIBLE/);
  assert.match(experience, /TEST FIRST/);
  assert.match(experience, /STRUCTURALLY INELIGIBLE/);
  assert.doesNotMatch(experience, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(experience, /\b\d{1,3}\s*\/\s*100\b/);
});

test("illustrative company-change and remeasurement copy preserve product truth boundaries", () => {
  const experience = read("components/goat-home-experience.tsx");

  assert.match(experience, /NEXT COMPANY CHANGE/);
  assert.match(experience, /Illustrative example — not customer evidence/);
  assert.match(experience, /publicly verifiable/);
  assert.match(experience, /Repeat the equivalent buyer-question measurement/);
  assert.match(experience, /observed before-and-after association/i);
  assert.match(experience, /without manufacturing causality/i);
  assert.doesNotMatch(experience, /leaderboard|guaranteed rank|caused the result/i);
});

test("Recommendation Record integrates evidence inspection without causal overclaim", () => {
  const record = read("app/recommendation-record/page.tsx");

  assert.match(record, /Recommendation Record/);
  assert.match(record, /Returned/);
  assert.match(record, /Retrieved/);
  assert.match(record, /Observed/);
  assert.match(record, /Reviewed/);
  assert.match(record, /Safe conclusion/);
  assert.match(record, /do not establish causal influence/i);
  assert.doesNotMatch(record, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(record, /What shaped the answer/i);
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
