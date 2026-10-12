import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function luminance(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map((part) => {
    const value = Number.parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("A25: reviewed onboarding palette repairs are scoped and meet WCAG AA contrast on dark surfaces", async () => {
  const css = await read("app/public-contrast-repair.css");
  const canonical = await read("app/canonical-system.css");
  const token = (name) => {
    const match = canonical.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `missing ${name}`);
    return match[1];
  };
  const background = token("fm-surface");
  for (const foreground of ["fm-fg", "fm-fg-soft", "fm-muted", "fm-signal-light"]) {
    assert.ok(contrast(token(foreground), background) >= 4.5, foreground);
  }
  assert.ok(contrast(token("fm-bg"), background) < 1.2, "legacy ink on dark must fail");

  assert.match(css, /FM-05 \/ A25/);
  assert.match(css, /\.app-frame \.workspace--evidence-onboarding \.onboarding-wizard > ol li\.is-active\s*\{\s*color: var\(--fm-clean\);/);
  assert.match(css, /\.app-frame \.workspace--evidence-onboarding \.onboarding-wizard \.onboarding-review > div\s*\{/);
  assert.match(css, /\.app-frame \.workspace--evidence-onboarding \.onboarding-wizard input:not\(\[type="checkbox"\]\)/);
  assert.match(css, /background: #fff;\s*color: var\(--fm-bg\)/);
  assert.match(css, /font-size: 12px;/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("A19/CV-11 presentation: public comparisons separate references, retrieval and causation", async () => {
  const page = await read("app/compare/[competitor]/page.tsx");
  assert.doesNotMatch(page, /outside pages that shaped the answer|what shaped it/i);
  assert.match(page, /returned references when available/);
  assert.match(page, /separately retrieved pages and human review/);
  assert.match(page, /Neither a returned reference nor a retrieved page proves what caused the recommendation/);
  assert.match(page, /Mere co-occurrence does not establish an effect/);
});

test("A21: webhook documentation exposes canonical route metadata and public navigation", async () => {
  const page = await read("app/api-docs/webhooks/page.tsx");
  assert.match(page, /export const metadata: Metadata = pageMetadata\(/);
  assert.match(page, /path: "\/api-docs\/webhooks"/);
  assert.match(page, /<PublicShell><main className="legal-page">/);
  assert.match(page, /<\/main><\/PublicShell>/);
  assert.match(page, /When a workspace webhook is configured and enabled/);
});

test("A01: intake status UI does not equate query-string flag or duplicate claim with a verified receipt", async () => {
  const contact = await read("app/contact/page.tsx");
  const receipt = await read("lib/design-partner-receipt.ts");
  const handler = await read("app/api/design-partner/route.ts");
  assert.match(contact, /await hasPersistedDesignPartnerReceipt\(intakeId\)/);
  assert.match(contact, /query\.submitted === "1" && !submitted/);
  assert.match(contact, /cannot confirm a new saved record/);
  assert.match(contact, /rateLimited && <p className="inline-error" role="alert">Too many recent applications/);
  assert.match(receipt, /serviceRole: true/);
  assert.match(handler, /if \(claim === "duplicate"\) return responseFor\(request, 201, "Application received\."\)/);
});
