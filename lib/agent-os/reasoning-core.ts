export const DEFAULT_REASONING_MODEL = "gpt-5.6-luna";
export const DEFAULT_REASONING_INPUT_COST_PER_MILLION_USD = 0.20;
export const DEFAULT_REASONING_OUTPUT_COST_PER_MILLION_USD = 1.20;

export type ReasoningPricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

function optionalPositiveNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function resolveReasoningPricing(
  model: string,
  env: Record<string, string | undefined> = process.env,
): ReasoningPricing | null {
  const configuredInput = optionalPositiveNumber(env.FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD);
  const configuredOutput = optionalPositiveNumber(env.FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD);
  if (configuredInput !== null && configuredOutput !== null) {
    return { inputPerMillionUsd: configuredInput, outputPerMillionUsd: configuredOutput };
  }
  if (model === DEFAULT_REASONING_MODEL) {
    return {
      inputPerMillionUsd: DEFAULT_REASONING_INPUT_COST_PER_MILLION_USD,
      outputPerMillionUsd: DEFAULT_REASONING_OUTPUT_COST_PER_MILLION_USD,
    };
  }
  return null;
}

export function estimateReasoningCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: ReasoningPricing,
) {
  const inputCost = Math.max(0, inputTokens) * pricing.inputPerMillionUsd / 1_000_000;
  const outputCost = Math.max(0, outputTokens) * pricing.outputPerMillionUsd / 1_000_000;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

const clean = (value: unknown, max: number) =>
  String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

const stringArray = (value: unknown, maxItems: number, maxChars: number) =>
  Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === "string")
      .slice(0, maxItems)
      .map((item) => clean(item, maxChars))
      .filter(Boolean)
    : [];

export type ResearchInsightFinding = {
  title: string;
  observation: string;
  why_it_matters: string;
  next_step: string;
  evidence_keys: string[];
};

export type ResearchInsightReasoningOutput = {
  summary: string;
  findings: ResearchInsightFinding[];
  limitations: string[];
};

export function validateResearchInsightReasoningOutput(
  value: unknown,
  allowedEvidenceKeys: Set<string>,
): ResearchInsightReasoningOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const summary = clean(record.summary, 1600);
  if (!summary) return null;
  if (!Array.isArray(record.findings) || record.findings.length > 4) return null;

  const findings: ResearchInsightFinding[] = [];
  for (const raw of record.findings) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    const evidenceKeys = stringArray(item.evidence_keys, 8, 120);
    if (!evidenceKeys.length || evidenceKeys.some((key) => !allowedEvidenceKeys.has(key))) return null;
    const finding = {
      title: clean(item.title, 180),
      observation: clean(item.observation, 900),
      why_it_matters: clean(item.why_it_matters, 900),
      next_step: clean(item.next_step, 900),
      evidence_keys: Array.from(new Set(evidenceKeys)),
    };
    if (!finding.title || !finding.observation || !finding.why_it_matters || !finding.next_step) return null;
    findings.push(finding);
  }

  return {
    summary,
    findings,
    limitations: stringArray(record.limitations, 6, 500),
  };
}

export type CustomerSuccessDraftOutput = {
  subject: string;
  body: string;
  purpose: string;
  evidence_keys: string[];
};

export function validateCustomerSuccessDraftOutput(
  value: unknown,
  allowedEvidenceKeys: Set<string>,
): CustomerSuccessDraftOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const subject = clean(record.subject, 120);
  const body = typeof record.body === "string" ? record.body.trim().slice(0, 1400) : "";
  const purpose = clean(record.purpose, 300);
  const evidenceKeys = Array.isArray(record.evidence_keys)
    ? Array.from(new Set(
      record.evidence_keys
        .filter((item): item is string => typeof item === "string")
        .map((item) => clean(item, 120))
        .filter(Boolean),
    ))
    : [];
  if (
    !subject
    || !body
    || !purpose
    || !evidenceKeys.length
    || evidenceKeys.some((key) => !allowedEvidenceKeys.has(key))
  ) return null;
  return { subject, body, purpose, evidence_keys: evidenceKeys };
}
