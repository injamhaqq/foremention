import assert from "node:assert/strict";
import test from "node:test";
import { validateMeasurementSchedule, MAX_SCHEDULE_QUESTION_COUNT, MAX_SCHEDULE_PROVIDER_COUNT } from "../lib/measurement-schedules.ts";
import { LIVE_COLLECTION_LIMITS } from "../lib/collection-policy.ts";

const uuid = (value) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
const base = (overrides = {}) => ({
  cadence: "weekly",
  timezone: "Asia/Dhaka",
  questionIds: [uuid(1)],
  providerIds: ["cloudflare"],
  modelSnapshot: null,
  methodologySnapshot: "observation-v1",
  ...overrides,
});

test("recurring schedule limits match executable live-run contracts", () => {
  assert.equal(MAX_SCHEDULE_QUESTION_COUNT, LIVE_COLLECTION_LIMITS.maxPromptsPerRun);
  assert.equal(MAX_SCHEDULE_PROVIDER_COUNT, LIVE_COLLECTION_LIMITS.maxProvidersPerRun);
});

test("exactly the live question ceiling is accepted, and one extra is rejected", () => {
  const atLimit = Array.from({ length: LIVE_COLLECTION_LIMITS.maxPromptsPerRun }, (_, i) => uuid(i + 1));
  const schedule = validateMeasurementSchedule(base({ questionIds: atLimit }));
  assert.deepEqual(schedule.questionIds, atLimit);
  assert.throws(
    () => validateMeasurementSchedule(base({ questionIds: [...atLimit, uuid(11)] })),
    /between 1 and 10 workspace buyer questions/,
  );
});

test("a recurring schedule refuses multiple providers instead of persisting an unexecutable contract", () => {
  assert.deepEqual(validateMeasurementSchedule(base()).providerIds, ["cloudflare"]);
  assert.throws(
    () => validateMeasurementSchedule(base({ providerIds: ["cloudflare", "groq"] })),
    /exactly one supported provider/,
  );
});

test("duplicates may be safely collapsed but cannot mask unsupported unique cardinality", () => {
  assert.deepEqual(
    validateMeasurementSchedule(base({ questionIds: [uuid(1), uuid(1)] })).questionIds,
    [uuid(1)],
  );
  const over = Array.from({ length: 11 }, (_, i) => uuid(i + 1));
  assert.throws(
    () => validateMeasurementSchedule(base({ questionIds: [...over, ...over] })),
    /between 1 and 10/,
  );
});

test("zero questions and zero providers remain invalid", () => {
  assert.throws(() => validateMeasurementSchedule(base({ questionIds: [] })), /between 1 and 10/);
  assert.throws(() => validateMeasurementSchedule(base({ providerIds: [] })), /exactly one supported provider/);
});
