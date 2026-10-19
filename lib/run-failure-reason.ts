// Fix track "ux" (2026-10-19): turn the persisted, already-redacted
// `runs.error_summary` into a reason a customer can act on. The raw summary is
// still shown as a technical detail (after a second redaction pass) so support
// and the founder can correlate it; it is never the headline.
import { redactOperationalText } from "./operational-error.js";

export type RunFailureKind =
  | "capacity"
  | "interrupted"
  | "provider_auth"
  | "model_unavailable"
  | "provider_unavailable"
  | "no_evidence"
  | "configuration"
  | "cancelled"
  | "unknown";

export type RunFailureReason = {
  kind: RunFailureKind;
  /** Short, human-readable headline. */
  title: string;
  /** What happened and what the customer can do next. */
  detail: string;
  /** Whether a Retry with the same questions and provider is a sensible next step. */
  retryable: boolean;
  /** Redacted raw summary for support correlation, or null when none was recorded. */
  technicalDetail: string | null;
};

const RULES: Array<{ kind: RunFailureKind; test: RegExp }> = [
  { kind: "cancelled", test: /\bcancel(?:l)?ed\b/i },
  { kind: "capacity", test: /capacity|quota|rate.?limit|too many requests|\b429\b|ceiling|budget|concurrent|allowance|spend(?:ing)? limit/i },
  { kind: "interrupted", test: /interrupted|timed? ?out|timeout|deadline|worker (?:exceeded|limit)|platform cancellation/i },
  { kind: "provider_auth", test: /unauthori[sz]ed|forbidden|\b401\b|\b403\b|api key|invalid (?:key|credential)|permission denied|authentication/i },
  { kind: "model_unavailable", test: /model[^.]*(?:retired|not found|deprecated|unavailable|does not exist)|\b404\b|no such model/i },
  { kind: "provider_unavailable", test: /\b5\d\d\b|unavailable|overloaded|econn|network|fetch failed|socket|dns|service error|bad gateway/i },
  { kind: "configuration", test: /not configured|missing (?:secret|key|configuration)|requires a secure server connection|pinned to one exact/i },
  { kind: "no_evidence", test: /no (?:usable )?(?:answers?|evidence|citations?)|provider attempt\(s\) failed|empty (?:answer|response)/i },
];

const COPY: Record<RunFailureKind, { title: string; detail: string; retryable: boolean }> = {
  capacity: {
    title: "Collection paused by a usage limit",
    detail: "A daily or monthly evidence allowance, rate limit, or spending ceiling stopped this collection before it could finish. Nothing extra was charged. Retry once the limit resets, or select fewer questions.",
    retryable: true,
  },
  interrupted: {
    title: "Collection was interrupted",
    detail: "The background job stopped before it completed, usually because of a platform timeout. No evidence was invented for the missing answers. Retrying starts a fresh collection with the same questions and provider.",
    retryable: true,
  },
  provider_auth: {
    title: "The AI provider rejected the connection",
    detail: "The provider refused the request credentials. A workspace owner or the Foremention operator needs to check the provider connection before a retry can succeed.",
    retryable: false,
  },
  model_unavailable: {
    title: "The selected AI model is not available",
    detail: "The provider reported that the configured model no longer exists or is not available to this account. The provider configuration needs updating before a retry can succeed.",
    retryable: false,
  },
  provider_unavailable: {
    title: "The AI provider was temporarily unavailable",
    detail: "The provider or the network between Foremention and the provider returned an error. These outages are usually brief; retrying later normally succeeds.",
    retryable: true,
  },
  no_evidence: {
    title: "The provider did not return usable evidence",
    detail: "The collection ran, but the provider returned no answers or citations that can be reviewed. You can retry, or review any partial evidence that was saved.",
    retryable: true,
  },
  configuration: {
    title: "Live collection is not fully configured",
    detail: "A required server-side provider or job setting is missing, so the collection could not start. Contact support; retrying will not help until the configuration is fixed.",
    retryable: false,
  },
  cancelled: {
    title: "Collection was cancelled",
    detail: "Someone cancelled this collection before it finished. No answers or citations were added to the evidence trail. You can start it again with the same questions and provider.",
    retryable: true,
  },
  unknown: {
    title: "Collection failed",
    detail: "This collection stopped without creating answers or citations. Retry with the same questions and provider, or contact support with the technical detail below if it keeps failing.",
    retryable: true,
  },
};

export function classifyRunFailure(errorSummary: string | null | undefined): RunFailureKind {
  const text = typeof errorSummary === "string" ? errorSummary : "";
  if (!text.trim()) return "unknown";
  for (const rule of RULES) if (rule.test.test(text)) return rule.kind;
  return "unknown";
}

export function describeRunFailure(errorSummary: string | null | undefined): RunFailureReason {
  const kind = classifyRunFailure(errorSummary);
  const raw = typeof errorSummary === "string" && errorSummary.trim() ? redactOperationalText(errorSummary, 300) : null;
  return { kind, ...COPY[kind], technicalDetail: raw };
}
