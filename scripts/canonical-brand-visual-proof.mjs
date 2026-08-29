#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const toolRequire = createRequire(new URL("../.ci-tools/package.json", import.meta.url));
const { chromium } = toolRequire("playwright");
const axeModule = toolRequire("@axe-core/playwright");
const AxeBuilder = axeModule.default || axeModule.AxeBuilder || axeModule;

const baseUrl = new URL((process.env.FOREMENTION_BROWSER_BASE_URL || process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, ""));
const outputRoot = resolve(process.env.FOREMENTION_BROWSER_OUTPUT || "browser-acceptance", "brand-proof");
const retiredIdentityPaths = [
  "/brand/foremention-logo.svg",
  "/brand/foremention-logo-white.svg",
  "/brand/foremention-mark.svg",
  "/brand/foremention-mark-white.svg",
  "/foremention-wordmark.png",
  "/source-eclipse.svg",
];
const profiles = [
  { name: "desktop-1440", viewport: { width: 1440, height: 1200 } },
  { name: "laptop-1024", viewport: { width: 1024, height: 900 } },
  { name: "tablet-768", viewport: { width: 768, height: 1024 }, isMobile: true },
  { name: "mobile-375", viewport: { width: 375, height: 812 }, isMobile: true },
  { name: "narrow-320", viewport: { width: 320, height: 568 }, isMobile: true },
];

const summary = {
  baseUrl: baseUrl.origin,
  checkedAt: new Date().toISOString(),
  appShell: [],
  retiredAssets: [],
  failures: [],
};

function fail(message, details = {}) {
  summary.failures.push({ message, ...details });
  console.error(`[canonical-brand-proof] FAIL: ${message}`, details);
}

async function ensureOutput() {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(resolve(outputRoot, "app-shell"), { recursive: true });
  await mkdir(resolve(outputRoot, "axe"), { recursive: true });
}

async function verifyRetiredIdentityIsAbsent(page, profileName) {
  const visibleRetiredArtwork = await page.locator([
    'img[src*="/brand/foremention-"]',
    'img[src*="/foremention-wordmark.png"]',
    'img[src*="/source-eclipse.svg"]',
    "img.wordmark__art",
    "img.foremention-mark",
    ".source-eclipse",
    ".source-eclipse__orbit",
    ".source-eclipse__point",
    ".wordmark__name",
  ].join(", ")).evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0;
  }).length);

  if (visibleRetiredArtwork > 0) {
    fail("Retired Foremention visual identity artwork is visibly rendered.", { profile: profileName, visibleRetiredArtwork });
  }

  const inverseIdentity = await page.locator(".wordmark--inverse").count();
  if (inverseIdentity > 0) {
    fail("Retired inverse/white identity treatment is still present.", { profile: profileName, inverseIdentity });
  }

  const neutralLabels = await page.locator(".wordmark--text-only .wordmark__text").evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0;
  }).length);

  if (!neutralLabels) {
    fail("Neutral text-only Foremention product label is not visibly rendered.", { profile: profileName });
  }
}

async function verifyDemoAppShell(profile) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: Boolean(profile.isMobile) });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const loginResponse = await page.goto(new URL("/login", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!loginResponse?.ok()) {
      fail("Demo identity-retirement proof could not load the login entry.", { profile: profile.name, status: loginResponse?.status() ?? null });
      await context.close();
      return;
    }

    const demoButton = page.getByRole("button", { name: /Explore the fictional workspace/i });
    if (await demoButton.count() === 0) {
      fail("Explore the fictional workspace control is unavailable for app-shell proof.", { profile: profile.name });
      await context.close();
      return;
    }

    await demoButton.click();
    await page.waitForURL((url) => url.pathname === "/app", { timeout: 20_000 }).catch(() => {});
    const final = new URL(page.url());
    if (final.pathname !== "/app") {
      fail("Fictional demo did not enter the app shell.", { profile: profile.name, finalPath: final.pathname });
      await context.close();
      return;
    }

    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const widths = await page.evaluate(() => ({ innerWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body?.scrollWidth || 0 }));
    if (widths.documentWidth > widths.innerWidth + 1 || widths.bodyWidth > widths.innerWidth + 1) {
      fail("Fictional demo app shell has horizontal overflow.", { profile: profile.name, widths });
    }
    if (consoleErrors.length || pageErrors.length) {
      fail("Fictional demo app shell emitted browser runtime errors.", { profile: profile.name, consoleErrors, pageErrors });
    }

    await verifyRetiredIdentityIsAbsent(page, profile.name);

    try {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const blocking = result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      await writeFile(resolve(outputRoot, "axe", `${profile.name}-app.json`), JSON.stringify({ profile: profile.name, violations: blocking }, null, 2));
      if (blocking.length) {
        fail("Fictional demo app shell has serious or critical accessibility violations.", { profile: profile.name, violations: blocking.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })) });
      }
    } catch (error) {
      fail("Fictional demo app-shell axe analysis failed to execute.", { profile: profile.name, error: error instanceof Error ? error.message : String(error) });
    }

    await page.screenshot({ path: resolve(outputRoot, "app-shell", `${profile.name}.png`), fullPage: true });
    summary.appShell.push({ profile: profile.name, finalPath: final.pathname, widths });
    await context.close();
  } finally {
    await browser.close();
  }
}

async function verifyRetiredStaticAssets() {
  for (const path of retiredIdentityPaths) {
    try {
      const response = await fetch(new URL(path, baseUrl), { cache: "no-store", redirect: "manual" });
      const result = { path, status: response.status };
      summary.retiredAssets.push(result);
      if (response.ok) fail("Retired Foremention identity asset is still publicly available.", result);
    } catch (error) {
      fail("Could not verify retired identity asset absence.", { path, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

async function main() {
  await ensureOutput();
  await verifyRetiredStaticAssets();
  for (const profile of profiles) await verifyDemoAppShell(profile);
  summary.checkedAt = new Date().toISOString();
  await writeFile(resolve(outputRoot, "summary.json"), JSON.stringify(summary, null, 2));
  if (summary.failures.length) {
    console.error(`[canonical-brand-proof] ${summary.failures.length} failure(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`[canonical-brand-proof] PASS — retired visual identity absent across ${summary.appShell.length} app-shell widths.`);
}

main().catch(async (error) => {
  fail("Identity-retirement visual proof crashed.", { error: error instanceof Error ? error.message : String(error) });
  await mkdir(outputRoot, { recursive: true }).catch(() => {});
  await writeFile(resolve(outputRoot, "summary.json"), JSON.stringify(summary, null, 2)).catch(() => {});
  process.exitCode = 1;
});
