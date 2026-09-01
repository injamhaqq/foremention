import { execFileSync } from "node:child_process";

const forbiddenExact = new Set([
  ".github/copilot-instructions.md",
  ".github/agents/foremention-autopilot.agent.md",
  ".github/actionlint.yaml",
  "scripts/validate-autopilot-diff.mjs",
  ".mcp.json",
]);

const forbiddenPrefixes = [
  ".github/workflows/",
  ".github/actions/",
  ".github/autopilot/",
  ".claude/hooks/",
];

const forbiddenSecretPatterns = [
  /^\.env$/,
  /^\.env\.(?!example$)/,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)/,
];

function changedEntries() {
  const output = execFileSync("git", ["diff", "--cached", "--name-status", "-z"], {
    encoding: "utf8",
  });

  if (!output) return [];
  const fields = output.split("\0").filter(Boolean);
  const entries = [];

  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (/^[RC]/.test(status)) {
      const from = fields[index++];
      const to = fields[index++];
      entries.push({ status, paths: [from, to] });
    } else {
      const path = fields[index++];
      entries.push({ status, paths: [path] });
    }
  }

  return entries;
}

function isForbidden(path) {
  return (
    forbiddenExact.has(path) ||
    forbiddenPrefixes.some((prefix) => path.startsWith(prefix)) ||
    forbiddenSecretPatterns.some((pattern) => pattern.test(path))
  );
}

const entries = changedEntries();
const violations = [];

for (const entry of entries) {
  for (const path of entry.paths) {
    if (isForbidden(path)) {
      violations.push(`${entry.status}\t${path}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Foremention Autopilot blocked a self-modifying or sensitive patch:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(2);
}

console.log(`Foremention Autopilot diff guard accepted ${entries.length} changed entr${entries.length === 1 ? "y" : "ies"}.`);
