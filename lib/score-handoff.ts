export const PUBLIC_SCORE_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export function safePublicScoreId(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return PUBLIC_SCORE_ID_PATTERN.test(normalized) ? normalized : "";
}

export function scoreOnboardingNext(value: string | null | undefined) {
  const scoreId = safePublicScoreId(value);
  return scoreId ? `/app/onboarding?score_id=${encodeURIComponent(scoreId)}` : "/app";
}
