import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(path, "utf8");

test("run approval handles empty upstream bodies and always returns a useful JSON outcome", async () => {
  const [client, route] = await Promise.all([
    text("components/run-review.tsx"),
    text("app/api/runs/[id]/review/route.ts"),
  ]);
  assert.match(client, /await response\.text\(\)/);
  assert.doesNotMatch(client, /response\.json\(\)/);
  assert.match(client, /status \$\{response\.status\}/);
  assert.match(route, /Run review could not publish the persisted Source Map/);
  assert.match(route, /Promise\.allSettled/);
  assert.match(route, /NextResponse\.json\(\{ ok: true/);
});

test("human approval reuses persisted page inspection instead of recrawling every citation", async () => {
  const source = await text("lib/source-map-generation.ts");
  assert.match(source, /loadPersistedInspections/);
  assert.match(source, /reviewStatus === "all"[\s\S]*inspectMappedSources\(run, ranked\)[\s\S]*loadPersistedInspections\(run, sourceMapId\)/);
  assert.match(source, /using the persisted bounded page inspection/);
});

test("collection setup keeps questions and providers readable at constrained widths", async () => {
  const [launcher, css] = await Promise.all([
    text("components/run-launcher.tsx"),
    text("app/globals.css"),
  ]);
  assert.match(launcher, /className="question-picker"/);
  assert.match(launcher, /className="question-picker__copy"/);
  assert.match(css, /grid-template-columns: minmax\(360px, 1\.15fr\) minmax\(360px, \.85fr\)/);
  assert.match(css, /\.question-picker label \{ display: grid; grid-template-columns: 18px minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 1050px\)[\s\S]*\.run-config-grid \{ grid-template-columns: 1fr; \}/);
});

test("first onboarding audit uses a configured provider instead of hard-coded Groq", async () => {
  const [page, wizard] = await Promise.all([
    text("app/app/onboarding/page.tsx"),
    text("components/onboarding-wizard.tsx"),
  ]);
  assert.match(page, /getProviderStatuses/);
  assert.match(page, /provider\.configured/);
  assert.match(wizard, /providers: \[firstAuditProvider\.id\]/);
  assert.match(wizard, /firstAuditProvider\?\.label/);
  assert.doesNotMatch(wizard, /providers: \["groq"\]/);
  assert.doesNotMatch(wizard, /five real Groq answers/);
});
