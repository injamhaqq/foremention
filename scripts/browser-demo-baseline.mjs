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
      // Deliberately unavailable Attention must be an error, then recover via Retry.
      let attentionRequests = 0;
      await page.route("**/api/retention/attention", async (route) => {
        attentionRequests += 1;
        if (attentionRequests === 1) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Attention temporarily unavailable" }) });
        else await route.fallback();
      });
      await page.goto(new URL("/app", base).href);
      const alert = page.getByRole("alert").filter({ hasText: "Attention is temporarily unavailable." });
      await alert.waitFor();
      assert.equal(await alert.getByRole("link", { name: "Open Records" }).getAttribute("href"), "/app/runs");
      await page.screenshot({ path: resolve(output, `attention-error-${width}.png`), fullPage: true });
      const retry = alert.getByRole("button", { name: "Retry attention" });
      await retry.focus();
      await page.keyboard.press("Enter");
      await page.locator(".attention-inbox").waitFor();
      assert.equal(await alert.count(), 0);
      assert.equal(attentionRequests, 2);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow, false, `Overview overflows at ${width}px`);
      const audit = await new AxeBuilder({ page }).include(".getting-started").include(".attention-inbox").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(audit.violations, [], "Changed baseline/Attention surfaces must pass axe");
      assert.deepEqual(errors, [], "Demo journey must not produce page errors or unexpected mutations");
      summary.profiles.push({ width, passed: true, attentionRequests, violations: audit.violations });
    } finally {
      await page.screenshot({ path: resolve(output, `final-${width}.png`), fullPage: true }).catch(() => {});
      await context.close();
    }
  }
  console.log("PASS fictional demo baseline and Attention retry at 1440, 375 and 320px");
} catch (error) {
  summary.error = String(error);
  throw error;
} finally {
  await writeFile(resolve(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await browser.close();
}
