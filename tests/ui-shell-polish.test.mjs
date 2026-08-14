import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const navigation = await readFile(new URL("../components/workspace-navigation.tsx", import.meta.url), "utf8");
const polish = await readFile(new URL("../app/product-polish.css", import.meta.url), "utf8");

test("desktop workspace navigation keeps the long tool list in its own scroll region", () => {
  assert.match(navigation, /className="app-sidebar__navigation"/);
  assert.match(navigation, /className="app-sidebar__footer"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--primary"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--workspace"/);
  assert.match(navigation, /className="sidebar-nav sidebar-nav--advanced"/);
  assert.match(navigation, /<small>\{advancedNav\.length\} tools<\/small>/);
  assert.match(polish, /\.app-sidebar\s*\{\s*overflow:\s*hidden;/);
  assert.match(polish, /\.app-sidebar__navigation\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.match(polish, /\.app-sidebar__footer\s*\{[^}]*flex:\s*0 0 auto;/s);
});

test("optional analytics notice stays compact instead of covering the product preview", () => {
  assert.match(polish, /\.analytics-consent\s*\{[^}]*width:\s*min\(430px, calc\(100vw - 24px\)\);/s);
  assert.match(polish, /box-shadow:\s*3px 3px 0 var\(--ink\);/);
  assert.match(polish, /\.analytics-consent \.button\s*\{[^}]*min-height:\s*34px;/s);
});