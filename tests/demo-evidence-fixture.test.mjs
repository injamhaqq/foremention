import test from "node:test";
import assert from "node:assert/strict";
import { demoAnswerRows, demoRunRows, demoRuns, demoPrompts, getDemoRunAnswers, getDemoSourceMap } from "../lib/demo-data.ts";

test("fictional Record totals and brand presence are derived from inspectable answers", () => {
  for (const run of demoRuns) {
    const answers = getDemoRunAnswers(run.id);
    assert.equal(run.answers, answers.length);
    assert.equal(run.citations, answers.reduce((sum, answer) => sum + answer.citations.length, 0));
    assert.equal(run.prompts, new Set(answers.map((answer) => answer.prompt)).size);
    assert.equal(run.presence, Math.round(answers.filter((answer) => answer.answer.includes("Northstar HR")).length / answers.length * 100));
    assert.ok(answers.every((answer) => answer.model === "fictional-demo-model" && answer.answer.startsWith("Fictional demonstration only")));
    assert.ok(answers.every((answer) => answer.collectedAt === run.date));
    assert.ok(answers.every((answer) => answer.status === (run.status === "review" ? "unreviewed" : "verified")));
  }
});

test("fictional sources conserve citation counts and stay within the selected Record", () => {
  for (const run of demoRuns) {
    const sources = getDemoSourceMap(run.id);
    const answers = getDemoRunAnswers(run.id);
    assert.equal(sources.reduce((sum, source) => sum + source.evidenceCount, 0), run.citations);
    assert.ok(sources.every((source) => source.sourceId === source.id && source.reviewedAt === null));
    for (const citation of answers.flatMap((answer) => answer.citations)) assert.ok(sources.some((source) => source.url === citation.url));
  }
  assert.deepEqual(getDemoRunAnswers("unknown-record"), []);
  assert.deepEqual(getDemoSourceMap("unknown-record"), []);
  assert.equal(getDemoSourceMap(demoRuns[0].id).length, 8);
  assert.equal(getDemoSourceMap(demoRuns[1].id).length, 6);
});

test("Intelligence and Records share exact question, provider, model and sample data", () => {
  const approved = demoPrompts.filter((prompt) => prompt.approved);
  assert.equal(approved.length, 4);
  for (const run of demoRunRows) {
    const answers = demoAnswerRows.filter((answer) => answer.run_id === run.id);
    assert.equal(run.answer_count, answers.length);
    assert.equal(run.prompt_count, approved.length);
    assert.deepEqual(new Set(answers.map((answer) => answer.prompt_text)), new Set(approved.map((prompt) => prompt.text)));
    assert.deepEqual(new Set(answers.map((answer) => answer.provider)), new Set(run.provider_ids));
    assert.equal(run.first_mention_pct, Math.round(answers.filter((answer) => answer.brand_present && answer.brand_position === 1).length / answers.length * 100));
  }
  assert.equal(demoRuns[0].answers, 16);
});
