import * as Sentry from "@sentry/cloudflare";

/**
 * Error name the operator searches for in Sentry. scrubSentryEvent replaces the
 * exception value and deletes the message, so the probe is identified only by
 * this fixed type, its fixed fingerprint and two non-sensitive tags.
 */
export const SENTRY_OPERATOR_PROBE_ERROR_NAME = "ForementionOperatorAlertProbe";
export const SENTRY_OPERATOR_PROBE_FINGERPRINT = "foremention-operator-alert-probe";

export type SentryOperatorProbeState = "sentry_captured" | "sentry_not_configured" | "sentry_failed";

/**
 * Sends one fixed, non-sensitive Sentry event for the controlled operator alert
 * probe. Never throws: telemetry must not block the email alert path. It carries
 * no customer data, request data, recipient or message text.
 */
export function captureSentryOperatorProbe(buildCommit: string): SentryOperatorProbeState {
  try {
    if (!Sentry.getClient()) return "sentry_not_configured";
    const probe = new Error("operator_alert_probe");
    probe.name = SENTRY_OPERATOR_PROBE_ERROR_NAME;
    Sentry.captureException(probe, {
      level: "warning",
      fingerprint: [SENTRY_OPERATOR_PROBE_FINGERPRINT],
      tags: { foremention_probe: "operator_alert", build_commit: buildCommit.slice(0, 12) },
    });
    return "sentry_captured";
  } catch {
    return "sentry_failed";
  }
}
