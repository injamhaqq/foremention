// Claims track: one offer everywhere. Every surface that states a price, trial
// or guarantee must agree with lib/public-offer.ts, which reads the capacities
// and trial length from lib/product-limits.ts.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CORE_TRIAL_DAYS, FOUNDATION_ACCESS_DEFAULTS, PACKAGE_CAPACITY } from "../lib/product-limits.ts";
import { CHECKOUT_TERMS_LINE, CORE_TRIAL, MONEY_BACK_DAYS, OFFER_SUMMARY, PILOT_CTA_LABEL, PUBLIC_PLANS } from "../lib/public-offer.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("the offer module uses existing prices and capacities only", () => {
  assert.equal(PUBLIC_PLANS.core.price, "$99 / month");
  assert.equal(PUBLIC_PLANS.signal.price, "$299 / month");
  assert.equal(PUBLIC_PLANS.intelligence.price, "Custom");
  assert.equal(PUBLIC_PLANS.core.buyerQuestions, PACKAGE_CAPACITY.core.buyerQuestions);
  assert.equal(PUBLIC_PLANS.signal.buyerQuestions, PACKAGE_CAPACITY.signal.buyerQuestions);
  assert.equal(PUBLIC_PLANS.signal.brands, PACKAGE_CAPACITY.signal.brands);
  assert.equal(PUBLIC_PLANS.free.buyerQuestions, FOUNDATION_ACCESS_DEFAULTS.buyerQuestions);
  assert.equal(PUBLIC_PLANS.free.answersPerMonth, FOUNDATION_ACCESS_DEFAULTS.runUnitsPerMonth);
  assert.equal(CORE_TRIAL.days, CORE_TRIAL_DAYS);
  assert.equal(MONEY_BACK_DAYS, 7);
  assert.equal(PILOT_CTA_LABEL, "Request a pilot");
});

test("offer summary and checkout line state the same prices, trial and guarantee", () => {
  for (const line of [OFFER_SUMMARY, CHECKOUT_TERMS_LINE]) {
    assert.match(line, /\$99/);
    assert.match(line, /\$299/);
    assert.match(line, /7-day money-back guarantee/);
    assert.doesNotMatch(line, /\$149|\$499|14-day|annual price/i);
  }
  assert.match(OFFER_SUMMARY, /7-day Core trial, no card required/);
  assert.match(OFFER_SUMMARY, /free plan \(5 buyer questions\)/);
  assert.match(CHECKOUT_TERMS_LINE, /Paddle, our merchant of record/);
});

test("pricing page literals match the offer module", async () => {
  const pricing = await text("app/pricing/page.tsx");
  assert.ok(pricing.includes(`price: "${PUBLIC_PLANS.core.price}"`));
  assert.ok(pricing.includes(`price: "${PUBLIC_PLANS.signal.price}"`));
  assert.match(pricing, /Foremention Core \(\$99\/month\) and Signal \(\$299\/month\)/);
  assert.match(pricing, new RegExp(`free plan \\(${PUBLIC_PLANS.free.buyerQuestions} buyer questions, ${PUBLIC_PLANS.free.answersPerMonth} answers a month\\)`));
  assert.ok(pricing.includes(`"${PUBLIC_PLANS.core.cadence}"`), "Core cadence item matches the offer module");
  assert.ok(pricing.includes(`"${PUBLIC_PLANS.signal.cadence}"`), "Signal cadence item matches the offer module");
});

test("pricing page is clearer: comparison table, billing FAQ, and pilot route built from the offer", async () => {
  const pricing = await text("app/pricing/page.tsx");
  assert.match(pricing, /from "@\/lib\/public-offer"/);
  assert.match(pricing, /<table className="claims-compare-table">/);
  for (const row of ["Price", "Approved buyer questions", "Brands", "Re-measurement", "Free trial"]) {
    assert.match(pricing, new RegExp(`\\["${row}"`));
  }
  assert.match(pricing, /PUBLIC_PLANS\.free\.price, PUBLIC_PLANS\.core\.price, PUBLIC_PLANS\.signal\.price/);
  for (const question of ["What happens when the Core trial ends?", "Who bills me?", "Can I get my money back?", "How do I cancel?"]) {
    assert.ok(pricing.includes(question), question);
  }
  assert.match(pricing, /\{PILOT_CTA_LABEL\}/);
  assert.match(pricing, /scope="col"/);
  assert.match(pricing, /role="region"/);
});

test("homepage, product, contact and checkout surfaces use the same offer and CTA label", async () => {
  const [home, product, contact, billing, pay] = await Promise.all([
    text("components/goat-home-experience.tsx"),
    text("app/product/page.tsx"),
    text("app/contact/page.tsx"),
    text("components/billing-control.tsx"),
    text("app/pay/page.tsx"),
  ]);
  assert.match(home, /What does Foremention cost\?/);
  assert.match(home, /\{OFFER_SUMMARY\}/);
  assert.match(home, /href="\/pricing"/);
  assert.match(product, /\{OFFER_SUMMARY\}/);
  assert.match(product, /\{PILOT_CTA_LABEL\}/);
  assert.doesNotMatch(product, /Apply as Design Partner/);
  assert.match(contact, /\{PILOT_CTA_LABEL\}/);
  assert.doesNotMatch(contact, /Apply as Design Partner/);
  assert.match(billing, /\{CHECKOUT_TERMS_LINE\}/);
  // Client component: must import the env-free price module, not product-limits.
  assert.match(billing, /from "@\/lib\/public-offer-prices"/);
  const prices = await text("lib/public-offer-prices.ts");
  assert.doesNotMatch(prices, /^import |process\.env/m);
  assert.match(pay, /PUBLIC_PLANS\.core\.price/);
  assert.match(pay, /7-day money-back guarantee/);
});

test("Terms, refund policy and llms-full state the same trial and guarantee", async () => {
  const [terms, refund, full] = await Promise.all([text("app/terms/page.tsx"), text("app/refund-policy/page.tsx"), text("public/llms-full.txt")]);
  for (const [name, source] of [["terms", terms], ["refund", refund]]) {
    assert.match(source, /7-day money-back guarantee/, name);
    assert.match(source, /once per company/i, name);
  }
  assert.match(terms, /\{CORE_TRIAL\.days\}-day Core trial without a card/);
  assert.match(full, /Core: \$99 per month, up to 25 buyer questions/);
  assert.match(full, /Signal: \$299 per month, up to 100 buyer questions and three brands/);
  assert.match(full, /7-day free trial that needs no card/);
  assert.match(full, /7-day money-back guarantee, once per company/);
});
