const MAX_SECRET_AGE_DAYS = 90;

const monitoredSecrets = [
  { label: "Groq provider key", dateVariable: "GROQ_API_KEY_ROTATED_AT" },
  { label: "Gemini provider key", dateVariable: "GEMINI_API_KEY_ROTATED_AT" },
  { label: "OpenRouter provider key", dateVariable: "OPENROUTER_API_KEY_ROTATED_AT" },
  { label: "Inngest event key", dateVariable: "INNGEST_EVENT_KEY_ROTATED_AT" },
  { label: "Supabase server key", dateVariable: "SUPABASE_SERVICE_ROLE_KEY_ROTATED_AT" },
] as const;

export type SecretRotationStatus = {
  label: string;
  dateVariable: string;
  state: "current" | "due" | "unknown";
  ageDays: number | null;
};

export function getSecretRotationStatuses(now = Date.now()): SecretRotationStatus[] {
  return monitoredSecrets.map(({ label, dateVariable }) => {
    const value = process.env[dateVariable];
    const rotatedAt = value ? Date.parse(value) : Number.NaN;
    if (!Number.isFinite(rotatedAt) || rotatedAt > now) return { label, dateVariable, state: "unknown", ageDays: null };
    const ageDays = Math.floor((now - rotatedAt) / (24 * 60 * 60 * 1000));
    return { label, dateVariable, state: ageDays > MAX_SECRET_AGE_DAYS ? "due" : "current", ageDays };
  });
}

export { MAX_SECRET_AGE_DAYS };
