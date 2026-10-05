import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const requiredPublicPages = [
  "app/page.tsx",
  "app/product/page.tsx",
  "app/methodology/page.tsx",
  "app/recommendation-record/page.tsx",
  "app/use-cases/page.tsx",
  "app/pricing/page.tsx",
  "app/insights/page.tsx",
  "app/trust/page.tsx",
  "app/contact/page.tsx",
  "app/login/page.tsx",
];

test("public website blueprint has the required page families", async () => {
  const pages = await Promise.all(requiredPublicPages.map((path) => read(path)));
  assert.equal(pages.length, requiredPublicPages.length);
});

test("public sample report demonstrates evidence rather than fake composite certainty", async () => {
  const sample = await read("app/sample-report/page.tsx");
  assert.match(sample, /Recommendation Record/);
  assert.match(sample, /Evidence review/);
  assert.match(sample, /Change Specification/);
  assert.match(sample, /not proof of a customer outcome/i);
  assert.doesNotMatch(sample, /Readiness score/i);
  assert.doesNotMatch(sample, /recommendation share/i);
  assert.doesNotMatch(sample, /first-mention share/i);
  assert.doesNotMatch(sample, /31%|12%|62\/100/);
});

test("public discovery surfaces expose use cases consistently", async () => {
  const [sitemap, markdownSitemap, llms, llmsFull, useCases] = await Promise.all([
    read("app/sitemap.ts"),
    read("public/sitemap.md"),
    read("public/llms.txt"),
    read("public/llms-full.txt"),
    read("public/use-cases.md"),
  ]);

  for (const surface of [sitemap, markdownSitemap, llms, llmsFull]) {
    assert.match(surface, /use-cases/i);
  }
  assert.match(useCases, /Recommendation Intelligence use cases/);
  assert.match(useCases, /Cloudflare Workers AI/);
  assert.match(useCases, /not direct monitoring of ChatGPT, Gemini, or Perplexity consumer applications/i);
});

test("homepage proof and FAQ keep public claims inside verified boundaries", async () => {
  const home = await read("components/goat-home-experience.tsx");
  assert.match(home, /PROOF WITHOUT PLACEHOLDERS/);
  assert.match(home, /Customer proof waits for customer proof/);
  assert.match(home, /Does Foremention guarantee that my brand will be recommended/);
  assert.match(home, /Does opening the homepage run paid AI research/);
  assert.match(home, /validated, rate-limited, persisted server-side/);
});


test("public engagement analytics measure the blueprint events without collecting intake content", async () => {
  const [analytics, home] = await Promise.all([
    read("components/public-activation-analytics.tsx"),
    read("components/goat-home-experience.tsx"),
  ]);
  assert.match(analytics, /sample_opened/);
  assert.match(analytics, /evidence_inspected/);
  assert.match(analytics, /use_cases/);
  assert.match(home, /data-public-sample-open/);
  assert.match(home, /data-public-evidence-inspect/);
  assert.doesNotMatch(analytics, /buyerQuestions|currentProblem|intakeId/);
});

test("sitemap freshness only advances routes changed by the public website slice", async () => {
  const sitemap = await read("app/sitemap.ts");
  assert.match(sitemap, /baselineUpdated/);
  assert.match(sitemap, /websiteUpdatedPaths/);
  assert.match(sitemap, /"\/use-cases"/);
  assert.match(sitemap, /"\/contact"/);
  assert.doesNotMatch(sitemap, /lastModified:\s*websiteUpdated,/);
});
