import { supabaseRest } from "@/lib/supabase-rest";

export const MAX_RECORD_ANSWERS = 500;
export const MAX_RECORD_QUESTIONS = 100;
export const MAX_RECORD_ATTEMPTS = 1000;

export type RecordIntegrityAnswer = {
  id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  answer_text: string;
  citations_json: Array<{ url?: string; title?: string }> | null;
  review_status: "unreviewed" | "verified" | "excluded";
  collected_at: string;
};

export type RecordIntegrityRun = {
  id: string;
  project_id: string;
  status: string;
  provider_ids: string[];
  prompt_count: number;
  answer_count: number;
  citation_count: number;
  brand_presence_pct: number | string;
  methodology_version: string;
  created_at: string;
  completed_at: string | null;
};

type SelectionRow = {
  prompt_id: string | null;
  prompt_key: string;
  prompt_text: string;
};

type AttemptRow = {
  prompt_key: string;
  provider: string;
  status: string;
  attempt_number: number;
};

export type RecordIntegrityResult = {
  run: RecordIntegrityRun;
  answers: RecordIntegrityAnswer[];
  verifiedAnswers: number;
  excludedAnswers: number;
  failedSlots: number;
  missingSlots: number;
  expectedSlots: number;
  completePersistedAnswerSet: boolean;
  completeObservationCoverage: boolean;
  safeConclusion: boolean;
  reason: string | null;
};

const encoded = (value: string) => encodeURIComponent(value);

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

export async function loadRecordIntegrity(input: {
  organizationId: string;
  runId: string;
  projectId?: string;
  token?: string;
  serviceRole?: boolean;
}): Promise<RecordIntegrityResult | null> {
  const projectFilter = input.projectId ? `&project_id=eq.${encoded(input.projectId)}` : "";
  const runs = await supabaseRest<RecordIntegrityRun[]>(
    `runs?select=id,project_id,status,provider_ids,prompt_count,answer_count,citation_count,brand_presence_pct,methodology_version,created_at,completed_at&id=eq.${encoded(input.runId)}&organization_id=eq.${encoded(input.organizationId)}${projectFilter}&limit=1`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  const run = runs[0];
  if (!run) return null;

  const [selections, answers, attempts] = await Promise.all([
    supabaseRest<SelectionRow[]>(
      `run_prompt_selections?select=prompt_id,prompt_key,prompt_text&run_id=eq.${encoded(run.id)}&organization_id=eq.${encoded(input.organizationId)}&order=created_at.asc&limit=${MAX_RECORD_QUESTIONS + 1}`,
      { token: input.token, serviceRole: input.serviceRole },
    ),
    supabaseRest<RecordIntegrityAnswer[]>(
      `run_answers?select=id,prompt_key,prompt_text,provider,model,answer_text,citations_json,review_status,collected_at&run_id=eq.${encoded(run.id)}&organization_id=eq.${encoded(input.organizationId)}&order=collected_at.asc&limit=${MAX_RECORD_ANSWERS + 1}`,
      { token: input.token, serviceRole: input.serviceRole },
    ),
    supabaseRest<AttemptRow[]>(
      `run_attempts?select=prompt_key,provider,status,attempt_number&run_id=eq.${encoded(run.id)}&organization_id=eq.${encoded(input.organizationId)}&order=created_at.asc&limit=${MAX_RECORD_ATTEMPTS + 1}`,
      { token: input.token, serviceRole: input.serviceRole },
    ),
  ]);

  const providerIds = Array.from(new Set(run.provider_ids || []));
  const promptKeys = selections.map((selection) => selection.prompt_key);
  const expectedSlots = selections.length * providerIds.length;
  const answerSlots = answers.map((answer) => `${answer.prompt_key}\u0000${answer.provider}`);
  const expected = new Set(
    promptKeys.flatMap((promptKey) => providerIds.map((provider) => `${promptKey}\u0000${provider}`)),
  );
  const observed = new Set(answerSlots);

  const failed = new Set<string>();
  for (const attempt of attempts) {
    const slot = `${attempt.prompt_key}\u0000${attempt.provider}`;
    if (observed.has(slot)) continue;
    if (["failed", "rate_limited", "excluded"].includes(attempt.status)) failed.add(slot);
  }

  const overflow = selections.length > MAX_RECORD_QUESTIONS
    || answers.length > MAX_RECORD_ANSWERS
    || attempts.length > MAX_RECORD_ATTEMPTS;
  const persistedDenominatorsMatch = !overflow
    && selections.length === Number(run.prompt_count)
    && answers.length === Number(run.answer_count);
  const identityIsUnique = unique(promptKeys)
    && unique(answers.map((answer) => answer.id))
    && unique(answerSlots)
    && providerIds.length === (run.provider_ids || []).length;
  const answersBelongToManifest = answers.every((answer) =>
    expected.has(`${answer.prompt_key}\u0000${answer.provider}`),
  );
  const failedSlotsBelongToManifest = Array.from(failed).every((slot) => expected.has(slot));
  const covered = new Set([...observed, ...failed]);
  const missingSlots = Array.from(expected).filter((slot) => !covered.has(slot)).length;
  const completePersistedAnswerSet = persistedDenominatorsMatch
    && identityIsUnique
    && answersBelongToManifest;
  const completeObservationCoverage = completePersistedAnswerSet
    && failedSlotsBelongToManifest
    && expectedSlots === expected.size
    && covered.size === expected.size
    && missingSlots === 0;

  const verifiedAnswers = answers.filter((answer) => answer.review_status === "verified").length;
  const excludedAnswers = answers.filter((answer) => answer.review_status === "excluded").length;
  const allObservedAnswersReviewed = answers.length > 0
    && answers.every((answer) => answer.review_status === "verified" || answer.review_status === "excluded");
  const safeConclusion = completeObservationCoverage
    && run.status === "complete"
    && failed.size === 0
    && excludedAnswers === 0
    && verifiedAnswers === answers.length
    && allObservedAnswersReviewed;

  let reason: string | null = null;
  if (overflow) reason = "The Record exceeded a bounded integrity read and was withheld rather than truncated.";
  else if (!persistedDenominatorsMatch) reason = "The fetched Record does not match its independently persisted question or answer denominator.";
  else if (!identityIsUnique) reason = "The Record contains duplicate question, provider, answer, or manifest identities.";
  else if (!answersBelongToManifest || !failedSlotsBelongToManifest) reason = "The Record contains an observation outside its frozen question/provider manifest.";
  else if (missingSlots > 0) reason = "One or more planned observation slots have neither a persisted answer nor a terminal failure state.";
  else if (run.status !== "complete" || failed.size > 0 || excludedAnswers > 0) reason = "The Record preserves partial, failed, or excluded observations, so a safe conclusion is withheld.";
  else if (!allObservedAnswersReviewed) reason = "Human review is incomplete, so a safe conclusion is withheld.";

  return {
    run,
    answers: overflow ? [] : answers,
    verifiedAnswers,
    excludedAnswers,
    failedSlots: failed.size,
    missingSlots,
    expectedSlots,
    completePersistedAnswerSet,
    completeObservationCoverage,
    safeConclusion,
    reason,
  };
}
