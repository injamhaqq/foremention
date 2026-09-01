import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("settings email preferences override global input width and remain contained under reflow", async () => {
  const [css, globals, component] = await Promise.all([
    text("app/canonical-responsive-hardening.css"),
    text("app/globals.css"),
    text("components/email-alert-preferences.tsx"),
  ]);

  // Historical form styling intentionally makes ordinary inputs full-width.
  // Checkbox controls must explicitly opt out or they consume the entire label row.
  assert.match(globals, /input,\s*textarea\s*\{\s*width:\s*100%;/s);
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*width:\s*100%;[^}]*overflow-wrap:\s*anywhere;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences\s*>\s*label\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*var\(--fm-touch-target\);[^}]*display:\s*flex;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences input\[type="checkbox"\]\s*\{[^}]*width:\s*17px;[^}]*min-width:\s*17px;[^}]*height:\s*17px;[^}]*min-height:\s*17px;[^}]*margin:\s*0;[^}]*flex:\s*0 0 17px;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences\s*>\s*label\s*>\s*span\s*\{[^}]*flex:\s*1 1 0;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow-wrap:\s*anywhere;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences \.button\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;[^}]*\}/s,
  );
  assert.equal((component.match(/<label style=\{\{ width: "100%" \}\}>/g) || []).length, 2);
  assert.equal((component.match(/<span style=\{\{ flex: "1 1 0", minWidth: 0, overflowWrap: "anywhere" \}\}>/g) || []).length, 2);
});
