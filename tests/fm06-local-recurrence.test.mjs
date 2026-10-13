import assert from "node:assert/strict";
import test from "node:test";
import { nextScheduleAt } from "../lib/measurement-schedules.ts";

test("UTC weekly, biweekly and leap-month cadence remain deterministic", () => {
  assert.equal(nextScheduleAt("2026-03-01T09:30:15.123Z", "weekly", "UTC").toISOString(), "2026-03-08T09:30:15.123Z");
  assert.equal(nextScheduleAt("2026-03-01T09:30:15.123Z", "biweekly", "UTC").toISOString(), "2026-03-15T09:30:15.123Z");
  assert.equal(nextScheduleAt("2024-01-31T23:00:00.124Z", "monthly", "UTC").toISOString(), "2024-02-29T23:00:00.124Z");
});

test("weekly New York spring transition preserves local 09:30 rather than drifting by an hour", () => {
  assert.equal(
    nextScheduleAt("2026-03-01T14:30:00.000Z", "weekly", "America/New_York").toISOString(),
    "2026-03-08T13:30:00.000Z",
  );
});

test("weekly New York fall transition picks the first valid repeated 01:30", () => {
  assert.equal(
    nextScheduleAt("2026-10-25T05:30:00.000Z", "weekly", "America/New_York").toISOString(),
    "2026-11-01T05:30:00.000Z",
  );
});

test("nonexistent 02:30 at spring DST gap is shifted forward to 03:30", () => {
  assert.equal(
    nextScheduleAt("2026-03-01T07:30:00.000Z", "weekly", "America/New_York").toISOString(),
    "2026-03-08T07:30:00.000Z",
  );
});

test("monthly schedule preserves local hour across spring DST change", () => {
  assert.equal(
    nextScheduleAt("2026-02-15T14:15:00.000Z", "monthly", "America/New_York").toISOString(),
    "2026-03-15T13:15:00.000Z",
  );
});

test("non-DST Dhaka and quarter-hour Kathmandu offsets retain exact clock and date", () => {
  assert.equal(
    nextScheduleAt("2026-01-15T14:00:00.000Z", "weekly", "Asia/Dhaka").toISOString(),
    "2026-01-22T14:00:00.000Z",
  );
  assert.equal(
    nextScheduleAt("2026-02-28T10:00:00.000Z", "monthly", "Asia/Kathmandu").toISOString(),
    "2026-03-28T10:00:00.000Z",
  );
});

test("bad recurrence input fails closed", () => {
  assert.throws(() => nextScheduleAt("invalid-date", "weekly", "UTC"), /Schedule start time is invalid/);
  assert.throws(() => nextScheduleAt("2026-01-01T10:00:00Z", "weekly", "Mars/Base"), /valid IANA timezone/);
  assert.throws(() => nextScheduleAt("2026-01-01T10:00:00Z", "daily", "UTC"), /Unsupported measurement cadence/);
});
