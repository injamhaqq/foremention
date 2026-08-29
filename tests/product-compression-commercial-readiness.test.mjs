import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [navigation, retentionBridge, sitemap, pricing, contact, signup, settings, homepage] = await Promise.all([
  read("components/workspace-navigation.tsx"),
  read("components/retention-surface-bridge.tsx"),
  read("app/sitemap.ts"),
  read("app/pricing/page.tsx"),
  read("app/contact/page.tsx"),
  read("app/signup/page.tsx"),
  read("app/app/settings/page.tsx"),
  read("app/page.tsx"),
]);

function gitBlobSha(content) {
  const body = Buffer.from(content, "utf8");
  return crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest("hex");
}

test("global workspace navigation is compressed to the five canonical objects", () => {
  for (const [href, label] of [
    ["/app", "Attention"],
    ["/app/prompts", "Questions"],
    ["/app/runs", "Records"],
    ["/app/analytics", "Comparisons"],
    ["/app/settings", "Settings"],
  ]) {
    assert.match(navigation, new RegExp(`\\[\\"${href.replaceAll("/", "\\/")}\\", \\"${label}\\"\\]`));
  }
  assert.doesNotMatch(navigation, /workspaceNav|advancedNav|sidebar-advanced|Workspace tools|Advanced workspace tools/);
});

test("legacy capability routes stay available after navigation compression", () => {
  for (const path of [
    "app/app/competitors/page.tsx",
    "app/app/placements/page.tsx",
    "app/app/team/page.tsx",
    "app/app/intelligence/page.tsx",
    "app/app/evidence/page.tsx",
  ]) assert.equal(existsSync(new URL(path, root)), true, `${path} must remain available`);
  assert.match(retentionBridge, /\/app\/alerts/);
  assert.match(retentionBridge, /\/app\/placements/);
  assert.match(retentionBridge, /\/app\/competitors/);
});

test("public sitemap stays focused on canonical evergreen and trust routes", () => {
  const expected = ["", "/product", "/recommendation-intelligence", "/recommendation-record", "/methodology", "/insights", "/about", "/contact", "/privacy", "/subprocessors", "/terms"];
  for (const route of expected) assert.match(sitemap, new RegExp(`path: \\"${route.replaceAll("/", "\\/")}\\"`));
  for (const excluded of ["/pricing", "/signup", "/login", "/api-docs", "/ai-mediated-buying"]) assert.doesNotMatch(sitemap, new RegExp(`path: \\"${excluded.replaceAll("/", "\\/")}\\"`));
});

test("pricing leads with coverage value while preserving commercial truth", () => {
  assert.match(pricing, /Choose the evidence coverage your team needs\./);
  for (const plan of ["Core", "Signal", "Intelligence"]) assert.match(pricing, new RegExp(`name: \\"${plan}\\"`));
  assert.match(pricing, /founder-led design-partner pricing/i);
  assert.match(pricing, /self-serve paid checkout/i);
  assert.match(pricing, /only when billing is configured/i);
  assert.doesNotMatch(pricing, /Commercial packaging is not final yet/i);
  assert.doesNotMatch(pricing, /\$\d{2,5}/);
});

test("contact page makes the design-partner retention loop concrete", () => {
  assert.match(contact, /design partner/i);
  assert.match(contact, /5 priority buyer questions/i);
  assert.match(contact, /baseline Recommendation Record/i);
  assert.match(contact, /one owned action/i);
  assert.match(contact, /comparable remeasurement/i);
});

test("signup is conversion-ready without implying a charge", () => {
  assert.match(signup, /Design-partner \/ private-beta workspace/);
  assert.match(signup, /Creating a workspace does not charge a card\./);
});

test("Settings is the contextual home for team, integrations, enterprise access, and billing", () => {
  for (const label of ["Team", "Integrations", "Enterprise access", "Billing"]) {
    assert.match(`${settings}\n${retentionBridge}`, new RegExp(label, "i"));
  }
});

test("release does not introduce fabricated commercial, customer, compliance, or legal claims", async () => {
  const files = [pricing, contact, signup, settings, retentionBridge];
  const joined = files.join("\n");
  assert.doesNotMatch(joined, /trusted by \d+/i);
  assert.doesNotMatch(joined, /SOC 2 certified|ISO 27001 certified/i);
  assert.doesNotMatch(joined, /Foremention (Inc\.|LLC|Ltd\.|Limited)/i);
});

test("homepage remains byte-identical to the approved base release", () => {
  assert.equal(gitBlobSha(homepage), "727d3bd57d2a537c2808f2c6bdd7e9662012d10b");
});
