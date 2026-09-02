import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public navigation is focused on product understanding and design-partner conversion", async () => {
  const shell = await read("components/public-shell.tsx");

  for (const label of ["Product", "How it works", "Methodology", "Trust", "Sign in", "Apply as Design Partner"]) {
    assert.match(shell, new RegExp(label));
  }

  assert.doesNotMatch(shell, />Research</);
  assert.doesNotMatch(shell, />Glossary</);
  assert.doesNotMatch(shell, />Partners</);
  assert.doesNotMatch(shell, />Category</);
  assert.doesNotMatch(shell, />Request a demo</);
  assert.doesNotMatch(shell, />Design-partner workspace</);
  assert.match(shell, /public-footer__utility/);
  assert.match(shell, /Subprocessors/);
  assert.match(shell, /Analytics settings/);
});

test("homepage leads with the company-change outcome and shows the complete decision workflow", async () => {
  const [page, home] = await Promise.all([
    read("app/page.tsx"),
    read("components/goat-home-experience.tsx"),
  ]);

  assert.match(home, /Know what your company should change next to become the stronger recommendation\./);
  assert.match(home, /Apply as a Design Partner/);
  assert.match(home, /See how it works/);
  assert.match(home, /Why are competitors being recommended/);
  assert.match(home, /Buyer question/);
  assert.match(home, /Recommendation observation/);
  assert.match(home, /Company Truth/);
  assert.match(home, /Eligibility/);
  assert.match(home, /Change Specification/);
  assert.match(home, /Human approval/);
  assert.match(home, /Comparable remeasurement/);
  assert.match(home, /NEXT COMPANY CHANGE/);
  assert.match(home, /CONTROLLABLE/);
  assert.match(home, /PARTIALLY ELIGIBLE/);
  assert.match(home, /TEST FIRST/);
  assert.match(home, /Illustrative example — not customer evidence/);
  assert.match(home, /Sometimes the right answer is: do not do it\./);
  assert.match(home, /Become a Foremention Design Partner/);
  assert.match(home, /Bring 5 important buyer questions/);
  assert.match(page, /what your company should change next/i);
});

test("product page explains Recommendation Engineering value without changing the public category claim", async () => {
  const product = await read("app/product/page.tsx");

  assert.match(product, /Recommendation Intelligence/);
  assert.match(product, /what your company should change next/i);
  assert.match(product, /Company Truth/);
  assert.match(product, /Eligibility/);
  assert.match(product, /Change Specification/);
  assert.match(product, /Execution/);
  assert.match(product, /Verification/);
  assert.match(product, /No ranking guarantees/);
  assert.doesNotMatch(product, /Category Leadership OS/);
});

test("design-partner conversion is the primary contact flow and is measured without form-value capture", async () => {
  const [contact, analytics, contract] = await Promise.all([
    read("app/contact/page.tsx"),
    read("components/public-activation-analytics.tsx"),
    read("lib/product-analytics-contract.ts"),
  ]);

  assert.match(contact, /Apply as a Design Partner/);
  assert.match(contact, /Bring 5 priority buyer questions/);
  assert.match(contact, /comparable remeasurement/);
  assert.match(analytics, /design_partner_page_viewed/);
  assert.match(analytics, /design_partner_application_started/);
  assert.match(analytics, /design_partner_application_submitted/);
  assert.match(analytics, /design_partner_cta_clicked/);
  assert.match(contract, /design_partner_page_viewed/);
  assert.match(contract, /design_partner_application_started/);
  assert.match(contract, /design_partner_application_submitted/);
  assert.match(contract, /case "design_partner_cta_clicked":\s*addEnum\(properties, "surface"/);
  assert.doesNotMatch(analytics, /FormData|\.elements\b|\[name=|\.value\b/);
  assert.doesNotMatch(contract, /case "design_partner_page_viewed":[\s\S]{0,160}add(?:Enum|Boolean|CountBucket)/);
  assert.doesNotMatch(contract, /case "design_partner_application_started":[\s\S]{0,160}add(?:Enum|Boolean|CountBucket)/);
  assert.doesNotMatch(contract, /case "design_partner_application_submitted":[\s\S]{0,160}add(?:Enum|Boolean|CountBucket)/);
});

test("outreach presentation layer is loaded last and contains mobile footer compression", async () => {
  const [layout, css] = await Promise.all([
    read("app/layout.tsx"),
    read("app/outreach-site.css"),
  ]);

  assert.match(layout, /import "\.\/outreach-site\.css";/);
  assert.ok(layout.indexOf('import "./outreach-site.css";') > layout.indexOf('import "./canonical-responsive-hardening.css";'));
  assert.match(css, /\.outreach-hero/);
  assert.match(css, /\.outreach-workflow/);
  assert.match(css, /\.outreach-change/);
  assert.match(css, /\.canonical-public-footer/);
  assert.match(css, /@media \(max-width: 720px\)/);
});
