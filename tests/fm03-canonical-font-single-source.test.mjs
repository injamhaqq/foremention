import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("canonical font imports are single-source while brand typography stays fixed", async () => {
  const [layout, registered, canonical, globals] = await Promise.all([
    read("../app/layout.tsx"),
    read("../app/registered-evidence.css"),
    read("../app/canonical-system.css"),
    read("../app/globals.css"),
  ]);

  assert.ok(layout.indexOf('import "./registered-evidence.css";') <
            layout.indexOf('import "./canonical-system.css";'));
  assert.match(registered, /@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Mono/);
  assert.match(registered, /Inter:wght@400;500;600;700/);
  assert.match(registered, /Newsreader:opsz,wght@6\.\.72,400;6\.\.72,500/);
  assert.doesNotMatch(canonical, /@import\s+url\(["']https:\/\/fonts\.googleapis\.com/);
  assert.match(canonical, /--fm-font-display:\s*"Newsreader"/);
  assert.match(canonical, /--fm-font-sans:\s*"Inter"/);
  assert.match(canonical, /--fm-font-mono:\s*"IBM Plex Mono"/);
  assert.match(globals, /Space\+Grotesk/);
  assert.equal((registered + canonical).match(/fonts\.googleapis\.com\/css2/g)?.length, 1);
});
