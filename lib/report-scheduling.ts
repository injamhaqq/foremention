import type { ReportCadence } from "./reporting.ts";

export type ReportDeliveryConfig = {
  enabled: boolean;
  provider: string | null;
  fromAddress: string | null;
};

export type ReportDeliveryReadiness = {
  ready: boolean;
  reason: "ready" | "disabled" | "provider_unconfigured" | "sender_unconfigured" | "provider_unsupported";
};

export const REPORT_DELIVERY_MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MINUTES = [5, 30, 120, 720] as const;
const SUPPORTED_EMAIL_PROVIDERS = new Set(["resend", "postmark", "sendgrid", "ses"]);

export function reportDeliveryReadiness(config: ReportDeliveryConfig): ReportDeliveryReadiness {
  if (!config.enabled) return { ready: false, reason: "disabled" };
  const provider = config.provider?.trim().toLowerCase() || "";
  if (!provider) return { ready: false, reason: "provider_unconfigured" };
  if (!SUPPORTED_EMAIL_PROVIDERS.has(provider)) return { ready: false, reason: "provider_unsupported" };
  if (!config.fromAddress?.trim() || !/^\S+@\S+\.\S+$/.test(config.fromAddress.trim())) return { ready: false, reason: "sender_unconfigured" };
  return { ready: true, reason: "ready" };
}

function addClampedMonths(input: Date, months: number) {
  const year = input.getUTCFullYear();
  const month = input.getUTCMonth();
  const day = input.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const next = new Date(input.getTime());
  next.setUTCFullYear(targetYear, normalizedMonth, Math.min(day, lastDay));
  return next;
}

export function computeNextReportRun(cadence: ReportCadence, from = new Date()) {
  if (!Number.isFinite(from.getTime())) throw new Error("A valid schedule anchor is required.");
  if (cadence === "manual") return null;
  if (cadence === "weekly") return new Date(from.getTime() + 7 * 86_400_000);
  if (cadence === "monthly") return addClampedMonths(from, 1);
  if (cadence === "quarterly") return addClampedMonths(from, 3);
  const exhaustive: never = cadence;
  throw new Error(`Unsupported report cadence: ${exhaustive}`);
}

export function computeReportDeliveryRetry(attemptNumber: number, from = new Date()) {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) throw new Error("Delivery attempt number must start at 1.");
  if (!Number.isFinite(from.getTime())) throw new Error("A valid retry anchor is required.");
  if (attemptNumber >= REPORT_DELIVERY_MAX_ATTEMPTS) return null;
  const delayMinutes = RETRY_DELAYS_MINUTES[Math.min(attemptNumber - 1, RETRY_DELAYS_MINUTES.length - 1)];
  return new Date(from.getTime() + delayMinutes * 60_000);
}

export function reportDeliveryConfigFromEnv(env: Record<string, string | undefined> = process.env) {
  return {
    enabled: env.REPORT_EMAIL_DELIVERY_ENABLED === "true",
    provider: env.REPORT_EMAIL_PROVIDER || null,
    fromAddress: env.REPORT_EMAIL_FROM || null,
  } satisfies ReportDeliveryConfig;
}

export function reportDeliveryBlockedMessage(readiness: ReportDeliveryReadiness) {
  switch (readiness.reason) {
    case "ready": return null;
    case "disabled": return "External report delivery is disabled. The report can still be generated, exported, printed, or shared securely.";
    case "provider_unconfigured": return "External report delivery is disabled until a real email provider is configured.";
    case "provider_unsupported": return "External report delivery is disabled because the configured email provider is not supported by the reporting delivery adapter.";
    case "sender_unconfigured": return "External report delivery is disabled until a verified sender address is configured.";
  }
}
