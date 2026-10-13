/** The reviewed onboarding question list is an approval boundary, not a suggestion slot. */
export type ApprovedBuyerQuestionsResult =
  | { questions: string[]; error: null }
  | { questions: null; error: string };

const controls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function validateApprovedBuyerQuestions(input: unknown): ApprovedBuyerQuestionsResult {
  if (!Array.isArray(input)) {
    return { questions: null, error: "Review and approve your buyer questions before creating a workspace." };
  }
  if (input.length === 0) {
    return { questions: null, error: "Approve at least one buyer question. Workspace-only setup without questions is not available yet." };
  }
  if (input.length > 5) {
    return { questions: null, error: "Approve at most five buyer questions. No question will be silently removed." };
  }

  const questions: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") {
      return { questions: null, error: "Every approved buyer question must be text." };
    }
    const normalized = value.normalize("NFKC").replace(controls, " ").trim();
    if (!normalized) {
      return { questions: null, error: "Remove blank lines or enter the exact buyer question you approve." };
    }
    if (normalized.length > 1000) {
      return { questions: null, error: "Each buyer question must be at most 1,000 characters. Nothing was truncated." };
    }
    const key = normalized.toLocaleLowerCase("en");
    if (seen.has(key)) {
      return { questions: null, error: "Buyer questions must be unique. Remove duplicates before approving." };
    }
    seen.add(key);
    questions.push(normalized);
  }
  return { questions, error: null };
}

export const MAX_BUYER_QUESTION_LENGTH = 1000;

/** True when the reviewed wording would have to be cut to persist. Never truncate approved wording. */
export function exceedsBuyerQuestionLength(value: unknown) {
  return typeof value === "string"
    && value.normalize("NFKC").replace(controls, " ").trim().length > MAX_BUYER_QUESTION_LENGTH;
}
