#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const toolRequire = createRequire(new URL("../.ci-tools/package.json", import.meta.url));
const { chromium, webkit } = toolRequire("playwright");

const baseUrl = new URL((process.env.FOREMENTION_BROWSER_BASE_URL || process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, ""));
const outputRoot = resolve(process.env.FOREMENTION_BROWSER_OUTPUT || "browser-acceptance");
const acceptanceEmail = (process.env.FOREMENTION_ACCEPTANCE_EMAIL || "").trim();
const acceptancePassword = process.env.FOREMENTION_ACCEPTANCE_PASSWORD || "";
const publicPaths = ["/", "/product", "/pricing", "/score", "/prompt-check", "/login", "/signup"];
const authenticatedPaths = ["/app", "/app/prompts", "/app/runs", "/app/analytics", "/app/settings"];
const zoomFactors = [2, 4];
const profiles = [
  { name: "chromium-low-height", browserType: chromium, viewport: { width: 1366, height: 768 } },
  { name: "chromium-mobile-landscape", browserType: chromium, viewport: { width: 844, height: 390 }, isMobile: true },
  { name: "webkit-mobile", browserType: webkit, viewport: { width: 390, height: 844 }, isMobile: true },
];

const summary = { checkedAt: new Date().toISOString(), baseUrl: baseUrl.origin, profiles: [], failures: [] };

function fail(message, details = {}) {
  summary.failures.push({ message, ...details });
  console.error(`[zoom-reflow] FAIL: ${message}`, details);
}

async function waitForStablePage(page, path) {
  const response = await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(150);
  if (!response || response.status() >= 400) fail("Zoom/reflow route did not render successfully.", { path, status: response?.status() ?? null });
}

async function measureReflow(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const selectors = [
      "main", "header", "footer", "section", "article", "form", "nav",
      ".app-frame", ".app-main", ".app-topbar", ".app-sidebar", ".app-mobile-nav__panel",
      ".panel", ".table-wrap", ".canonical-record", ".pricing-card", ".intake-form",
    ];
    const clipped = Array.from(document.querySelectorAll(selectors.join(","))).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") return [];
      const overflowX = style.overflowX;
      const horizontallyClipped = element.scrollWidth > element.clientWidth + 2 && !["auto", "scroll"].includes(overflowX);
      const escapesViewport = rect.right > viewportWidth + 2 || rect.left < -2;
      if (!horizontallyClipped && !escapesViewport) return [];
      return [{
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className.slice(0, 160) : "",
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        overflowX,
      }];
    });
    return { viewportWidth, documentWidth, clipped: clipped.slice(0, 25) };
  });
}

async function verifyZoomReflow(page, profileName, path) {
  for (const zoomFactor of zoomFactors) {
    await page.evaluate((factor) => {
      document.documentElement.style.zoom = String(factor);
    }, zoomFactor);
    await page.waitForTimeout(80);
    const measurement = await measureReflow(page);
    if (measurement.documentWidth > measurement.viewportWidth + 2) {
      fail("Zoom reflow overflow detected.", { profile: profileName, path, zoomFactor, measurement });
    }
    if (measurement.clipped.length) {
      fail("Nested content clipping detected.", { profile: profileName, path, zoomFactor, clipped: measurement.clipped });
    }
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });
    await page.waitForTimeout(40);
  }
}

async function runPublicProfiles() {
  for (const profile of profiles) {
    const browser = await profile.browserType.launch({ headless: true });
    const observations = [];
    try {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: Boolean(profile.isMobile) });
      const page = await context.newPage();
      for (const path of publicPaths) {
        await waitForStablePage(page, path);
        const normal = await measureReflow(page);
        observations.push({ path, normal });
        if (normal.documentWidth > normal.viewportWidth + 2) fail("Responsive overflow detected before zoom.", { profile: profile.name, path, normal });
        if (normal.clipped.length) fail("Nested content clipping detected.", { profile: profile.name, path, zoomFactor: 1, clipped: normal.clipped });
        if (profile.browserType === chromium) await verifyZoomReflow(page, profile.name, path);
      }
      await context.close();
    } catch (error) {
      fail("Zoom/reflow browser profile crashed.", { profile: profile.name, error: error instanceof Error ? error.message : String(error) });
    } finally {
      await browser.close();
    }
    summary.profiles.push({ profile: profile.name, observations });
  }
}

async function runAuthenticatedZoom() {
  if (!acceptanceEmail || !acceptancePassword) return;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await waitForStablePage(page, "/login");
    await page.getByLabel("Email").fill(acceptanceEmail);
    await page.locator('input[name="password"]').fill(acceptancePassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/app"), { timeout: 20_000 });
    for (const path of authenticatedPaths) {
      await waitForStablePage(page, path);
      await verifyZoomReflow(page, "chromium-authenticated-low-height", path);
    }
    await context.close();
  } catch (error) {
    fail("Authenticated zoom/reflow acceptance failed.", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await runPublicProfiles();
  await runAuthenticatedZoom();
  summary.checkedAt = new Date().toISOString();
  await writeFile(resolve(outputRoot, "zoom-reflow-summary.json"), JSON.stringify(summary, null, 2));
  if (summary.failures.length) process.exitCode = 1;
  else console.log(`[zoom-reflow] PASS — ${profiles.length} responsive engines/profiles with 200% and 400% Chromium reflow coverage.`);
}

main().catch(async (error) => {
  fail("Zoom/reflow acceptance runner crashed.", { error: error instanceof Error ? error.message : String(error) });
  await mkdir(outputRoot, { recursive: true }).catch(() => {});
  await writeFile(resolve(outputRoot, "zoom-reflow-summary.json"), JSON.stringify(summary, null, 2)).catch(() => {});
  process.exitCode = 1;
});
