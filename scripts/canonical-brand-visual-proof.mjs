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
const canonicalBrandPaths = new Set([
  "/brand/foremention-logo.svg",
  "/brand/foremention-logo-white.svg",
  "/brand/foremention-mark.svg",
  "/brand/foremention-mark-white.svg",
]);
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
  socialPreview: null,
  favicon: null,
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

async function verifyCanonicalBrandArtwork(page, profileName) {
  const artwork = await page.locator("img.wordmark__art, img.foremention-mark").evaluateAll((images) => images.map((image) => {
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    const link = image.closest(".wordmark");
    return {
      src: image.getAttribute("src") || "",
      visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0,
      width: rect.width,
      height: rect.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      isMark: image.classList.contains("foremention-mark"),
      inverseWordmark: Boolean(link?.classList.contains("wordmark--inverse")),
      filter: style.filter,
      boxShadow: style.boxShadow,
      transform: style.transform,
    };
  }));

  const visibleArtwork = artwork.filter((item) => item.visible);
  if (!visibleArtwork.length) {
    fail("Canonical Foremention artwork is not visibly rendered in the app shell.", { profile: profileName });
    return;
  }

  for (const item of visibleArtwork) {
    let sourcePath = "";
    try {
      sourcePath = new URL(item.src, baseUrl).pathname;
    } catch {
      sourcePath = item.src;
    }

    if (!canonicalBrandPaths.has(sourcePath)) {
      fail("App shell uses an unapproved Foremention asset source.", { profile: profileName, sourcePath });
      continue;
    }

    if (item.isMark) {
      if (item.width < 16 || item.height < 16) {
        fail("Canonical Foremention mark rendered below its 16px minimum in the app shell.", { profile: profileName, sourcePath, width: item.width, height: item.height });
      }
    } else if (item.width < 100) {
      fail("Canonical Foremention lockup rendered below its 100px minimum in the app shell.", { profile: profileName, sourcePath, width: item.width });
    }

    if (item.naturalWidth > 0 && item.naturalHeight > 0 && item.width > 0 && item.height > 0) {
      const naturalRatio = item.naturalWidth / item.naturalHeight;
      const renderedRatio = item.width / item.height;
      const ratioDrift = Math.abs(renderedRatio - naturalRatio) / naturalRatio;
      if (ratioDrift > 0.01) {
        fail("Canonical Foremention artwork is stretched or squashed in the app shell.", { profile: profileName, sourcePath, ratioDrift });
      }
    }

    if (item.filter !== "none" || item.boxShadow !== "none" || item.transform !== "none") {
      fail("Canonical Foremention artwork has an unapproved effect or transform in the app shell.", {
        profile: profileName,
        sourcePath,
        filter: item.filter,
        boxShadow: item.boxShadow,
        transform: item.transform,
      });
    }

    if (!item.isMark) {
      const expectsWhite = item.inverseWordmark;
      const isWhite = sourcePath.endsWith("-white.svg");
      if (expectsWhite !== isWhite) {
        fail("Canonical Foremention app-shell wordmark variant does not match its inverse treatment.", { profile: profileName, sourcePath, inverse: expectsWhite });
      }
    }
  }

  const visibleLegacy = await page.locator(".source-eclipse, .source-eclipse__orbit, .source-eclipse__point, .wordmark__name").evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0;
  }).length);

  if (visibleLegacy > 0) {
    fail("Visible legacy Foremention identity substitute detected in the app shell.", { profile: profileName, visibleLegacy });
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
      fail("Demo brand proof could not load the login entry.", { profile: profile.name, status: loginResponse?.status() ?? null });
      await context.close();
      return;
    }

    const demoButton = page.getByRole("button", { name: /Explore the fictional workspace/i });
    if (await demoButton.count() === 0) {
      fail("Explore the fictional workspace control is unavailable for app-shell brand proof.", { profile: profile.name });
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

    await verifyCanonicalBrandArtwork(page, profile.name);

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

function readPngDimensions(bytes) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function verifyStaticBrandAssets() {
  try {
    const response = await fetch(new URL("/og.png", baseUrl), { headers: { accept: "image/png" }, cache: "no-store" });
    const bytes = Buffer.from(await response.arrayBuffer());
    const dimensions = readPngDimensions(bytes);
    const contentType = response.headers.get("content-type") || "";
    summary.socialPreview = { status: response.status, contentType, bytes: bytes.length, dimensions };
    if (!response.ok || !contentType.toLowerCase().includes("image/png")) {
      fail("Open Graph preview is not served as a PNG image.", { status: response.status, contentType });
    }
    if (!dimensions) {
      fail("Open Graph preview is not a valid PNG file.");
    } else if (dimensions.width !== 1200 || dimensions.height !== 630) {
      const { width, height } = dimensions;
      fail("Open Graph preview must remain 1200x630.", { width, height });
    }
    await writeFile(resolve(outputRoot, "social-og.png"), bytes);
  } catch (error) {
    fail("Open Graph preview could not be archived for visual review.", { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    const response = await fetch(new URL("/favicon.ico", baseUrl), { headers: { accept: "image/*" }, cache: "no-store" });
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    summary.favicon = { status: response.status, contentType, bytes: bytes.length };
    if (!response.ok || bytes.length < 100) {
      fail("Canonical derived favicon is unavailable or empty.", { status: response.status, contentType, bytes: bytes.length });
    }
    await writeFile(resolve(outputRoot, "favicon.ico"), bytes);
  } catch (error) {
    fail("Favicon could not be archived for visual review.", { error: error instanceof Error ? error.message : String(error) });
  }
}

async function main() {
  await ensureOutput();
  await verifyStaticBrandAssets();
  for (const profile of profiles) await verifyDemoAppShell(profile);
  summary.checkedAt = new Date().toISOString();
  await writeFile(resolve(outputRoot, "summary.json"), JSON.stringify(summary, null, 2));
  if (summary.failures.length) {
    console.error(`[canonical-brand-proof] ${summary.failures.length} failure(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`[canonical-brand-proof] PASS — ${summary.appShell.length} app-shell widths plus Open Graph and favicon evidence archived.`);
}

main().catch(async (error) => {
  fail("Canonical brand visual proof crashed.", { error: error instanceof Error ? error.message : String(error) });
  await mkdir(outputRoot, { recursive: true }).catch(() => {});
  await writeFile(resolve(outputRoot, "summary.json"), JSON.stringify(summary, null, 2)).catch(() => {});
  process.exitCode = 1;
});
