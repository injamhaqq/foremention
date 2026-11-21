import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("canonical font imports are single-source while brand typography stays fixed", async () => {
  const [layout, registered, canonical, globals, fontSource] = await Promise.all([
    read("../app/layout.tsx"),
    read("../app/registered-evidence.css"),
    read("../app/canonical-system.css"),
    read("../app/globals.css"),
    read("../lib/font-stylesheet.ts"),
  ]);

  assert.ok(layout.indexOf('import "./registered-evidence.css";') <
            layout.indexOf('import "./canonical-system.css";'));
  // Ops track: the single source moved from a CSS @import to a <head> link.
  assert.match(fontSource, /"https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Mono/);
  assert.match(fontSource, /Inter:wght@400;500;600;700/);
  assert.match(fontSource, /Newsreader:opsz,wght@6\.\.72,400;6\.\.72,500/);
  assert.match(fontSource, /&display=swap"/);
  assert.match(layout, /<link rel="stylesheet" href=\{CANONICAL_FONT_STYLESHEET_URL\} \/>/);
  assert.doesNotMatch(registered, /fonts\.googleapis\.com\/css2/);
  assert.doesNotMatch(canonical, /@import\s+url\(["']https:\/\/fonts\.googleapis\.com/);
  assert.match(canonical, /--fm-font-display:\s*"Newsreader"/);
  assert.match(canonical, /--fm-font-sans:\s*"Inter"/);
  assert.match(canonical, /--fm-font-mono:\s*"IBM Plex Mono"/);
  assert.match(fontSource, /Space\+Grotesk/);
  assert.equal((globals + registered + canonical).match(/fonts\.googleapis\.com\/css2/g), null);
  assert.equal((globals + registered + canonical + fontSource + layout).match(/fonts\.googleapis\.com\/css2/g)?.length, 1);
});
