// Chat06 (A14 support, A18 support): bounded schedule catch-up, DST-stable
// local time, baseline model pin admission, week-stable digest keys.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MAX_SCHEDULE_CATCH_UP_STEPS,
  nextFutureScheduleAt,
  nextScheduleAt,
  scheduleModelPinAdmits,
} from "../lib/measurement-schedules.ts";
import { isoWeekKey } from "../lib/jobs/job-calendar.ts";

const localTime = (instant, timeZone) => new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);

test("an outage of many cadences collects once, then jumps to the next future occurrence", () => {
  const due = "2026-06-01T13:00:00.000Z"; // 09:00 New York (EDT)
  const now = new Date("2026-10-13T06:00:00.000Z");
  const next = nextFutureScheduleAt(due, "weekly", "America/New_York", now);
  assert.ok(next > now, "next occurrence must be in the future");
  assert.ok(next.getTime() - now.getTime() <= 7 * 24 * 3_600_000 + 3_600_000, "no more than one cadence ahead");
  assert.equal(localTime(next, "America/New_York"), "09:00", "local wall-clock time preserved across the outage");
  // The naive one-step advance would still be overdue and re-admit every hour.
  assert.ok(nextScheduleAt(due, "weekly", "America/New_York") <= now);
});

test("on-time schedules advance exactly one cadence (no behavior change)", () => {
  const due = "2026-10-12T13:00:00.000Z";
  const now = new Date("2026-10-12T13:17:00.000Z");
  assert.equal(
    nextFutureScheduleAt(due, "weekly", "America/New_York", now).toISOString(),
    nextScheduleAt(due, "weekly", "America/New_York").toISOString(),
  );
});

test("catch-up across the November DST fall-back keeps 09:00 local", () => {
  const due = "2026-10-26T13:00:00.000Z"; // Mon 09:00 EDT
  const now = new Date("2026-11-03T00:00:00.000Z"); // after fall-back on 2026-11-01
  const next = nextFutureScheduleAt(due, "weekly", "America/New_York", now);
  assert.equal(next.toISOString(), "2026-11-09T14:00:00.000Z"); // 09:00 EST
  assert.equal(localTime(next, "America/New_York"), "09:00");
});

test("monthly catch-up and half-hour zones stay on local wall time", () => {
  const next = nextFutureScheduleAt("2026-01-31T03:30:00.000Z", "monthly", "Asia/Kolkata", new Date("2026-05-15T00:00:00.000Z"));
  assert.ok(next > new Date("2026-05-15T00:00:00.000Z"));
  assert.equal(localTime(next, "Asia/Kolkata"), "09:00");
});

test("catch-up is bounded", () => {
  assert.ok(MAX_SCHEDULE_CATCH_UP_STEPS >= 52 * 7);
  assert.throws(() => nextFutureScheduleAt("1990-01-01T00:00:00.000Z", "weekly", "UTC", new Date("2026-10-13T00:00:00.000Z")), /too far overdue/);
});

test("baseline model snapshot must match the configured model for a later cycle", () => {
  assert.equal(scheduleModelPinAdmits("llama-3.3-70b-versatile", "llama-3.3-70b-versatile"), true);
  assert.equal(scheduleModelPinAdmits("llama-3.3-70b-versatile", "llama-4-scout"), false);
  assert.equal(scheduleModelPinAdmits(null, "llama-4-scout"), true, "legacy schedule without snapshot");
  assert.equal(scheduleModelPinAdmits("llama-3.3-70b-versatile", ""), false, "no configured model never admits");
  assert.equal(scheduleModelPinAdmits(null, undefined), false);
});

test("dispatcher applies the model pin before reservation and uses bounded catch-up", async () => {
  const source = await readFile(new URL("../lib/jobs/measurement-schedule-dispatcher.ts", import.meta.url), "utf8");
  const pin = source.indexOf("scheduleModelPinAdmits(schedule.model_snapshot");
  const quota = source.indexOf('supabaseRest("rpc/reserve_run_quota_server"');
  const candidate = source.indexOf('await supabaseRest("runs", {');
  assert.ok(pin > 0 && pin < candidate && candidate < quota, "pin hold precedes run creation and quota reservation");
  assert.match(source, /const nextRunAt = nextFutureScheduleAt\(schedule\.next_run_at, schedule\.cadence, schedule\.timezone, dispatchNow\)/);
  assert.doesNotMatch(source, /const nextRunAt = nextScheduleAt\(/);
});

test("weekly digest key is stable across a retry or re-run within the same ISO week", () => {
  assert.equal(isoWeekKey(new Date("2026-10-12T08:00:00.000Z")), "2026-10-12"); // Monday cron
  assert.equal(isoWeekKey(new Date("2026-10-13T23:59:59.000Z")), "2026-10-12"); // retried Tuesday
  assert.equal(isoWeekKey(new Date("2026-10-18T23:59:59.000Z")), "2026-10-12"); // Sunday
  assert.equal(isoWeekKey(new Date("2026-10-19T00:00:00.000Z")), "2026-10-19");
  assert.equal(isoWeekKey(new Date("2027-01-01T00:00:00.000Z")), "2026-12-28"); // year boundary
  assert.throws(() => isoWeekKey(new Date("x")));
});
