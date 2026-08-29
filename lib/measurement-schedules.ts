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
  if (!questionIds.length || questionIds.length > 100 || questionIds.some((id) => !UUID.test(id))) throw new Error("Choose between 1 and 100 workspace buyer questions.");
  if (!providerIds.length || providerIds.length > 8 || providerIds.some((id) => !PROVIDER.test(id))) throw new Error("Choose between 1 and 8 supported providers.");
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

export function nextScheduleAt(from: Date | string, cadence: MeasurementCadence, timezone = "UTC") {
  assertTimeZone(timezone);
  const current = new Date(from);
  if (!Number.isFinite(current.getTime())) throw new Error("Schedule start time is invalid.");
  const next = new Date(current.getTime());
  if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (cadence === "biweekly") next.setUTCDate(next.getUTCDate() + 14);
  else if (cadence === "monthly") {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  } else throw new Error("Unsupported measurement cadence.");
  return next;
}

export function scheduleIdempotencyKey(schedule: { id: string; methodologySnapshot?: string | null; modelSnapshot?: string | null }, dueAt: Date | string) {
  const due = new Date(dueAt);
  if (!schedule.id || !Number.isFinite(due.getTime())) throw new Error("Schedule id and due time are required.");
  const methodology = String(schedule.methodologySnapshot || "unknown").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 48);
  const model = String(schedule.modelSnapshot || "provider-default").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 64);
  return `measurement-schedule:${schedule.id}:${due.toISOString()}:${methodology}:${model}`;
}
