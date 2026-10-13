import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { contactIntakeLookupId, contactIntakeNotice, sourceGapClientOutcome, sourceGapReceiptFromRows } from "../lib/public-intake-state.ts";

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

test("A01: contact page derives its notice from a server receipt lookup, never from the query flag", async () => {
  const contact = await read("app/contact/page.tsx");
  const receipt = await read("lib/design-partner-receipt.ts");
  const handler = await read("app/api/design-partner/route.ts");
  assert.match(contact, /await hasPersistedDesignPartnerReceipt\(intakeId\)/);
  assert.match(contact, /const notice = contactIntakeNotice\(query, receiptVerified\)/);
  assert.match(contact, /const submitted = notice === "saved"/);
  assert.match(contact, /Too many recent applications/);
  assert.match(contact, /We could not verify a saved application/);
  assert.match(receipt, /serviceRole: true/);
  assert.match(handler, /if \(claim === "duplicate"\) return responseFor\(request, 201, "Application received\."\)/);
});

const RECEIPT = "b994c3c7-6190-41b7-9e0b-9826f5cc0534";

test("A01 behaviour: contact intake notice matrix", () => {
  // Forged success flag without a receipt id.
  assert.equal(contactIntakeNotice({ submitted: "1" }, false), "unverified-no-reference");
  // Duplicate claim / honeypot path: 201 redirect without an intake id.
  assert.equal(contactIntakeNotice({ submitted: "1", intake: "" }, false), "unverified-no-reference");
  // Well-formed but unknown id: lookup failed.
  assert.equal(contactIntakeNotice({ submitted: "1", intake: RECEIPT }, false), "unverified-reference");
  // A caller-supplied "verified" flag is ignored when no valid id was looked up.
  assert.equal(contactIntakeNotice({ submitted: "1", intake: "not-a-uuid" }, true), "unverified-no-reference");
  assert.equal(contactIntakeNotice({ intake: RECEIPT }, true), "none");
  // Genuine persisted receipt.
  assert.equal(contactIntakeNotice({ submitted: "1", intake: RECEIPT }, true), "saved");
  // Errors never render as success; the rate limit is reported as such.
  assert.equal(contactIntakeNotice({ error: "rate-limit" }, false), "rate-limited");
  assert.equal(contactIntakeNotice({ error: "1" }, false), "failed");
  assert.equal(contactIntakeNotice({}, false), "none");
  assert.equal(contactIntakeLookupId({ submitted: "1", intake: RECEIPT.toUpperCase() }), RECEIPT.toUpperCase());
  assert.equal(contactIntakeLookupId({ submitted: "0", intake: RECEIPT }), "");
});

test("A01 behaviour: source-gap success requires an explicit stored receipt", () => {
  assert.equal(sourceGapReceiptFromRows([{ id: RECEIPT }]), RECEIPT);
  for (const bad of [undefined, null, [], [{}], [{ id: "1" }], [{ id: RECEIPT }, { id: RECEIPT }], { id: RECEIPT }]) {
    assert.equal(sourceGapReceiptFromRows(bad), null, JSON.stringify(bad));
  }
  const saved = sourceGapClientOutcome(201, { received: true, reference: RECEIPT, message: "Saved." });
  assert.deepEqual(saved, { saved: true, reference: RECEIPT, message: "Saved." });
  // The old validation-only/demo answer ({ ok: true }, 202) is not a saved request.
  assert.equal(sourceGapClientOutcome(202, { ok: true, message: "Demo mode is active" }).saved, false);
  assert.equal(sourceGapClientOutcome(201, { received: true }).saved, false);
  assert.equal(sourceGapClientOutcome(201, { received: "true", reference: RECEIPT }).saved, false);
  assert.equal(sourceGapClientOutcome(500, { received: true, reference: RECEIPT }).saved, false);
  assert.equal(sourceGapClientOutcome(200, null).saved, false);
  assert.match(sourceGapClientOutcome(429, { error: "x" }).message, /Too many recent requests/);
  assert.equal(sourceGapClientOutcome(503, { error: "Requests are temporarily unavailable." }).message, "Requests are temporarily unavailable.");
  assert.match(sourceGapClientOutcome(502, null).message, /could not confirm that your request was saved/);
});

test("A01: source-gap route never reports receipt without storage and the form gates success on the receipt", async () => {
  const route = await read("app/api/leads/source-gap/route.ts");
  const form = await read("components/source-gap-form.tsx");
  assert.doesNotMatch(route, /Demo mode is active/);
  assert.doesNotMatch(route, /return=minimal/);
  assert.match(route, /if \(!supabaseConfigured\(\)\) return NextResponse\.json\(\{ error: UNAVAILABLE \}, \{ status: 503 \}\)/);
  assert.match(route, /prefer: "return=representation"/);
  assert.match(route, /const reference = sourceGapReceiptFromRows\(rows\)/);
  assert.match(route, /if \(!reference\) return NextResponse\.json\(\{ error: UNAVAILABLE \}, \{ status: 503 \}\)/);
  assert.match(form, /const outcome = sourceGapClientOutcome\(response\.status, data\)/);
  assert.match(form, /if \(!outcome\.saved\) throw new Error\(outcome\.message\)/);
  assert.doesNotMatch(form, /if \(!response\.ok\)/);
  assert.match(form, /Request reference:/);
});

test("A19: free source-gap check promises a supported gap or an explanation, not a guaranteed gap", async () => {
  const page = await read("app/source-gap/page.tsx");
  assert.doesNotMatch(page, /show one useful source gap/);
  assert.doesNotMatch(page, /help support that answer/);
  assert.match(page, /We’ll review the public evidence for one buyer question and report any supported gap—or explain why none can be established\./);
  assert.match(page, /Neither shows which pages caused the answer\./);
  assert.match(page, /monitoring of consumer ChatGPT, Gemini or Perplexity apps/);
});

test("A19: approved homepage hero promise and lead are preserved (locked identity)", async () => {
  const home = await read("components/goat-home-experience.tsx");
  assert.match(home, /See where AI recommends your brand\./);
  assert.match(home, /Track recommendations, inspect supporting sources, and decide what to improve\./);
  assert.match(home, /not direct ChatGPT, Gemini, or Perplexity application monitoring/);
});

test("A21: token lifecycle, unavailable report and not-found pages are explicitly noindex", async () => {
  const unsubscribe = await read("app/unsubscribe/page.tsx");
  const invite = await read("app/invite/[token]/page.tsx");
  const share = await read("app/share/record/[token]/page.tsx");
  const report = await read("app/report/[domain]/page.tsx");
  const notFound = await read("app/not-found.tsx");
  for (const [name, source] of [["unsubscribe", unsubscribe], ["invite", invite], ["share", share]]) {
    assert.match(source, /robots: \{ index: false, follow: false, nocache: true \}/, name);
    assert.match(source, /referrer: "no-referrer"/, name);
  }
  assert.match(report, /noIndex: !report\.available/);
  assert.match(report, /const loadReport = cache\(loadPublicVisibilityReport\)/);
  assert.match(notFound, /robots: \{ index: false, follow: false \}/);
  const pricing = await read("app/pricing/page.tsx");
  assert.match(pricing, /noIndex: true/, "pricing stays noindex until the commercial truth gate");
  const sitemap = await read("app/sitemap.ts");
  for (const privatePath of ["/pricing", "/pay", "/unsubscribe", "/invite", "/share", "/report/", "/app"]) {
    assert.doesNotMatch(sitemap, new RegExp(`["'\`]${privatePath.replace(/\//g, "\\/")}["'\`/]`), `sitemap must not list ${privatePath}`);
  }
});
