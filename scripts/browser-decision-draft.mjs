#!/usr/bin/env node
// Isolated rendering fixture; not an authenticated workspace or saved customer decision.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { decisionDraftClientFixture, decisionDraftRecord } from "../tests/helpers/decision-draft-client-fixture.mjs";
import { opportunityEntryMarkup, opportunitySourceUrl } from "../tests/helpers/opportunity-entry-fixture.mjs";
import { decisionEditorFixture } from "../tests/helpers/decision-editor-fixture.mjs";
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
  for(const width of [1440,1024,768,375,320]) {
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
      const setFixture=async(html,title)=>page.setContent(`<!doctype html><html lang="en"><head><title>${title}</title>${css}</head><body><div class="app-frame" style="display:block"><main class="workspace page"><h1>${title}</h1><p>Isolated synthetic rendering — no authenticated customer mutation.</p>${html}</main></div></body></html>`);
      await setFixture(opportunityEntryMarkup(),"Opportunity decision entry fixture");
      const entry=page.getByRole("link",{name:"Review decision",exact:true});
      await entry.focus();assert.equal(await entry.evaluate((e)=>e===document.activeElement),true);
      const href=await entry.getAttribute("href");assert.equal(new URL(href,"https://fixture.example").searchParams.get("source"),opportunitySourceUrl);
      const actionBox=await entry.boundingBox();assert.ok(actionBox.height>=44,"Opportunity links must retain a usable touch target");
      if(width<=900){const rowBox=await page.locator(".opportunity-list article").boundingBox();assert.ok(actionBox.width>=rowBox.width*.75,"Tablet/mobile actions must span the row, not fall into the narrow score column");}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
      assert.deepEqual((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations,[]);
      await page.screenshot({path:resolve(output,`opportunity-entry-${width}.png`),fullPage:true});
      const selectedRecord={...decisionDraftRecord,problem:{...decisionDraftRecord.problem,title:"Selected cited page"},evidence:decisionDraftRecord.evidence.map((item)=>({...item,sourceUrl:opportunitySourceUrl}))};
      const target=`https://fixture.example${href}`;
      await page.route(target,async(route)=>{
        const hint=new URL(route.request().url()).searchParams.get("source");
        const selectedHtml=renderToStaticMarkup(decisionDraftClientFixture({sourceUrl:hint,records:[decisionDraftRecord,selectedRecord]}).render());
        await route.fulfill({contentType:"text/html; charset=utf-8",body:`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Selected decision fixture</title>${css}</head><body><div class="app-frame" style="display:block"><main class="workspace page"><h1>Review a decision</h1>${selectedHtml}</main></div></body></html>`});
      });
      // The synthetic document has no origin; supply one for native relative-link navigation.
      await page.evaluate(()=>{const base=document.createElement("base");base.href="https://fixture.example";document.head.append(base);});
      await entry.focus();await page.keyboard.press("Enter");await page.waitForURL(target);
      assert.equal(await page.title(),"Selected decision fixture");
      assert.equal(await page.evaluate(()=>document.characterSet),"UTF-8");
      assert.ok((await page.locator("body").textContent()).includes("→"),"Native navigation must preserve evidence-link glyphs");
      await page.getByRole("heading",{name:"Selected cited page",exact:true}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Create decision draft"}).count(),1);
      await page.screenshot({path:resolve(output,`opportunity-selected-${width}.png`),fullPage:true});
      await setFixture(renderToStaticMarkup(decisionDraftClientFixture({sourceUrl:"https://unavailable.example/page"}).render()),"Unavailable cited-page decision fixture");
      await page.getByRole("heading",{name:"No reviewed decision evidence is available for this cited page."}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Create decision draft"}).count(),0);
      await page.getByRole("link",{name:"Review source evidence",exact:true}).focus();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
      assert.deepEqual((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations,[]);
      await page.screenshot({path:resolve(output,`opportunity-unavailable-${width}.png`),fullPage:true});
      await setFixture(renderToStaticMarkup(decisionEditorFixture({uncertain:true}).render()),"Unconfirmed saved decision fixture");
      const reload=page.getByRole("button",{name:"Reload saved decision",exact:true});
      await reload.focus();assert.equal(await reload.evaluate(e=>e===document.activeElement),true);
      assert.equal(await page.getByRole("button",{name:"Submit for review",exact:true}).isDisabled(),true);
      assert.equal(await page.getByLabel("Title",{exact:true}).isDisabled(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,`Saved-state recovery overflows at ${width}px`);
      assert.deepEqual((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations,[]);
      await page.screenshot({path:resolve(output,`decision-recovery-${width}.png`),fullPage:true});
      summary.profiles.push({width,passed:true,violations:audit.violations});
    } finally { await page.screenshot({path:resolve(output,`final-${width}.png`),fullPage:true}).catch(()=>{});await context.close(); }
  }
  console.log("PASS isolated decision-draft and Opportunity handoff rendering at 1440, 1024, 768, 375 and 320px; authenticated save remains unverified");
} finally {await writeFile(resolve(output,"summary.json"),JSON.stringify(summary,null,2));await browser.close();}
