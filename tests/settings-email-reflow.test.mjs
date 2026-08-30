import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("settings email preferences remain contained under zoom and text resize", async () => {
  const css = await text("app/canonical-responsive-hardening.css");

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
});
