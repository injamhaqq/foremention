import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function fixture() {
  const states = [], requests = [], timers = new Map();
  let cursor = 0, effect, cleanup, nextTimer = 0;
  const mocks = {
    react: { ...React, useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    }, useEffect(callback) { effect = callback; } },
    "react/jsx-runtime": jsx,
    "next/link": { default: ({ href, children }) => React.createElement("a", { href }, children) },
    "next/navigation": { usePathname: () => "/app" },
    "@/components/attention-inbox": { AttentionInbox: ({ items }) => React.createElement("div", { "data-items": items.length }, "Recorded attention") },
  };
  const source = readFileSync(new URL("../components/retention-surface-bridge.tsx", import.meta.url), "utf8") + "\nexport { AttentionSurface };";
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, AbortController,
    require: (name) => mocks[name] || {},
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, init) { return new Promise((resolve, reject) => requests.push({ url, init, resolve, reject })); },
  });
  const render = () => { cursor = 0; return exports.AttentionSurface(); };
  render(); cleanup = effect();
  return { states, requests, timers, render, html: () => renderToStaticMarkup(render()), expire() { for (const { callback } of [...timers.values()]) callback(); }, unmount: () => cleanup(), retry() {
    const alert = render();
    alert.props.children.find((child) => child?.type === "button").props.onClick();
    cleanup(); render(); cleanup = effect();
  } };
}
const flush = async () => { for (let index = 0; index < 10; index++) await Promise.resolve(); };
const response = (data) => ({ ok: true, json: async () => ({ data }) });

test("a stalled Attention read becomes unavailable at 15 seconds without invented items", () => {
  const f = fixture();
  assert.equal([...f.timers.values()][0].delay, 15_000);
  assert.equal(f.requests[0].url, "/api/retention/attention");
  assert.equal(f.requests[0].init.cache, "no-store");
  f.expire();
  assert.equal(f.requests[0].init.signal.aborted, true);
  assert.match(f.html(), /role="alert"/);
  assert.match(f.html(), /Retry attention/);
  assert.match(f.html(), /href="\/app\/runs"/);
  assert.doesNotMatch(f.html(), /Recorded attention/);
});

test("a timed-out response cannot overwrite the fresh Retry result", async () => {
  const f = fixture(); f.expire(); f.retry();
  assert.equal(f.requests.length, 2);
  assert.notEqual(f.requests[0].init.signal, f.requests[1].init.signal);
  assert.match(f.html(), /Checking what needs you now/);
  f.requests[1].resolve(response([{ id: "fresh" }])); await flush();
  f.requests[0].resolve(response([{ id: "stale" }, { id: "stale-2" }])); await flush();
  assert.equal(f.states[0][0].id, "fresh");
  assert.equal(f.states[0].length, 1);
  assert.match(f.html(), /Recorded attention/);
  assert.equal(f.timers.size, 0);
});

test("the deadline also covers a stalled JSON body and ignores its late completion", async () => {
  const f = fixture(); let finish;
  f.requests[0].resolve({ ok: true, json: () => new Promise((resolve) => { finish = resolve; }) }); await flush();
  f.expire(); finish({ data: [{ id: "late" }] }); await flush();
  assert.match(f.html(), /role="alert"/);
  assert.equal(f.states[0].length, 0);
});

test("unmount aborts and clears the deadline without later state writes", async () => {
  const f = fixture(); const before = JSON.stringify(f.states); f.unmount();
  assert.equal(f.timers.size, 0);
  assert.equal(f.requests[0].init.signal.aborted, true);
  f.requests[0].reject(new Error("aborted")); await flush();
  assert.equal(JSON.stringify(f.states), before);
});

test("failed or malformed Attention stays unavailable; a recorded empty result is valid", async () => {
  for (const result of [{ ok: false }, response(null), response([])]) {
    const f = fixture(); f.requests[0].resolve(result); await flush();
    assert.equal(f.timers.size, 0);
    assert.match(f.html(), result.ok && Array.isArray((await result.json()).data) ? /Recorded attention/ : /role="alert"/);
  }
});
