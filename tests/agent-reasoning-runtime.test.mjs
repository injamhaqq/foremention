import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REASONING_INPUT_COST_PER_MILLION_USD,
  DEFAULT_REASONING_MODEL,
  DEFAULT_REASONING_OUTPUT_COST_PER_MILLION_USD,
  estimateReasoningCostUsd,
  formatOpenAIReasoningError,
  resolveReasoningPricing,
  validateCustomerSuccessDraftOutput,
  validateResearchInsightReasoningOutput,
  validateSupportReplyDraftOutput,
} from "../lib/agent-os/reasoning-core.ts";

test("default reasoning model uses the pinned Luna cost reservation", () => {
  const previousInput = process.env.FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD;
  const previousOutput = process.env.FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD;
  delete process.env.FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD;
  delete process.env.FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD;
  try {
    assert.equal(DEFAULT_REASONING_MODEL, "gpt-5.6-luna");
    assert.deepEqual(resolveReasoningPricing(DEFAULT_REASONING_MODEL), {
      inputPerMillionUsd: DEFAULT_REASONING_INPUT_COST_PER_MILLION_USD,
      outputPerMillionUsd: DEFAULT_REASONING_OUTPUT_COST_PER_MILLION_USD,
    });
  } finally {
    if (previousInput === undefined) delete process.env.FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD;
    else process.env.FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD = previousInput;
    if (previousOutput === undefined) delete process.env.FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD;
    else process.env.FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD = previousOutput;
  }
});

test("reasoning cost includes both input and output usage", () => {
  assert.equal(
    estimateReasoningCostUsd(1_000_000, 1_000_000, { inputPerMillionUsd: 0.2, outputPerMillionUsd: 1.2 }),
    1.4,
  );
});

test("research reasoning rejects invented evidence keys", () => {
  const output = {
    summary: "A bounded summary.",
    findings: [{
      title: "Finding",
      observation: "Observed.",
      why_it_matters: "Worth checking.",
      next_step: "Inspect.",
      evidence_keys: ["answer:invented"],
    }],
    limitations: [],
  };
  assert.equal(validateResearchInsightReasoningOutput(output, new Set(["answer:real"])), null);
});

test("customer success draft rejects unsupported fact keys", () => {
  const output = {
    subject: "Next step",
    body: "Please review the next step.",
    purpose: "Help the customer continue activation.",
    evidence_keys: ["fact:made_up"],
  };
  assert.equal(validateCustomerSuccessDraftOutput(output, new Set(["fact:activation_stage"])), null);
});


test("support reply draft rejects unsupported diagnostic keys", () => {
  const output = {
    internal_summary: "Needs review.",
    subject: "Re: collection issue",
    body: "We received your request and need to inspect this further.",
    needs_human_investigation: true,
    evidence_keys: ["workspace:invented"],
  };
  assert.equal(
    validateSupportReplyDraftOutput(output, new Set(["ticket:request", "workspace:latest_run_status"])),
    null,
  );
});

test("support reply draft preserves bounded human-investigation state", () => {
  const output = {
    internal_summary: "The packet does not establish a root cause.",
    subject: "Re: collection issue",
    body: "We received your request. The recorded workspace state does not establish the cause, so we need to inspect it further.",
    needs_human_investigation: true,
    evidence_keys: ["ticket:request", "workspace:latest_run_status"],
  };
  assert.deepEqual(
    validateSupportReplyDraftOutput(output, new Set(["ticket:request", "workspace:latest_run_status"])),
    output,
  );
});


test("reasoning error diagnostics preserve only sanitized OpenAI metadata", () => {
  assert.equal(
    formatOpenAIReasoningError(
      429,
      { error: { code: "credit_balance_exhausted", type: "insufficient_quota" } },
      "req_123",
    ),
    "OpenAI reasoning request failed with status 429 code=credit_balance_exhausted type=insufficient_quota request_id=req_123.",
  );
});
