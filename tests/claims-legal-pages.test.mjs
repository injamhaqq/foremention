// Claims track (FM-03): legal pages name the seller from one placeholder
// module, state Paddle as merchant of record, list Brave and Zoho, and link a DPA.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  GOVERNING_LAW,
  LEGAL_ENTITY_ADDRESS,
  LEGAL_ENTITY_NAME,
  isLegalPlaceholder,
  legalEntityComplete,
  legalValue,
  sellerSentence,
} from "../lib/legal-entity.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("seller details are placeholders in one module and render as visible gaps, never as invented facts", () => {
  for (const value of [LEGAL_ENTITY_NAME, LEGAL_ENTITY_ADDRESS, GOVERNING_LAW]) {
    assert.equal(isLegalPlaceholder(value), true, "replace in lib/legal-entity.ts once Injam supplies it");
    assert.match(legalValue(value), /^\[.+ to be confirmed\]$/);
  }
  assert.equal(legalEntityComplete(), false);
  assert.equal(legalValue("Example Ltd"), "Example Ltd");
  assert.match(sellerSentence(), /^Foremention is operated by \[registered legal entity name to be confirmed\], \[registered business address to be confirmed\]/);
});

test("no legal page hard-codes an entity, address or governing law outside lib/legal-entity.ts", async () => {
  for (const path of ["app/terms/page.tsx", "app/privacy/page.tsx", "app/refund-policy/page.tsx", "app/dpa/page.tsx"]) {
    const source = await text(path);
    assert.match(source, /from "@\/lib\/legal-entity"/, path);
    assert.match(source, /sellerSentence\(\)/, path);
    assert.doesNotMatch(source, /Vorakin|\b(?:Ltd|LLC|Limited|Inc\.)\b/, path);
  }
});

test("Terms name the seller, Paddle as merchant of record, governing law and the DPA", async () => {
  const terms = await text("app/terms/page.tsx");
  assert.match(terms, /<h2>Who we are<\/h2>/);
  assert.match(terms, /Online orders are sold by Paddle\.com, which is the merchant of record and reseller/);
  assert.match(terms, /Paddle, which is the Merchant of Record/);
  assert.match(terms, /<h2>Governing law<\/h2>[\s\S]*legalValue\(GOVERNING_LAW\)/);
  assert.match(terms, /href="\/dpa"/);
  assert.doesNotMatch(terms, /Additional legal-entity, tax, or jurisdiction details may be stated in the applicable order form/);
});

test("Privacy and refund policy name the seller and Paddle; privacy covers Brave queries and Zoho mail", async () => {
  const privacy = await text("app/privacy/page.tsx");
  assert.match(privacy, /<h2>Who is responsible<\/h2>/);
  assert.match(privacy, /Brave Search API, our one retrieval provider/);
  assert.match(privacy, /hosted by Zoho Mail/);
  assert.match(privacy, /Paddle\.com, our merchant of record/);
  assert.match(privacy, /<Link href="\/dpa">Data Processing Addendum<\/Link>/);
  const refund = await text("app/refund-policy/page.tsx");
  assert.match(refund, /<h2>Who sells the subscription<\/h2>/);
  assert.match(refund, /sold by Paddle\.com as merchant of record and reseller/);
});

test("the DPA page exists, is indexable, and covers the core processor terms", async () => {
  const dpa = await text("app/dpa/page.tsx");
  assert.match(dpa, /path: "\/dpa"/);
  assert.doesNotMatch(dpa, /noIndex: true/);
  for (const heading of ["Roles", "Scope of processing", "Our obligations", "Subprocessors", "International transfers", "Personal-data breaches", "Audits and information", "Deletion and return", "Liability and governing law"]) {
    assert.match(dpa, new RegExp(`<h2>\\d+\\. ${heading}</h2>`), heading);
  }
  assert.match(dpa, /you are the controller and we are your processor/);
  assert.match(dpa, /Brave Search, Zoho Mail/);
  assert.match(dpa, /legalValue\(GOVERNING_LAW\)/);
  // No promise the code base cannot back (certifications, fixed-hour breach SLAs, signed SCCs).
  assert.doesNotMatch(dpa, /SOC ?2|ISO ?27001|within \d+ hours|have signed/i);
});

test("subprocessors, footer, sitemap and llms.txt link the DPA", async () => {
  const [subs, shell, sitemap, llms] = await Promise.all([
    text("app/subprocessors/page.tsx"), text("components/public-shell.tsx"), text("app/sitemap.ts"), text("public/llms.txt"),
  ]);
  assert.match(subs, /href="\/dpa"/);
  assert.match(shell, /<Link href="\/dpa">DPA<\/Link>/);
  assert.match(sitemap, /path: "\/dpa"/);
  assert.match(llms, /https:\/\/foremention\.com\/dpa/);
  assert.ok((await stat(new URL("app/dpa/page.tsx", root))).size > 0);
});
