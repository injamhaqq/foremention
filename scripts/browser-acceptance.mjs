#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const toolRequire = createRequire(new URL("../.ci-tools/package.json", import.meta.url));
const { chromium, firefox } = toolRequire("playwright");
const axeModule = toolRequire("@axe-core/playwright");
const AxeBuilder = axeModule.default || axeModule.AxeBuilder || axeModule;

const baseUrl = new URL((process.env.FOREMENTION_BROWSER_BASE_URL || process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, ""));
const baseOrigin = baseUrl.origin;
const expectedBuildCommit = (process.env.FOREMENTION_EXPECTED_BUILD_COMMIT || "").trim().toLowerCase();
const acceptanceEmail = (process.env.FOREMENTION_ACCEPTANCE_EMAIL || "").trim();
const acceptancePassword = process.env.FOREMENTION_ACCEPTANCE_PASSWORD || "";
const requireAuthenticatedAcceptance = (process.env.FOREMENTION_REQUIRE_AUTHENTICATED_ACCEPTANCE || "").trim().toLowerCase() === "true";
const outputRoot = resolve(process.env.FOREMENTION_BROWSER_OUTPUT || "browser-acceptance");

const publicPaths = ["/", "/product", "/pricing", "/score", "/prompt-check", "/login", "/signup"];
const authenticatedPaths = ["/app", "/app/prompts", "/app/runs", "/app/source-map", "/app/settings"];
const profiles = [
  { name: "chromium-desktop", browserType: chromium, viewport: { width: 1440, height: 1200 } },
  { name: "chromium-mobile", browserType: chromium, viewport: { width: 390, height: 844 }, isMobile: true },
  { name: "firefox-desktop", browserType: firefox, viewport: { width: 1440, height: 1200 } },
];

const summary = {
  baseUrl: baseUrl.origin,
  checkedAt: new Date().toISOString(),
  expectedBuildCommit: expectedBuildCommit || null,
  health: null,
  public: [],
  authBoundary: null,
  authenticated: null,
  failures: [],
};

function slug(path) {
  return path === "/" ? "home" : path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
}

function recordFailure(message, details = {}) {
  summary.failures.push({ message, ...details });
  console.error(`[browser-acceptance] FAIL: ${message}`, details);
}

function sanitizeDiagnosticUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl, baseUrl);
    if (parsed.origin !== baseOrigin) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

function sanitizeAxeCheck(check) {
  return {
    id: check.id,
    impact: check.impact ?? null,
    data: check.data ?? null,
  };
}

function sanitizeAxeViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary,
      any: node.any.map(sanitizeAxeCheck),
      all: node.all.map(sanitizeAxeCheck),
      none: node.none.map(sanitizeAxeCheck),
    })),
  };
}

async function ensureOutput() {
  await mkdir(outputRoot, { recursive: true });
  for (const profile of profiles) await mkdir(resolve(outputRoot, profile.name), { recursive: true });
  await mkdir(resolve(outputRoot, "axe"), { recursive: true });
  await mkdir(resolve(outputRoot, "authenticated-axe"), { recursive: true });
}

async function verifyExactHealth() {
  if (!expectedBuildCommit) return;
  if (!/^[0-9a-f]{40}$/.test(expectedBuildCommit)) {
    recordFailure("FOREMENTION_EXPECTED_BUILD_COMMIT must be a full 40-character Git SHA.");
    return;
  }
  try {
    const response = await fetch(new URL(`/api/health?browser_acceptance=${Date.now()}`, baseUrl), {
      headers: { accept: "application/json", "cache-control": "no-cache" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    const observed = typeof body?.buildCommit === "string" ? body.buildCommit.trim().toLowerCase() : "";
    summary.health = { status: response.status, buildCommit: observed || null };
    if (!response.ok) recordFailure("Production health endpoint was not healthy during browser acceptance.", { status: response.status });
    if (observed !== expectedBuildCommit) {
      recordFailure("Browser acceptance observed a different production build than the exact main release.", {
        expectedBuildCommit,
        observedBuildCommit: observed || null,
      });
    }
  } catch (error) {
    recordFailure("Browser acceptance could not read the exact production health contract.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function isBenignBrowserConsoleNoise(message) {
  return /^Cookie [“"]dmn_chk_[^”"]+[”"] has been rejected for invalid domain\.?$/.test(message.trim());
}

function attachRuntimeObservers(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isBenignBrowserConsoleNoise(text)) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const pathname = sanitizeDiagnosticUrl(response.url());
    if (!pathname) return;
    failedResponses.push({ status, pathname: sanitizeDiagnosticUrl(response.url()) });
  });
  return {
    reset() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      failedResponses.length = 0;
    },
    snapshot() {
      return { consoleErrors: [...consoleErrors], pageErrors: [...pageErrors], failedResponses: [...failedResponses] };
    },
  };
}

async function visible(locator) {
  if (await locator.count() === 0) return false;
  return locator.first().isVisible().catch(() => false);
}

async function auditPage({ page, observers, path, profileName, axe = true, requireSingleH1 = true }) {
  observers.reset();
  const url = new URL(path, baseUrl).toString();
  let response;
  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(250);
  } catch (error) {
    recordFailure("Navigation failed.", { profile: profileName, path, error: error instanceof Error ? error.message : String(error) });
    return null;
  }

  const status = response?.status() ?? null;
  const finalUrl = page.url();
  const title = await page.title();
  const h1Count = await page.locator("h1").count();
  const lang = await page.locator("html").getAttribute("lang");
  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body?.scrollWidth || 0,
  }));
  const runtime = observers.snapshot();

  const routeEvidence = { profile: profileName, path, status, finalUrl, title, h1Count, lang, viewport, runtime };
  summary.public.push(routeEvidence);

  if (status === null || status >= 400) recordFailure("Public route did not return a successful document response.", { profile: profileName, path, status });
  if (!title.trim()) recordFailure("Public route is missing a document title.", { profile: profileName, path });
  if (!lang?.trim()) recordFailure("Public route is missing html lang metadata.", { profile: profileName, path });
  if (requireSingleH1 && h1Count !== 1) recordFailure("Public route must expose exactly one primary H1.", { profile: profileName, path, h1Count });
  if (viewport.documentWidth > viewport.innerWidth + 1 || viewport.bodyWidth > viewport.innerWidth + 1) {
    recordFailure("Horizontal viewport overflow detected.", { profile: profileName, path, viewport });
  }
  if (runtime.pageErrors.length) recordFailure("Uncaught browser page error detected.", { profile: profileName, path, errors: runtime.pageErrors });
  if (runtime.consoleErrors.length) {
    recordFailure("Browser console error detected.", {
      profile: profileName,
      path,
      errors: runtime.consoleErrors,
      failedResponses: runtime.failedResponses,
    });
  }

  if (path === "/login" || path === "/signup") {
    if (!await visible(page.locator("form"))) recordFailure("Authentication form is not visibly rendered.", { profile: profileName, path });
    if (!await visible(page.locator('input[name="email"]'))) recordFailure("Authentication email input is not usable.", { profile: profileName, path });
    if (!await visible(page.locator('input[name="password"]'))) recordFailure("Authentication password input is not usable.", { profile: profileName, path });
    if (!await visible(page.locator('button[type="submit"]'))) recordFailure("Authentication submit control is not usable.", { profile: profileName, path });
  }

  await page.locator("body").click({ position: { x: 2, y: 2 } }).catch(() => {});
  await page.keyboard.press("Tab");
  const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName || "", text: (document.activeElement?.textContent || "").trim().slice(0, 120) }));
  if (!active.tag || active.tag === "BODY" || active.tag === "HTML") {
    recordFailure("Keyboard navigation did not reach an interactive focus target.", { profile: profileName, path, active });
  }

  if (axe) {
    try {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      await writeFile(resolve(outputRoot, "axe", `${profileName}-${slug(path)}.json`), JSON.stringify(result, null, 2));
      const blocking = result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      if (blocking.length) {
        recordFailure("Serious or critical accessibility regression detected by axe.", {
          profile: profileName,
          path,
          violations: blocking.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length })),
        });
      }
    } catch (error) {
      recordFailure("axe accessibility analysis failed to execute.", { profile: profileName, path, error: error instanceof Error ? error.message : String(error) });
    }
  }

  await page.screenshot({ path: resolve(outputRoot, profileName, `${slug(path)}.png`), fullPage: true });
  return routeEvidence;
}

async function verifyAnalyticsOverlayRegression(page, profileName) {
  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(250);
  const floating = await page.locator(".analytics-consent").count();
  const oldCopy = await page.getByText("Help improve Foremention", { exact: false }).count();
  if (floating !== 0 || oldCopy !== 0) {
    recordFailure("The removed automatic analytics overlay has regressed.", { profile: profileName, floating, oldCopy });
  }
}

async function verifySourceXRay(page, profileName) {
  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  const xray = page.locator("#source-xray");
  const stage = page.locator("#source-xray-stage");
  if (!await visible(xray) || !await visible(stage)) {
    recordFailure("Source X-Ray is not visibly rendered on the homepage.", { profile: profileName });
    return;
  }
  await stage.scrollIntoViewIfNeeded();
  await stage.focus();
  const before = await stage.evaluate((element) => getComputedStyle(element).getPropertyValue("--xray-x").trim());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  const after = await stage.evaluate((element) => getComputedStyle(element).getPropertyValue("--xray-x").trim());
  if (!before || !after || before === after) {
    recordFailure("Source X-Ray keyboard slider did not respond to ArrowRight.", { profile: profileName, before, after });
  }
  const beforeToggle = await stage.evaluate((element) => element.classList.contains("is-all"));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const afterToggle = await stage.evaluate((element) => element.classList.contains("is-all"));
  if (beforeToggle === afterToggle) recordFailure("Source X-Ray keyboard reveal did not respond to Enter.", { profile: profileName });
  await page.keyboard.press("Enter").catch(() => {});
}

async function verifyUnauthenticatedBoundary() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const response = await page.goto(new URL("/app", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    const final = new URL(page.url());
    summary.authBoundary = { initialStatus: response?.status() ?? null, finalUrl: final.toString() };
    if (final.pathname !== "/login" || final.searchParams.get("next") !== "/app") {
      recordFailure("Unauthenticated /app did not terminate at the expected login boundary.", { finalUrl: final.toString() });
    }
    await context.close();
  } finally {
    await browser.close();
  }
}

async function verifyAuthenticatedRoutes() {
  if (Boolean(acceptanceEmail) !== Boolean(acceptancePassword)) {
    summary.authenticated = { skipped: false, configurationError: true };
    recordFailure("Authenticated browser acceptance credentials are only partially configured.");
    return;
  }
  if (!acceptanceEmail || !acceptancePassword) {
    if (requireAuthenticatedAcceptance) {
      summary.authenticated = { skipped: false, configurationError: true };
      recordFailure("Trusted production authenticated browser acceptance is required but dedicated credentials are not configured.");
      return;
    }
    summary.authenticated = {
      skipped: true,
      reason: "FOREMENTION_ACCEPTANCE_EMAIL and FOREMENTION_ACCEPTANCE_PASSWORD are not configured for this trusted run.",
    };
    console.log("[browser-acceptance] Authenticated routes SKIPPED — dedicated acceptance credentials are not configured.");
    return;
  }

  const authProfiles = [profiles[0], profiles[1]];
  const evidence = [];
  for (const profile of authProfiles) {
    const browser = await profile.browserType.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: Boolean(profile.isMobile) });
      const page = await context.newPage();
      const observers = attachRuntimeObservers(page);
      await page.goto(new URL("/login", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.getByLabel("Email").fill(acceptanceEmail);
      await page.locator('input[name="password"]').fill(acceptancePassword);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL((url) => url.pathname.startsWith("/app"), { timeout: 20_000 }).catch(() => {});
      if (!new URL(page.url()).pathname.startsWith("/app")) {
        recordFailure("Dedicated browser acceptance login did not establish an authenticated workspace session.", { profile: profile.name, finalUrl: page.url() });
        await context.close();
        continue;
      }

      for (const path of authenticatedPaths) {
        observers.reset();
        const response = await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(200);
        const final = new URL(page.url());
        const widths = await page.evaluate(() => ({ innerWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth }));
        const runtime = observers.snapshot();
        const row = { profile: profile.name, path, status: response?.status() ?? null, finalUrl: final.toString(), widths, runtime };
        evidence.push(row);
        if (final.pathname === "/login" || (response?.status() ?? 500) >= 400) recordFailure("Authenticated critical path did not render under the acceptance session.", row);
        if (widths.documentWidth > widths.innerWidth + 1) recordFailure("Authenticated critical path has horizontal overflow.", row);
        if (runtime.pageErrors.length || runtime.consoleErrors.length) recordFailure("Authenticated critical path emitted browser runtime errors.", row);

        try {
          const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          const blocking = result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
          const sanitizedBlocking = blocking.map(sanitizeAxeViolation);
          await writeFile(
            resolve(outputRoot, "authenticated-axe", `${profile.name}-${slug(path)}.json`),
            JSON.stringify({ profile: profile.name, path, violations: sanitizedBlocking }, null, 2),
          );
          if (blocking.length) {
            recordFailure("Authenticated critical path has serious/critical axe violations.", {
              ...row,
              violations: sanitizedBlocking.map((violation) => ({
                id: violation.id,
                impact: violation.impact,
                targets: violation.nodes.map((node) => node.target),
              })),
            });
          }
        } catch (error) {
          recordFailure("Authenticated axe analysis failed to execute.", { profile: profile.name, path, error: error instanceof Error ? error.message : String(error) });
        }
      }
      await context.close();
    } finally {
      await browser.close();
    }
  }
  summary.authenticated = { skipped: false, routes: evidence };
}

async function runPublicProfiles() {
  for (const profile of profiles) {
    console.log(`[browser-acceptance] ${profile.name}`);
    const browser = await profile.browserType.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: Boolean(profile.isMobile) });
      const page = await context.newPage();
      const observers = attachRuntimeObservers(page);
      for (const path of publicPaths) await auditPage({ page, observers, path, profileName: profile.name });
      await verifyAnalyticsOverlayRegression(page, profile.name);
      if (profile.name !== "firefox-desktop") await verifySourceXRay(page, profile.name);
      await context.close();
    } catch (error) {
      recordFailure("Browser profile crashed.", { profile: profile.name, error: error instanceof Error ? error.message : String(error) });
    } finally {
      await browser.close();
    }
  }
}

async function main() {
  await ensureOutput();
  await verifyExactHealth();
  await runPublicProfiles();
  await verifyUnauthenticatedBoundary();
  await verifyAuthenticatedRoutes();
  summary.checkedAt = new Date().toISOString();
  await writeFile(resolve(outputRoot, "summary.json"), JSON.stringify(summary, null, 2));
  if (summary.failures.length) {
    console.error(`[browser-acceptance] ${summary.failures.length} failure(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`[browser-acceptance] PASS — ${summary.public.length} public browser/page observations; authenticated=${summary.authenticated?.skipped ? "skipped" : "checked"}.`);
}

main().catch(async (error) => {
  recordFailure("Browser acceptance runner crashed.", { error: error instanceof Error ? error.message : String(error) });
  await mkdir(outputRoot, { recursive: true }).catch(() => {});
  await writeFile(resolve(outputRoot, "summary.json"), JSON.stringify(summary, null, 2)).catch(() => {});
  process.exitCode = 1;
});