import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const shaPattern = /^[a-f0-9]{40}$/;
const reserved = new Set([
  "CLAUDE.md", "FOREMENTION_STATE.md", ".mcp.json",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
  "docs/AUTOPILOT.md", "docs/billion-dollar-build/EXECUTION-STATUS.md",
  "scripts/validate-autopilot-diff.mjs", "scripts/verify-workstream-handoff.mjs",
]);
const reservedPrefixes = [".github/", ".claude/", "supabase/migrations/"];

const safePath = (p) => typeof p === "string" && !!p &&
  !p.startsWith("/") && !p.includes("\\") && !/[?*]/.test(p) &&
  p.split("/").every((part) => part && part !== "." && part !== "..");

export function validateHandoff(packet, snapshot, currentMainSha, nowMs = Date.now()) {
  const errors = [];
  const add = (message) => errors.push(message);
  const worker = packet?.workstream;
  if (!/^FM-(?:0[1-9]|1[01])$/.test(worker ?? "")) add("Invalid workstream: expected FM-01 to FM-11");
  if (!shaPattern.test(currentMainSha ?? "")) add("Invalid current main SHA");
  if (!shaPattern.test(packet?.baseSha ?? "") || packet.baseSha !== currentMainSha) add("Stale or invalid baseSha");
  if (typeof packet?.branch !== "string" ||
      !packet.branch.startsWith("fm-" + (worker ?? "").slice(3) + "/") ||
      packet.branch.endsWith("/") || packet.branch.includes("..") ||
      packet.branch.includes(" ")) add("Invalid workstream branch");
  if (packet?.prNumber !== null &&
      (!Number.isInteger(packet?.prNumber) || packet.prNumber < 1)) add("Invalid prNumber");
  if (!Array.isArray(packet?.writeSet) || !packet.writeSet.length) add("Missing writeSet");
  else {
    const seen = new Set();
    for (const file of packet.writeSet) {
      if (!safePath(file)) { add("Unsafe writeSet path: " + String(file)); continue; }
      if (seen.has(file)) add("Duplicate writeSet path: " + file);
      seen.add(file);
      if (reserved.has(file) || reservedPrefixes.some((prefix) => file.startsWith(prefix)))
        add("FM-00-owned integration path: " + file);
    }
  }
  for (const field of ["dependencies", "blockers"])
    if (!Array.isArray(packet?.[field]) || !packet[field].every((v) => typeof v === "string"))
      add("Invalid " + field);
  if (typeof packet?.nextTask !== "string" || !packet.nextTask.trim()) add("Missing nextTask");
  if (!Array.isArray(packet?.tests) || !packet.tests.length ||
      !packet.tests.every((t) => typeof t?.command === "string" && t.command.trim() &&
        ["pass", "fail", "blocked", "not-run"].includes(t.status)))
    add("Missing or invalid test results");
  if (snapshot?.complete !== true || snapshot?.mainSha !== currentMainSha || !Array.isArray(snapshot?.prs)) {
    add("Missing complete current-main open PR snapshot");
  } else {
    const time = Date.parse(snapshot.capturedAt);
    if (!Number.isFinite(time) || time > nowMs + 60000 || nowMs - time > 900000)
      add("Stale PR snapshot (15-minute maximum)");
    for (const pr of snapshot.prs) {
      if (!Number.isInteger(pr.number) || !Array.isArray(pr.files) || !pr.files.every(safePath)) {
        add("Malformed open PR file inventory"); continue;
      }
      if (pr.number === packet?.prNumber) continue;
      for (const file of packet?.writeSet ?? [])
        if (pr.files.includes(file)) add("Open PR #" + pr.number + " also edits: " + file);
    }
  }
  return { ok: errors.length === 0, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [packetFile, snapshotFile, sha] = process.argv.slice(2);
  if (!packetFile || !snapshotFile || !sha) {
    console.error("Usage: node scripts/verify-workstream-handoff.mjs packet.json open-prs.json CURRENT_MAIN_SHA");
    process.exitCode = 2;
  } else {
    try {
      const packet = JSON.parse(fs.readFileSync(packetFile, "utf8"));
      const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
      const result = validateHandoff(packet, snapshot, sha);
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    } catch (error) {
      console.error("Invalid handoff input: " + error.message);
      process.exitCode = 2;
    }
  }
}
