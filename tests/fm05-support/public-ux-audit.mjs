// Chat05 (fm-attach-v1/05-website-ux) public UX / SEO / a11y measurement harness.
//
// Not part of `pnpm test` (lives outside the tests/*.test.mjs glob). Run it
// against a locally built Worker or any base URL:
//
//   pnpm build
//   pnpm exec wrangler dev --local --config dist/server/wrangler.json --ip 127.0.0.1 --port 4173
//   PLAYWRIGHT_DIR=/path/with/playwright+@axe-core/playwright \
//     node tests/fm05-support/public-ux-audit.mjs http://127.0.0.1:4173 > fm05-audit.json
//
// Uses the same pinned tools as .github/workflows/browser-acceptance.yml
// (playwright 1.60.0, @axe-core/playwright 4.12.1). Read-only: it never
// submits a form to a non-local base URL.

import { createRequire } from "node:module";
import path from "node:path";

const base = (process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base);
const toolDir = process.env.PLAYWRIGHT_DIR || process.cwd();
const require = createRequire(path.join(toolDir, "package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");

const WIDTHS = [320, 375, 768, 1024, 1440];
const ROUTES = [
  "/", "/product", "/use-cases", "/recommendation-intelligence", "/recommendation-record", "/methodology",
  "/insights", "/glossary", "/partners", "/about", "/contact", "/trust", "/privacy", "/subprocessors", "/terms",
  "/pricing", "/sample-report", "/source-gap", "/score", "/prompt-check", "/compare", "/compare/monitoring-tools",
  "/api-docs/webhooks", "/standards", "/login", "/signup", "/forgot-password",
  "/unsubscribe?token=invalid", "/report/example.com", "/fm05-missing-page",
];
const SELECTED = process.env.FM05_ROUTES ? ROUTES.filter((r) => process.env.FM05_ROUTES.split(",").includes(r)) : ROUTES;
const AXE_WIDTHS = new Set([375, 1440]);

async function inspect(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;
    const overflowing = [];
    if (doc.scrollWidth > window.innerWidth + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed") {
          overflowing.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} right=${Math.round(r.right)}`);
          if (overflowing.length >= 5) break;
        }
      }
    }
    const small = [];
    for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!r.width || !r.height || style.visibility === "hidden") continue;
      // WCAG 2.2 SC 2.5.8 (AA) minimum 24x24; inline text links in sentences are exempt.
      const inline = el.tagName === "A" && style.display === "inline";
      if (!inline && (r.width < 24 || r.height < 24)) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return {
      status: null,
      title: document.title,
      description: meta("description"),
      robots: meta("robots"),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
      jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim().slice(0, 80)),
      lang: doc.lang || null,
      main: document.querySelectorAll("main").length,
      scrollWidth: doc.scrollWidth,
      viewport: window.innerWidth,
      horizontalOverflow: doc.scrollWidth > window.innerWidth + 1,
      overflowing,
      smallTargets: small.slice(0, 8),
      smallTargetCount: small.length,
    };
  });
}

async function keyboardProbe(page) {
  const stops = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const visible = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
      return { tag: el.tagName.toLowerCase(), text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40), focusVisible: visible };
    }));
  }
  return stops;
}

async function reducedMotionProbe(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const running = await page.evaluate(() => document.getAnimations().filter((a) => {
    const timing = a.effect?.getComputedTiming?.();
    return a.playState === "running" && timing && (timing.duration === Infinity || Number(timing.duration) > 50 || timing.iterations === Infinity);
  }).map((a) => a.animationName || a.constructor.name).slice(0, 10));
  await ctx.close();
  return running;
}

async function intakeRecovery(browser) {
  // Only against a local Worker: exercises real error/recovery UI without touching production.
  const results = {};
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  for (const [name, query] of Object.entries({
    forgedSubmitted: "?submitted=1",
    forgedSubmittedWithId: "?submitted=1&intake=b994c3c7-6190-41b7-9e0b-9826f5cc0534",
    rateLimited: "?error=rate-limit",
    failed: "?error=1",
  })) {
    await page.goto(`${base}/contact${query}`, { waitUntil: "networkidle" });
    results[`contact:${name}`] = {
      alerts: await page.locator('[role="alert"]').allTextContents(),
      successShown: await page.getByText("Application received.").count(),
    };
  }
  if (local) {
    await page.goto(`${base}/source-gap`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "qa@example.com");
    await page.fill('input[name="name"]', "QA Fixture");
    await page.fill('input[name="website"]', "https://example.com");
    await page.fill('input[name="category"]', "Fixture category");
    await page.fill('textarea[name="competitors"]', "A\nB");
    await page.fill('textarea[name="buyer_question"]', "Which fixture tool is best?");
    await page.check('input[name="consent"]');
    const responsePromise = page.waitForResponse((r) => r.url().endsWith("/api/leads/source-gap"));
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    await page.waitForTimeout(300);
    results["source-gap:submit-local"] = {
      apiStatus: response.status(),
      alerts: await page.locator('[role="alert"]').allTextContents(),
      successShown: await page.getByText("Request received").count(),
      formStillPresent: await page.locator('form.intake-form').count(),
    };
    // Exhaust the local intake rate limit, then submit through the UI: the error must be announced and the form kept.
    let lastStatus = 0;
    for (let i = 0; i < 8 && lastStatus !== 429; i += 1) {
      const r = await fetch(`${base}/api/leads/source-gap`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "qa@example.com", name: "QA", website: "https://example.com", category: "c", competitors: "a", buyer_question: "q?", consent: "yes" }) });
      lastStatus = r.status;
    }
    await page.click("text=Submit another company");
    await page.fill('input[name="email"]', "qa@example.com");
    await page.fill('input[name="name"]', "QA Fixture");
    await page.fill('input[name="website"]', "https://example.com");
    await page.fill('input[name="category"]', "Fixture category");
    await page.fill('textarea[name="competitors"]', "A\nB");
    await page.fill('textarea[name="buyer_question"]', "Which fixture tool is best?");
    await page.check('input[name="consent"]');
    const limitedPromise = page.waitForResponse((r) => r.url().endsWith("/api/leads/source-gap"));
    await page.click('button[type="submit"]');
    const limited = await limitedPromise;
    await page.waitForTimeout(300);
    results["source-gap:rate-limited-recovery"] = {
      apiStatus: limited.status(),
      alerts: await page.locator('[role="alert"]').allTextContents(),
      successShown: await page.getByText("Request received").count(),
      formStillPresent: await page.locator("form.intake-form").count(),
      emailPreserved: await page.inputValue('input[name="email"]'),
    };
  }
  await ctx.close();
  return results;
}

const browser = await chromium.launch({ headless: true });
const report = { base, generatedAt: new Date().toISOString(), widths: WIDTHS, routes: {}, reducedMotion: {}, keyboard: {}, intake: null, headers: {} };
for (const route of SELECTED) {
  report.routes[route] = {};
  const res = await fetch(`${base}${route}`, { redirect: "manual" });
  report.headers[route] = { status: res.status, xRobotsTag: res.headers.get("x-robots-tag"), location: res.headers.get("location"), cacheControl: res.headers.get("cache-control") };
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    const info = await inspect(page);
    info.status = response?.status() ?? null;
    info.finalUrl = page.url().replace(base, "");
    if (AXE_WIDTHS.has(width)) {
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      info.axe = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
    }
    if (width === 1440) report.keyboard[route] = await keyboardProbe(page);
    report.routes[route][width] = info;
    await ctx.close();
  }
  report.reducedMotion[route] = await reducedMotionProbe(browser, `${base}${route}`);
}
if (!process.env.FM05_SKIP_INTAKE) report.intake = await intakeRecovery(browser);
await browser.close();
process.stdout.write(JSON.stringify(report, null, 2));
