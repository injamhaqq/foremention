import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

function runProtect(filePath) {
  return spawnSync(process.execPath, [".claude/hooks/protect-sensitive.mjs"], {
    input: JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: filePath },
    }),
    encoding: "utf8",
  });
}

test("project MCP config exposes only the approved shared design and browser servers", () => {
  const config = JSON.parse(read(".mcp.json"));
  assert.equal(config.mcpServers.figma.type, "http");
  assert.equal(config.mcpServers.figma.url, "https://mcp.figma.com/mcp");
  assert.equal(config.mcpServers.playwright.command, "npx");
  assert.ok(config.mcpServers.playwright.args.includes("@playwright/mcp@latest"));
  assert.ok(config.mcpServers.playwright.args.includes("--isolated"));
  assert.ok(config.mcpServers.playwright.args.includes("--headless"));
});

test("Claude hooks re-inject project context and guard sensitive agent writes", () => {
  const settings = JSON.parse(read(".claude/settings.json"));
  assert.ok(Array.isArray(settings.hooks.SessionStart));
  assert.ok(Array.isArray(settings.hooks.PreToolUse));
  assert.equal(settings.hooks.PreToolUse[0].matcher, "Edit|Write");

  const blocked = runProtect(".env.local");
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /blocked an agent edit to sensitive path/i);

  const allowed = runProtect("components/example.tsx");
  assert.equal(allowed.status, 0);
});

test("Foremention product skill locks the five-object architecture, retires Source X-Ray, and retires the custom identity", () => {
  const skill = read(".claude/skills/foremention-product-truth/SKILL.md");
  assert.match(skill, /Attention[\s\S]*Questions[\s\S]*Records[\s\S]*Comparisons[\s\S]*Settings/);
  assert.match(skill, /Source X-Ray is retired as a standalone feature/i);
  assert.match(skill, /evidence inspection/i);
  assert.match(skill, /custom Foremention logo\/mark\/wordmark identity is retired/i);
  assert.match(skill, /white\/reverse variants/i);
  assert.match(skill, /neutral text label `Foremention`/i);
});

test("release and specialist review primitives are present", () => {
  const release = read(".claude/skills/foremention-release-gate/SKILL.md");
  const security = read(".claude/agents/security-reviewer.md");
  const experience = read(".claude/agents/experience-reviewer.md");

  assert.match(release, /RED -> GREEN -> VERIFY/);
  assert.match(release, /exact SHA/i);
  assert.match(release, /retired visual identity absence/i);
  assert.match(security, /Supabase RLS/);
  assert.match(security, /organization\/workspace isolation/);
  assert.match(experience, /Foremention 5/);
  assert.match(experience, /320px/);
  assert.match(experience, /no standalone Source X-Ray/i);
  assert.match(experience, /no white\/reverse\/inverse variants/i);
});

test("CLAUDE.md carries the founder workflow and retired-identity constitution", () => {
  const constitution = read("CLAUDE.md");
  assert.match(constitution, /Show the intended visual first/i);
  assert.match(constitution, /Foremention 5/);
  assert.match(constitution, /Attention[\s\S]*Questions[\s\S]*Records[\s\S]*Comparisons[\s\S]*Settings/);
  assert.match(constitution, /Source X-Ray is retired as a standalone feature/i);
  assert.match(constitution, /custom Foremention logo\/mark\/wordmark identity is retired/i);
  assert.match(constitution, /neutral text label `Foremention`/i);
});
