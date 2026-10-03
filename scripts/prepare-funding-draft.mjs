#!/usr/bin/env node
import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { prepareFundingDraft } from "../lib/company-os/funding-draft.ts";
import { COMPANY_DRAFT_SKILL_PACKAGES, validateCompanySkillPackages } from "../lib/company-os/runtime-bindings.ts";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;

async function boundedInput(path) {
  const file = await open(path, "r");
  try {
    if (!(await file.stat()).isFile()) throw new Error("INPUT_UNREADABLE");
    const buffer = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_INPUT_BYTES) throw new Error("INPUT_TOO_LARGE");
    try { return JSON.parse(buffer.subarray(0, length).toString("utf8")); }
    catch { throw new Error("INPUT_INVALID"); }
  } finally { await file.close(); }
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2].startsWith("--")) {
    console.error("Usage: node --experimental-strip-types scripts/prepare-funding-draft.mjs <input.json>");
    process.exitCode = 2;
    return;
  }
  const registry = validateCompanySkillPackages();
  if (!registry.valid) throw new Error("PACKAGE_INVALID");
  const instructionPackages = [];
  for (const manifest of COMPANY_DRAFT_SKILL_PACKAGES) {
    const contents = await readFile(new URL("../" + manifest.instructionPath, import.meta.url));
    instructionPackages.push({ id: manifest.id, version: manifest.version, instructionPath: manifest.instructionPath, sha256: createHash("sha256").update(contents).digest("hex") });
  }
  const pack = await prepareFundingDraft(await boundedInput(process.argv[2]));
  const artifact = { schemaVersion: 1, runtime: "offline-cli", instructionPackages, pack };
  const artifactDigest = createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
  process.stdout.write(JSON.stringify({ ...artifact, artifactDigest }, null, 2) + "\n");
}

try { await main(); }
catch (error) {
  // Never echo user JSON, paths, provider URLs, or raw parse errors to diagnostics.
  const code = error instanceof Error && ["INPUT_TOO_LARGE", "PACKAGE_INVALID"].includes(error.message) ? error.message : "INPUT_INVALID_OR_UNREADABLE";
  console.error("FUNDING_DRAFT_" + code);
  process.exitCode = 1;
}
