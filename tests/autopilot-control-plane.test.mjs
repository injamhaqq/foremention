import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("Copilot receives a concise repository-wide Foremention operating contract", () => {
  const instructions = read(".github/copilot-instructions.md");
  assert.match(instructions, /Recommendation Intelligence/i);
  assert.match(instructions, /CLAUDE\.md/);
  assert.match(instructions, /RED -> GREEN -> VERIFY/);
  assert.match(instructions, /exact SHA/i);
  assert.match(instructions, /never fabricate/i);
  assert.match(instructions, /one bounded unit of work/i);
});

test("Foremention exposes a dedicated Copilot cloud autopilot agent", () => {
  const agent = read(".github/agents/foremention-autopilot.agent.md");
  assert.match(agent, /^---[\s\S]*description:/);
  assert.match(agent, /target:\s*github-copilot/);
  assert.match(agent, /recover reality/i);
  assert.match(agent, /highest-value unresolved problem/i);
  assert.match(agent, /one bounded execution cycle/i);
  assert.match(agent, /do not auto-merge/i);
  assert.match(agent, /founder approval/i);
});

test("autopilot state and operating documentation are persistent and truth-safe", () => {
  const state = read("FOREMENTION_STATE.md");
  const docs = read("docs/AUTOPILOT.md");

  assert.match(state, /Current canonical main SHA/i);
  assert.match(state, /Open autonomous work/i);
  assert.match(state, /Founder-decision queue/i);
  assert.match(state, /Execution ledger/i);
  assert.match(docs, /private or internal/i);
  assert.match(docs, /public-repository fallback/i);
  assert.match(docs, /COPILOT_ASSIGNMENT_TOKEN/);
  assert.match(docs, /not an OpenAI API key/i);
});

test("public-repository fallback is bounded, serialized, and never auto-merges", () => {
  const workflow = read(".github/workflows/autopilot-control.yml");
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /COPILOT_ASSIGNMENT_TOKEN/);
  assert.match(workflow, /copilot-swe-agent\[bot\]/);
  assert.match(workflow, /autopilot:ready/);
  assert.doesNotMatch(workflow, /gh\s+pr\s+merge/i);
  assert.doesNotMatch(workflow, /enable_auto_merge/i);
});

test("autopilot issue template scopes work to a single safe cycle", () => {
  const template = read(".github/ISSUE_TEMPLATE/autopilot-task.yml");
  assert.match(template, /autopilot:ready/);
  assert.match(template, /one bounded execution cycle/i);
  assert.match(template, /acceptance criteria/i);
  assert.match(template, /founder approval/i);
});
