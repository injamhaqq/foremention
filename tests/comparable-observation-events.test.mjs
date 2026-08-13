import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildComparableObservationEvents } from "../lib/comparable-observation-events.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const run = (overrides = {}) => ({
  id: "latest",
  date: "Aug 13, 2026",
  providers: ["groq"],
  prompts: 1,
  answers: 1,
  citations: 1,
  presence: 100,
  firstMention: 100,
  newSources: 1,
  costUsd: 0.01,
  costSource: "recorded",
  tokens: 100,
  ...overrides,
});

const answer = (overrides = {}) => ({
  id: "a1",
  prompt: "Best evidence platform?",
  provider: "groq",
  model: "groq/compound-mini",
  answer: "Foremention is included.",
  citations: [{ url: "https://example.com/new" }],
  status: "verified",
  collectedAt: "Aug 13, 2026",
  ...overrides,
});

test("comparable event layer distinguishes aggregate presence, citation observations, unique sources, and exact answer text", () => {
  const events = buildComparableObservationEvents({
    latest: run({ id: "latest", presence: 100, answers: 1 }),
    previous: run({ id: "previous", presence: 0, answers: 1 }),
    latestAnswers: [answer({ id: "latest-answer", answer: "Foremention is included.", citations: [{ url: "https://example.com/new" }] })],
    previousAnswers: [answer({ id: "previous-answer", answer: "Another platform is included.", citations: [{ url: "https://example.com/old" }] })],
  });

  assert.deepEqual(events.map((event) => event.kind), ["brand_presence", "citation", "source", "answer"]);
  assert.match(events[0].detail, /0% across 1 verified answers → 100% across 1 verified answers/);
  assert.match(events[1].title, /1 new citation observation · 1 no longer returned/);
  assert.match(events[2].title, /1 new unique source · 1 no longer returned/);
  assert.match(events[3].detail, /does not claim meaning, accuracy, buyer behavior, or causation changed/i);
});

test("event layer returns no movement without the exact prior pair selected by intelligence", () => {
  assert.deepEqual(buildComparableObservationEvents({
    latest: run(),
    previous: null,
    latestAnswers: [answer()],
    previousAnswers: [],
  }), []);
});

test("excluded and unreviewed rows never enter comparable answer-slot events", () => {
  const events = buildComparableObservationEvents({
    latest: run({ presence: 0 }),
    previous: run({ id: "previous", presence: 0 }),
    latestAnswers: [answer({ status: "unreviewed", answer: "changed", citations: [{ url: "https://example.com/new" }] })],
    previousAnswers: [answer({ status: "excluded", answer: "old", citations: [{ url: "https://example.com/old" }] })],
  });
  assert.deepEqual(events, []);
});

test("customer event layer never exposes provider cost or token economics", async () => {
  const source = await text("lib/comparable-observation-events.ts");
  assert.doesNotMatch(source, /costUsd|costSource|tokens|collection cost/i);
  assert.match(source, /already-selected exact comparable pair/i);
  assert.match(source, /loadWeeklyIntelligence/);
  assert.match(source, /does not choose which runs are comparable/i);
});
