export type AiMeasurementContext = {
  promptVersion: string;
  parserVersion: string;
  provider: string;
  model: string;
  modelVersion: string;
  retrievalVersion: string;
  policyVersion: string;
  schemaVersion: string;
  evaluationVersion: string;
};

export const AI_MEASUREMENT_CONTEXT_KEYS = [
  "promptVersion",
  "parserVersion",
  "provider",
  "model",
  "modelVersion",
  "retrievalVersion",
  "policyVersion",
  "schemaVersion",
  "evaluationVersion",
] as const;

export const AI_MEASUREMENT_CONTEXT_VERSIONS = {
  promptVersion: "provider-prompts.2026-08-30.1",
  parserVersion: "provider-adapters.2026-08-30.1",
  modelVersion: "unreported",
  retrievalVersion: "returned-references.2026-08-30.1",
  policyVersion: "recommendation-quality.2026-08-30.1",
  schemaVersion: "recommendation-record.2026-08-30.1",
  evaluationVersion: "ai-evaluation.2026-08-30.1",
} as const;

export function parseAiMeasurementContext(value: unknown): AiMeasurementContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of AI_MEASUREMENT_CONTEXT_KEYS) {
    if (typeof record[key] !== "string" || !String(record[key]).trim()) return null;
  }
  return record as AiMeasurementContext;
}
