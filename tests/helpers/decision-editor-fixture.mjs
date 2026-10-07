import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";

export const editorRecord = {
  id: "00000000-0000-4000-8000-000000000008", opportunityId: "00000000-0000-4000-8000-000000000001",
  baselineRunId: "00000000-0000-4000-8000-000000000003", status: "draft",
  title: "Synthetic decision", problemStatement: "Fixture-only reviewed gap", exactChange: "Add an inspectable example",
  controlClass: "CONTROLLABLE", controlSurface: "Documentation", eligibilityState: "ELIGIBLE",
  decisionState: "TEST_FIRST", truthState: "HYPOTHESIS", confidenceState: "LOW", ownerRole: "Marketing",
  priorityRank: null, effort: "LOW", acceptanceCriteria: ["Reviewer checks the example"],
  verificationPlan: { intent: "Repeat the same questions", questionIds: ["fixture-question"], remeasureAt: "2026-10-20", methodology: "fixture-only" },
  linkedEvidenceCount: 1, submittedAt: null, decisionAt: null, approvalNote: null,
};

export function decisionEditorFixture(options = {}) {
  const state = [], refs = [], requests = [];
  let cursor = 0, refCursor = 0;
  const source = readFileSync(new URL("../../components/change-specification-detail.tsx", import.meta.url), "utf8") + "\nexport { draftFrom };";
  const mocks = {
    react: { ...React, useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = index === 0 ? structuredClone(options.record || editorRecord) : index === 1 ? exports.draftFrom(state[0]) : initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    }, useRef(initial) { return refs[refCursor++] ||= { current: initial }; }, useEffect() {}, useMemo: (fn) => fn(), useCallback: (fn) => fn },
    "react/jsx-runtime": jsx,
    "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: (name) => mocks[name],
    fetch(url, init = {}) { return new Promise((resolve, reject) => requests.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined, resolve, reject })); },
  });
  const render = () => { cursor = 0; refCursor = 0; return exports.ChangeSpecificationDetail({ id: options.id || editorRecord.id, role: options.role || "analyst", demo: options.demo || false }); };
  const walk = (node, predicate) => {
    if (!node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const found = walk(child, predicate); if (found) return found; }
    return null;
  };
  const button = (name) => walk(render(), (node) => node.type === "button" && React.Children.toArray(node.props.children).join("") === name);
  const field = (label) => { const parent = walk(render(), (node) => node.type === "label" && React.Children.toArray(node.props.children)[0] === label); return walk(parent, (node) => ["input", "textarea", "select"].includes(node.type)); };
  const form = () => walk(render(), (node) => node.type === "form");
  return { render, walk, button, field, form, requests, state };
}
export const flushEditor = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
export const editorResponse = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify({ data }) });
