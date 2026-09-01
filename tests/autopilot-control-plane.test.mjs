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

test("Foremention exposes a dedicated Copilot CLI autopilot agent", () => {
  const agent = read(".github/agents/foremention-autopilot.agent.md");
  assert.match(agent, /^---[\s\S]*description:/);
  assert.match(agent, /target:\s*github-copilot/);
  assert.match(agent, /recover reality/i);
  assert.match(agent, /highest-value unresolved problem/i);
  assert.match(agent, /one bounded execution cycle/i);
  assert.match(agent, /do not auto-merge/i);
  assert.match(agent, /founder approval/i);
  assert.match(agent, /outer non-AI publisher/i);
  assert.match(agent, /make no remote GitHub writes/i);
});

test("autopilot state and operating documentation are persistent and truth-safe", () => {
  const state = read("FOREMENTION_STATE.md");
  const docs = read("docs/AUTOPILOT.md");

  assert.match(state, /Current canonical main SHA/i);
  assert.match(state, /Open autonomous work/i);
  assert.match(state, /Founder-decision queue/i);
  assert.match(state, /Execution ledger/i);
  assert.match(docs, /short-lived `GITHUB_TOKEN`/i);
  assert.match(docs, /no `OPENAI_API_KEY`/i);
  assert.match(docs, /Copilot Student/i);
  assert.match(docs, /not unlimited/i);
  assert.match(docs, /privilege separation/i);
});

test("keyless online controller is bounded, serialized, privilege-separated, and never auto-merges", () => {
  const workflow = read(".github/workflows/autopilot-control.yml");
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:[\s\S]*main/);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /copilot-requests:\s*write/);
  assert.match(workflow, /npm install --global @github\/copilot@latest/);
  assert.match(workflow, /--agent foremention-autopilot/);
  assert.match(workflow, /--autopilot/);
  assert.match(workflow, /--max-autopilot-continues 8/);
  assert.match(workflow, /--max-ai-credits 10/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /validate-autopilot-diff\.mjs/);
  assert.match(workflow, /autopilot\/run-/);
  assert.doesNotMatch(workflow, /COPILOT_ASSIGNMENT_TOKEN/);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY/);
  assert.doesNotMatch(workflow, /gh\s+pr\s+merge/i);
  assert.doesNotMatch(workflow, /enable_auto_merge/i);
});

test("cycle prompt keeps remote writes outside the AI job and requires a durable handoff", () => {
  const prompt = read(".github/autopilot/CYCLE_PROMPT.md");
  assert.match(prompt, /Do not.*push/i);
  assert.match(prompt, /outer workflow/i);
  assert.match(prompt, /pr-summary\.md/);
  assert.match(prompt, /founder-decision\.md/);
  assert.match(prompt, /Never manufacture work/i);
});

test("deterministic diff guard blocks autonomous self-modification and secret files", () => {
  const guard = read("scripts/validate-autopilot-diff.mjs");
  assert.match(guard, /\.github\/workflows\//);
  assert.match(guard, /\.github\/autopilot\//);
  assert.match(guard, /foremention-autopilot\.agent\.md/);
  assert.match(guard, /actionlint\.yaml/);
  assert.match(guard, /validate-autopilot-diff\.mjs/);
  assert.match(guard, /\.claude\/hooks\//);
  assert.match(guard, /\.env/);
});

test("actionlint compatibility exception is only for GitHub's new Copilot permission", () => {
  const config = read(".github/actionlint.yaml");
  assert.match(config, /\.github\/workflows\/autopilot-control\.yml/);
  assert.match(config, /unknown permission scope/);
  assert.match(config, /copilot-requests/);
  assert.doesNotMatch(config, /\.github\/workflows\/\*\*/);
  assert.doesNotMatch(config, /syntax-check|shellcheck|untrusted|credential/i);
});

test("autopilot issue template scopes work to a single safe cycle", () => {
  const template = read(".github/ISSUE_TEMPLATE/autopilot-task.yml");
  assert.match(template, /autopilot:ready/);
  assert.match(template, /one bounded execution cycle/i);
  assert.match(template, /acceptance criteria/i);
  assert.match(template, /founder approval/i);
});
