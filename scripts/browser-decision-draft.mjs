#!/usr/bin/env node
// Isolated rendering fixture; not an authenticated workspace or saved customer decision.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { decisionDraftClientFixture } from "../tests/helpers/decision-draft-client-fixture.mjs";
const requireTools = createRequire(new URL("../.ci-tools/package.json", import.meta.url));
const { chromium } = requireTools("playwright");
const axeModule = requireTools("@axe-core/playwright");
const AxeBuilder = axeModule.default || axeModule.AxeBuilder || axeModule;
const layout = await readFile("app/layout.tsx", "utf8");
const cssFiles = [...layout.matchAll(/import "\.\/(.*\.css)";/g)].map((match) => `app/${match[1]}`);
assert.ok(cssFiles.includes("app/canonical-system.css"), "Use the actual root stylesheet order and workspace theme");
cssFiles.push("app/app/resolutions/resolution-center.module.css");
const css = (await Promise.all(cssFiles.map((path) => readFile(path, "utf8")))).map((sheet) => `<style>${sheet}</style>`).join("\n");
const output=resolve("browser-acceptance/decision-draft-layout");await mkdir(output,{recursive:true});
const summary={scope:"Isolated React rendering with synthetic scoped GET state. Native controls/layout only; no authenticated save, provider call or customer outcome.",profiles:[]};
const browser=await chromium.launch({headless:true});
try {
  for(const width of [1440,375,320]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});
    const page=await context.newPage();
    try {
      const html=renderToStaticMarkup(decisionDraftClientFixture().render());
      await page.setContent(`<!doctype html><html lang="en"><head><title>Decision draft layout fixture</title>${css}</head><body><div class="app-frame" style="display:block"><main class="workspace page"><div class="workspace-heading"><div><h1>Review a decision</h1><p>Isolated layout fixture — no customer data or saved decision.</p></div></div>${html}</main></div></body></html>`);
      await page.getByRole("button",{name:"Create decision draft"}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Approve asset"}).count(),0);
      const choice=page.getByRole("checkbox",{name:/Reviewed answer source/});
      await choice.focus();assert.equal(await choice.isChecked(),true);
      await page.keyboard.press("Space");assert.equal(await choice.isChecked(),false);
      await page.keyboard.press("Space");assert.equal(await choice.isChecked(),true);
      await page.getByRole("combobox",{name:"Baseline Record"}).focus();
      assert.match(await page.getByRole("combobox",{name:"Baseline Record"}).inputValue(),/00000000/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,`Decision handoff overflows at ${width}px`);
      const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
      assert.deepEqual(audit.violations,[],"Decision fixture must pass axe");
      await page.screenshot({path:resolve(output,`decision-draft-${width}.png`),fullPage:true});
      summary.profiles.push({width,passed:true,violations:audit.violations});
    } finally { await page.screenshot({path:resolve(output,`final-${width}.png`),fullPage:true}).catch(()=>{});await context.close(); }
  }
  console.log("PASS isolated decision-draft rendering and native controls at 1440, 375 and 320px; authenticated save remains unverified");
} finally {await writeFile(resolve(output,"summary.json"),JSON.stringify(summary,null,2));await browser.close();}
