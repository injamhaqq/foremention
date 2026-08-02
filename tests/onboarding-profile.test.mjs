import assert from "node:assert/strict";
import test from "node:test";
import { createManualOnboardingDraft, createOnboardingDraft, generateBuyerQuestions } from "../lib/onboarding-profile.ts";

test("website metadata creates a reviewable Foremention onboarding draft", () => {
  const draft = createOnboardingDraft({
    websiteUrl: "https://foremention.com/product",
    pageTitle: "AI Visibility and Recommendation Intelligence Platform - Foremention",
    pageDescription: "AI visibility monitoring, exact sources, competitors, and change.",
  });

  assert.equal(draft.companyName, "Foremention");
  assert.equal(draft.domain, "https://foremention.com");
  assert.equal(draft.market, "Global");
  assert.match(draft.category, /AI visibility monitoring/);
  assert.deepEqual(draft.competitors.slice(0, 4), ["Profound", "Scrunch AI", "Peec AI", "OtterlyAI"]);
  assert.equal(draft.goal, "Find credible source gaps");
  assert.equal(draft.prompts.length, 5);
  assert.match(draft.constraint, /Never invent citations/);
});

test("unknown categories fall back to an editable evidence-labelled draft", () => {
  const draft = createOnboardingDraft({
    websiteUrl: "https://acme.example/",
    pageTitle: "Acme - Workflow platform",
    pageDescription: "A flexible platform for modern teams.",
  });

  assert.equal(draft.companyName, "Acme");
  assert.equal(draft.category, "Workflow platform");
  assert.deepEqual(draft.competitors, []);
  assert.match(draft.categoryDescription, /Review this draft/);
  assert.match(draft.prompts[0], /Workflow platform/);
});

test("website text extracts visible competitors and a target market", () => {
  const draft = createOnboardingDraft({
    websiteUrl: "https://acme.example/",
    pageTitle: "Acme - CRM for modern revenue teams",
    pageDescription: "CRM software for sales teams across the United States and Canada.",
    pageText: "Compare Acme with HubSpot or alternatives to Pipedrive.",
  });
  assert.equal(draft.market, "North America");
  assert.deepEqual(draft.competitors.slice(0, 2), ["HubSpot", "Pipedrive"]);
});

test("manual onboarding fallback uses only the customer's three answers", () => {
  const draft = createManualOnboardingDraft({
    websiteUrl: "https://example-signal.com",
    whatYouSell: "Compliance monitoring software",
    whoBuys: "security teams at B2B SaaS companies",
    competitors: ["Vanta", "Drata", "Vanta"],
  });
  assert.equal(draft.companyName, "Example Signal");
  assert.equal(draft.category, "Compliance monitoring software");
  assert.deepEqual(draft.competitors, ["Vanta", "Drata"]);
  assert.equal(draft.prompts.length, 5);
  assert.match(draft.prompts[0], /security teams at B2B SaaS companies/);
  assert.doesNotMatch(JSON.stringify(draft), /Foremention|Profound|Scrunch/);
});

test("buyer questions always produce a five-question company baseline", () => {
  const questions = generateBuyerQuestions("AI visibility software", "Foremention", ["Profound"], "a growing B2B SaaS team");
  assert.equal(questions.length, 5);
  assert.match(questions[0], /AI visibility software tool is best/);
  assert.match(questions[2], /Foremention/);
  assert.match(questions[2], /Profound/);
});
