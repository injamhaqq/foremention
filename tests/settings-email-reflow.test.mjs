import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("settings email preferences remain contained under zoom and text resize", async () => {
  const [css, component] = await Promise.all([
    text("app/canonical-responsive-hardening.css"),
    text("components/email-alert-preferences.tsx"),
  ]);

  assert.match(
    css,
    /\.app-frame \.email-alert-preferences\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*align-items:\s*flex-start;[^}]*width:\s*100%;[^}]*overflow-wrap:\s*anywhere;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences\s*>\s*label\s*\{[^}]*display:\s*flex;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences input\[type="checkbox"\]\s*\{[^}]*margin:\s*0;[^}]*flex:\s*0 0 auto;[^}]*\}/s,
  );
  assert.match(
    css,
    /\.app-frame \.email-alert-preferences \.button\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;[^}]*\}/s,
  );
  assert.equal((component.match(/<label style=\{\{ width: "100%" \}\}>/g) || []).length, 2);
  assert.equal((component.match(/<span style=\{\{ flex: "1 1 0", minWidth: 0, overflowWrap: "anywhere" \}\}>/g) || []).length, 2);
});
