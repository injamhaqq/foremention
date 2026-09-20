import assert from "node:assert/strict";
import test from "node:test";
import { selectGroundedFunctionCall } from "../lib/providers/cloudflare-grounding.ts";

const citations = [
  { url: "https://openai.com/news/example", title: "OpenAI News" },
  { url: "https://example.org/report", title: "Independent report" },
];

test("Cloudflare native function calls select only retrieved citation indexes", () => {
  const result = selectGroundedFunctionCall({
    tool_calls: [{
      name: "recordGroundedAnswer",
      arguments: {
        answer: "The retrieved evidence supports this answer.",
        source_indexes: [2, 1, 2],
      },
    }],
  }, citations);

  assert.deepEqual(result, {
    ok: true,
    answer: "The retrieved evidence supports this answer.",
    citations: [citations[1], citations[0]],
  });
});

test("OpenAI-compatible nested function calls are accepted without extracting answer-text URLs", () => {
  const result = selectGroundedFunctionCall({
    choices: [{
      message: {
        content: "This untrusted text is ignored by citation selection: https://not-a-source.invalid",
        tool_calls: [{
          function: {
            name: "recordGroundedAnswer",
            arguments: JSON.stringify({
              answer: "Structured answer only.",
              source_indexes: [1],
            }),
          },
        }],
      },
    }],
  }, citations);

  assert.deepEqual(result, {
    ok: true,
    answer: "Structured answer only.",
    citations: [citations[0]],
  });
});

test("missing structured evidence selection fails closed", () => {
  assert.deepEqual(selectGroundedFunctionCall({}, citations), {
    ok: false,
    error: "The grounded model did not return the required structured evidence selection.",
  });
});

test("out-of-range or empty source selections fail closed", () => {
  for (const source_indexes of [[3], []]) {
    assert.deepEqual(selectGroundedFunctionCall({
      tool_calls: [{ name: "recordGroundedAnswer", arguments: { answer: "x", source_indexes } }],
    }, citations), {
      ok: false,
      error: "The grounded model selected an invalid retrieved source index.",
    });
  }
});
