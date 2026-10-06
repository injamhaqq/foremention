#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// This test enters the existing fictional demo. Never target a live service.
const base = new URL(process.env.FOREMENTION_BROWSER_BASE_URL || "http://127.0.0.1:4173");
assert.equal(base.protocol, "http:");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Demo acceptance requires a local Worker");
const requireTools = createRequire(new URL("../.ci-tools/package.json", import.meta.url));
const { chromium } = requireTools("playwright");
const axeModule = requireTools("@axe-core/playwright");
const AxeBuilder = axeModule.default || axeModule.AxeBuilder || axeModule;
const output = resolve("browser-acceptance/demo-baseline");
await mkdir(output, { recursive: true });
const summary = { base: base.origin, scope: "Fictional demo presentation only; no provider collection or customer outcome proof", profiles: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 375, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    let attentionRequests = 0;
    let attentionMode = "unavailable";
    const stalledRequests = new Set();
    const releaseStalledRequests = () => { for (const release of stalledRequests) release(); stalledRequests.clear(); };
    const network = [];
    const noteNetwork = (request, state, status) => {
      const url = new URL(request.url());
      // Local fictional fixture diagnostics: paths/status only, no headers,
      // cookies, query strings, request bodies or recorded answer contents.
      if (url.origin !== base.origin || !(url.pathname === "/api/retention/attention" || /\.(?:js|css)$/.test(url.pathname))) return;
      network.push({ path: url.pathname, state, ...(status === undefined ? {} : { status }) });
      if (network.length > 80) network.shift();
    };
    page.on("request", (request) => noteNetwork(request, "started"));
    page.on("response", (response) => noteNetwork(response.request(), "response", response.status()));
    page.on("requestfailed", (request) => noteNetwork(request, "failed"));
    page.on("pageerror", (error) => errors.push(error.message));
    // Reject unexpected mutations. Only the existing local demo sign-in is allowed.
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !(url.origin === base.origin && url.pathname === "/api/auth/demo" && request.method() === "POST")) {
        errors.push(`Unexpected mutation: ${request.method()} ${url.pathname}`);
        await route.abort();
      } else await route.continue();
    });
    try {
      await page.goto(new URL("/login", base).href);
      await page.getByRole("button", { name: "Explore the fictional workspace" }).click();
      await page.waitForURL(`${base.origin}/app`);
      await page.locator(".workspace-heading").getByText(/fictional sample observations/).waitFor();
      const primary = page.locator(".workspace-heading").getByRole("link", { name: "Review buyer questions" });
      assert.equal(await primary.getAttribute("href"), "/app/prompts");
      const questionStep = page.locator(".getting-started li").filter({ hasText: "Review buyer questions" });
      assert.match(await questionStep.innerText(), /4 of 5 priority questions approved/);
      assert.equal(await questionStep.getAttribute("class"), "is-next");
      const attention = page.locator(".attention-inbox");
      const setupLink = attention.getByRole("link", { name: /Review buyer questions/ });
      await setupLink.waitFor();
      assert.equal(await setupLink.getAttribute("href"), "/app/prompts");
      assert.match(await page.locator(".workspace-heading").innerText(), /16 recorded answers/);
      const preview = page.locator(".latest-answer");
      await preview.waitFor();
      assert.match(await preview.innerText(), /fictional-demo-model/i);
      assert.match(await preview.innerText(), /Fictional demonstration only/);
      const rows = await attention.locator(".attention-inbox__item").evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, display: getComputedStyle(item).display };
      }));
      assert.ok(rows.length >= 2, "Demo provides multiple attention items for layout verification");
      rows.forEach((row, index) => {
        assert.equal(row.display, "grid", "Attention items must have an explicit row layout");
        if (index) assert.ok(row.top >= rows[index - 1].bottom + 8, "Attention items must be separated vertically");
      });
      await page.screenshot({ path: resolve(output, `overview-${width}.png`), fullPage: true });
      await primary.click();
      await page.getByRole("heading", { level: 1, name: "Buyer Questions" }).waitFor();
      await page.getByRole("link", { name: "Review AI Results" }).click();
      await page.getByRole("heading", { level: 1, name: "AI Results" }).waitFor();
      const record = page.locator(".run-history a.run-row").first();
      assert.match(await record.getAttribute("href"), /\/app\/runs\/.+/);
      await record.click();
      await page.waitForURL(/\/app\/runs\/.+/);
      await page.locator("main").waitFor();
      const answers = page.locator(".canonical-answer-record");
      assert.equal(await answers.count(), 16, "Every advertised demo answer is inspectable");
      assert.match(await answers.first().innerText(), /Fictional demonstration only/);
      const mentionAudit = await new AxeBuilder({ page }).include(".brand-mention-context strong").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(mentionAudit.violations, [], "Extracted brand-mention sentences must remain readable in the workspace theme");
      const answerAudit = await new AxeBuilder({ page }).include(".canonical-answer-record > p").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(answerAudit.violations, [], "Recorded provider answer text must remain readable in the actual workspace theme");
      const evidence = answers.first().locator(".canonical-contained-evidence").first();
      await evidence.locator(":scope > summary").click();
      await evidence.locator(".canonical-source-evidence").waitFor();
      assert.match(await evidence.locator(".canonical-contained-evidence__facts").textContent(), /Human review[\s\S]*Pending/);
      assert.match(await evidence.innerText(), /does not prove authority, influence/);
      const review = evidence.locator(".source-review-form");
      assert.equal(await review.getByRole("button", { name: "Save reviewed source" }).isDisabled(), true, "Fictional source review is read-only");
      assert.equal(await review.getByRole("combobox", { name: "Crawler access" }).isDisabled(), true);
      assert.match(await review.innerText(), /fictional demo is read-only/i);
      const reviewColors = await review.locator("select, textarea").evaluateAll((fields) => fields.map((field) => {
        const style = getComputedStyle(field);
        return { foreground: style.color, background: style.backgroundColor, opacity: style.opacity };
      }));
      const luminance = (color) => {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      for (const colors of reviewColors) {
        const values = [luminance(colors.foreground), luminance(colors.background)].sort((a, b) => b - a);
        assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, "Source review field values must be readable even when read-only");
        assert.equal(colors.opacity, "1");
      }
      const evidenceIds = await page.locator(".canonical-source-evidence [id]").evaluateAll((elements) => elements.map((element) => element.id));
      assert.equal(new Set(evidenceIds).size, evidenceIds.length, "Repeated references must retain distinct accessible heading IDs");
      await page.screenshot({ path: resolve(output, `record-evidence-${width}.png`), fullPage: true });
      // Deliberately unavailable Attention must be an error, then recover via Retry.
      await page.route("**/api/retention/attention", async (route) => {
        attentionRequests += 1;
        if (attentionMode === "stalled") {
          await new Promise((resolve) => { stalledRequests.add(resolve); });
          await route.abort().catch(() => {}); // The client may already have aborted at its deadline.
        }
        else if (attentionMode === "unavailable") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Attention temporarily unavailable" }) });
        else await route.fallback();
      });
      await page.goto(new URL("/app", base).href);
      const alert = page.getByRole("alert").filter({ hasText: "Attention is temporarily unavailable." });
      await alert.waitFor();
      assert.equal(await alert.getByRole("link", { name: "Open Records" }).getAttribute("href"), "/app/runs");
      await page.screenshot({ path: resolve(output, `attention-error-${width}.png`), fullPage: true });
      const retry = alert.getByRole("button", { name: "Retry attention" });
      await retry.focus();
      const failedAttentionRequests = attentionRequests;
      assert.ok(failedAttentionRequests >= 1, "The outage must include a real failed Attention request");
      attentionMode = "recover";
      await page.keyboard.press("Enter");
      await page.locator(".attention-inbox").waitFor();
      assert.equal(await alert.count(), 0);
      assert.ok(attentionRequests > failedAttentionRequests, "Keyboard Retry must issue a recovery request");
      // A request that never returns must also stop loading and offer Retry.
      attentionMode = "stalled";
      const beforeStall = attentionRequests;
      await page.goto(new URL("/app", base).href);
      await alert.waitFor();
      assert.ok(attentionRequests > beforeStall, "The deadline case must dispatch an actual stalled Attention read");
      assert.equal(await page.locator(".attention-inbox").count(), 0, "A timeout cannot display an empty/successful inbox");
      assert.equal(await alert.getByRole("link", { name: "Open Records" }).getAttribute("href"), "/app/runs");
      await page.screenshot({ path: resolve(output, `attention-timeout-${width}.png`), fullPage: true });
      attentionMode = "recover";
      releaseStalledRequests();
      const beforeTimeoutRetry = attentionRequests;
      await alert.getByRole("button", { name: "Retry attention" }).focus();
      await page.keyboard.press("Enter");
      await page.locator(".attention-inbox").waitFor();
      assert.ok(attentionRequests > beforeTimeoutRetry, "Retry after a deadline must dispatch a fresh read");
      assert.equal(await alert.count(), 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow, false, `Overview overflows at ${width}px`);
      const audit = await new AxeBuilder({ page }).include(".getting-started").include(".attention-inbox").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(audit.violations, [], "Changed baseline/Attention surfaces must pass axe");
      assert.deepEqual(errors, [], "Demo journey must not produce page errors or unexpected mutations");
      summary.profiles.push({ width, passed: true, failedAttentionRequests, attentionRequests, violations: audit.violations });
    } finally {
      releaseStalledRequests();
      const state = await page.evaluate(() => ({
        path: location.pathname,
        readyState: document.readyState,
        loading: document.body.textContent.includes("Checking what needs you now."),
        unavailable: document.body.textContent.includes("Attention is temporarily unavailable."),
        inbox: Boolean(document.querySelector(".attention-inbox")),
      })).catch(() => ({ inspectionUnavailable: true }));
      summary.diagnostics ||= [];
      summary.diagnostics.push({ width, attentionMode, attentionRequests, state, pageErrors: errors, network });
      await page.screenshot({ path: resolve(output, `final-${width}.png`), fullPage: true }).catch(() => {});
      await context.close();
    }
  }
  console.log("PASS fictional demo baseline, Attention error/deadline and keyboard retry at 1440, 375 and 320px");
} catch (error) {
  summary.error = String(error);
  throw error;
} finally {
  await writeFile(resolve(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await browser.close();
}
