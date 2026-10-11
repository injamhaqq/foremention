import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("pilot request has an explicit keyboard-friendly in-page application shortcut", async () => {
  const source = await read("../app/contact/page.tsx");
  assert.match(source, /href="#design-partner-application"/);
  assert.match(source, /Go to pilot application/);
  assert.match(source, /<h2 id="design-partner-application" tabIndex=\{-1\}>Apply as Design Partner\.<\/h2>/);
  assert.ok(source.indexOf('href="#design-partner-application"') < source.indexOf('<h2 id="design-partner-application"'));
  assert.match(source, /action="\/api\/design-partner" method="post"/);
  assert.match(source, /name="email" type="email"/);
  assert.match(source, /name="company"/);
  assert.match(source, /name="role"/);
  assert.match(source, /name="category"/);
});

test("shortcut uses approved controls, is mobile friendly and does not create a second submission flow", async () => {
  const [contact, css, layout] = await Promise.all([
    read("../app/contact/page.tsx"),
    read("../app/outreach-reflow.css"),
    read("../app/layout.tsx"),
  ]);
  assert.match(contact, /className="canonical-button canonical-button--primary" href="#design-partner-application"/);
  assert.match(css, /#design-partner-application\s*\{[\s\S]*scroll-margin-top: 110px/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(layout, /outreach-reflow\.css/);
  assert.equal((contact.match(/action="\/api\/design-partner"/g) || []).length, 1);
  assert.doesNotMatch(contact, /data-design-partner-cta="contact_shortcut"/);
});
