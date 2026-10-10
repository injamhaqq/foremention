export type MeasurementCadence = "weekly" | "biweekly" | "monthly";

export type MeasurementScheduleInput = {
  cadence: MeasurementCadence;
  timezone: string;
  questionIds: string[];
  providerIds: string[];
  modelSnapshot: string | null;
  methodologySnapshot: string;
  locale?: string;
  market?: string;
  enabled?: boolean;
};

export type ValidMeasurementSchedule = Required<Omit<MeasurementScheduleInput, "modelSnapshot">> & {
  modelSnapshot: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

// These limits deliberately mirror LIVE_COLLECTION_LIMITS in collection-policy;
// the behavioral test fails if either side changes without aligning the other.
// Persisting more questions/providers would create schedules the collector rejects.
export const MAX_SCHEDULE_QUESTION_COUNT = 10;
export const MAX_SCHEDULE_PROVIDER_COUNT = 1;

function assertTimeZone(timezone: string) {
  try {
    // Keep timezone validation tied to the runtime's IANA database instead of
    // maintaining a stale allow-list in Foremention.
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("Choose a valid IANA timezone for recurring measurement.");
  }
}

export function validateMeasurementSchedule(input: MeasurementScheduleInput): ValidMeasurementSchedule {
  if (!["weekly", "biweekly", "monthly"].includes(input.cadence)) throw new Error("Unsupported measurement cadence.");
  const timezone = String(input.timezone || "").trim();
  assertTimeZone(timezone);
  const questionIds = Array.from(new Set(input.questionIds || []));
  const providerIds = Array.from(new Set((input.providerIds || []).map((value) => String(value).trim().toLowerCase())));
  if (!questionIds.length || questionIds.length > MAX_SCHEDULE_QUESTION_COUNT || questionIds.some((id) => !UUID.test(id))) throw new Error(`Choose between 1 and ${MAX_SCHEDULE_QUESTION_COUNT} workspace buyer questions.`);
  if (providerIds.length !== MAX_SCHEDULE_PROVIDER_COUNT || providerIds.some((id) => !PROVIDER.test(id))) throw new Error("Choose exactly one supported provider.");
  const methodologySnapshot = String(input.methodologySnapshot || "").trim();
  if (!methodologySnapshot || methodologySnapshot.length > 80) throw new Error("A methodology snapshot is required.");
  const modelSnapshot = input.modelSnapshot === null ? null : String(input.modelSnapshot || "").trim() || null;
  if (modelSnapshot && modelSnapshot.length > 160) throw new Error("Model snapshot is too long.");
  const locale = String(input.locale || "en-US").trim();
  const market = String(input.market || "global").trim();
  if (!locale || locale.length > 32) throw new Error("Locale is invalid.");
  if (!market || market.length > 80) throw new Error("Market is invalid.");
  return {
    cadence: input.cadence,
    timezone,
    questionIds,
    providerIds,
    modelSnapshot,
    methodologySnapshot,
    locale,
    market,
    enabled: input.enabled !== false,
  };
}

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

function zonedWallTime(instant: Date, formatter: Intl.DateTimeFormat): WallTime {
  const parts = new Map<string, number>(formatter.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
  const read = (field: string) => {
    const value = parts.get(field);
    if (value === undefined || !Number.isFinite(value)) throw new Error("Timezone calendar components are unavailable.");
    return value;
  };
  return {
    year: read("year"), month: read("month"), day: read("day"),
    hour: read("hour"), minute: read("minute"), second: read("second"),
    millisecond: instant.getUTCMilliseconds(),
  };
}

function wallTimeAsUtcMillis(value: WallTime) {
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second, value.millisecond);
}

/**
 * Advance in the customer's IANA timezone rather than adding UTC days.
 *
 * Clock policy:
 * - Normal weeks/months keep the same local wall-clock time.
 * - At a fall-back fold choose the earlier occurrence of the repeated time.
 * - In a spring-forward gap shift the missing time forward by the gap.
 * - Monthly dates beyond the target month's length clamp to its final day.
 *
 * For gap-adjusted or month-end-clamped occurrences, the *next* recurrence
 * starts from the adjusted occurrence: preserving an original anchor across
 * multiple gaps/months would require a separate persisted recurrence anchor.
 */
export function nextScheduleAt(from: Date | string, cadence: MeasurementCadence, timezone = "UTC") {
  assertTimeZone(timezone);
  const current = new Date(from);
  if (!Number.isFinite(current.getTime())) throw new Error("Schedule start time is invalid.");

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  // Interpret the zoned calendar fields as a naive UTC date only for arithmetic;
  // this is NOT the actual execution instant until converted below.
  const local = new Date(wallTimeAsUtcMillis(zonedWallTime(current, formatter)));
  if (cadence === "weekly") local.setUTCDate(local.getUTCDate() + 7);
  else if (cadence === "biweekly") local.setUTCDate(local.getUTCDate() + 14);
  else if (cadence === "monthly") {
    const day = local.getUTCDate();
    local.setUTCDate(1);
    local.setUTCMonth(local.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
    local.setUTCDate(Math.min(day, lastDay));
  } else throw new Error("Unsupported measurement cadence.");

  const targetWallMillis = local.getTime();
  // Resolve the local wall time by sampling IANA offsets around the desired
  // date; this handles UTC offsets including 30/45 minute regions and DST.
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 12) {
    const sample = new Date(targetWallMillis + hours * 3_600_000);
    offsets.add(wallTimeAsUtcMillis(zonedWallTime(sample, formatter)) - sample.getTime());
  }

  const exact: Date[] = [];
  const shifted: Array<{ instant: Date; delta: number }> = [];
  for (const offset of offsets) {
    const instant = new Date(targetWallMillis - offset);
    if (instant <= current) continue;
    const delta = wallTimeAsUtcMillis(zonedWallTime(instant, formatter)) - targetWallMillis;
    if (delta === 0) exact.push(instant);
    else if (delta > 0) shifted.push({ instant, delta });
  }
  if (exact.length) return exact.sort((a, b) => a.getTime() - b.getTime())[0];
  if (shifted.length) {
    shifted.sort((a, b) => a.delta - b.delta || a.instant.getTime() - b.instant.getTime());
    return shifted[0].instant;
  }
  throw new Error("The next measurement occurrence could not be resolved safely in this timezone.");
}

export function scheduleIdempotencyKey(schedule: { id: string; methodologySnapshot?: string | null; modelSnapshot?: string | null }, dueAt: Date | string) {
  const due = new Date(dueAt);
  if (!schedule.id || !Number.isFinite(due.getTime())) throw new Error("Schedule id and due time are required.");
  const methodology = String(schedule.methodologySnapshot || "unknown").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 48);
  const model = String(schedule.modelSnapshot || "provider-default").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 64);
  return `measurement-schedule:${schedule.id}:${due.toISOString()}:${methodology}:${model}`;
}
