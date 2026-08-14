#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const [reportPath, exitCodeValue, summaryPath] = process.argv.slice(2);
if (!reportPath || exitCodeValue === undefined || !summaryPath) {
  throw new Error("Usage: validate-knip-audit.mjs <report.json> <exit-code> <summary.json>");
}

const exitCode = Number(exitCodeValue);
if (!Number.isInteger(exitCode) || exitCode < 0) throw new Error("Knip exit code was not a non-negative integer.");

const raw = await readFile(reportPath, "utf8");
let report;
try {
  report = JSON.parse(raw);
} catch (error) {
  throw new Error(`Knip did not produce a valid JSON audit report: ${error instanceof Error ? error.message : String(error)}`);
}

const issueCount = Array.isArray(report?.issues)
  ? report.issues.length
  : Array.isArray(report?.files)
    ? report.files.length
    : null;

const summary = {
  mode: "audit-first",
  exitCode,
  issueCount,
  blocking: false,
  note: exitCode === 0
    ? "Knip reported no current findings."
    : "Knip reported findings. They are preserved as evidence and intentionally do not block until the baseline is reviewed and tuned.",
};

await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`[knip] audit exit=${exitCode}; issueCount=${issueCount ?? "see report"}; blocking=false`);
