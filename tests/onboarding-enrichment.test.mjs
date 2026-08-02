import test from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingEnrichmentPrompt, mergeOnboardingEnrichment, parseOnboardingEnrichment } from "../lib/onboarding-enrichment.ts";

test("web-assisted onboarding accepts validated JSON and removes placeholders", () => {
  const parsed = parseOnboardingEnrichment(`\n\`\`\`json\n{"companyName":"Loro Piana","category":"Luxury fashion and cashmere","categoryDescription":"Luxury apparel and accessories for global consumers.","market":"Global","audience":"luxury fashion buyers","competitors":["Brunello Cucinelli","Zegna","Competitor one","Hermes","Zegna"]}\n\`\`\``);
  assert.deepEqual(parsed, {
    companyName: "Loro Piana",
    category: "Luxury fashion and cashmere",
    categoryDescription: "Luxury apparel and accessories for global consumers.",
    market: "Global",
    audience: "luxury fashion buyers",
    competitors: ["Brunello Cucinelli", "Zegna", "Hermes"],
  });
});

test("web-assisted onboarding merges real suggestions and regenerates buyer questions", () => {
  const merged = mergeOnboardingEnrichment({
    companyName: "Loro Piana",
    domain: "https://loropiana.com",
    market: "Global",
    category: "B2B software",
    categoryDescription: "Review this draft.",
    competitors: [],
    goal: "Find credible source gaps",
    constraint: "Use reviewed evidence.",
    prompts: [],
  }, {
    category: "Luxury fashion and cashmere",
    categoryDescription: "Luxury apparel and accessories for global consumers.",
    audience: "luxury fashion buyers",
    competitors: ["Brunello Cucinelli", "Zegna", "Loro Piana"],
  });
  assert.deepEqual(merged.competitors, ["Brunello Cucinelli", "Zegna"]);
  assert.equal(merged.prompts.length, 5);
  assert.match(merged.prompts[0], /Luxury fashion and cashmere/);
});

test("web-assisted onboarding can profile a reachable site that blocks direct reading", () => {
  const prompt = buildOnboardingEnrichmentPrompt({ websiteUrl: "https://www.zara.com" });
  assert.match(prompt, /Website: https:\/\/www\.zara\.com/);
  assert.match(prompt, /Direct page content was unavailable/);
  assert.match(prompt, /Use web search for the exact website/);
});
