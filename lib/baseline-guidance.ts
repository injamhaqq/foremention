type BaselineRun = { id: string; status: string; answers: number; citations: number };
export type BaselineStep = { label: string; detail: string; href: string; done: boolean };
type BaselineInput = {
  website: string | null | undefined;
  approvedQuestions: number;
  /** Questions the customer approved earlier and then paused. Every row in
   * `prompts` was explicitly approved before it was saved; `active=false`
   * only removes it from future collections. */
  pausedQuestions?: number;
  providerAvailable: boolean;
  newestRun: BaselineRun | null;
  observedRun: BaselineRun | null;
  answers: Array<{ status: string }>;
  sourceCount: number;
  reviewedSourceCount: number;
};

/** Read-only presentation over the active project's existing records, not an
 * activation metric, new truth store, or permission to create an opportunity. */
export function buildBaselineGuidance(input: BaselineInput) {
  const run = input.observedRun;
  const recordHref = run ? `/app/runs/${encodeURIComponent(run.id)}` : "/app/runs";
  const hasAnswers = Boolean(run && run.answers > 0 && input.answers.length > 0);
  const recordReviewed = Boolean(run && ["complete", "partial"].includes(run.status)
    && hasAnswers && input.answers.length === run.answers
    && input.answers.every((answer) => answer.status === "verified"));
  const noCitations = recordReviewed && run?.citations === 0;
  const activeQuestions = Math.max(0, input.approvedQuestions);
  const pausedQuestions = Math.max(0, input.pausedQuestions || 0);
  const reviewedQuestions = activeQuestions + pausedQuestions;
  // Reviewed = approved (active or paused). Collection still needs at least one active question.
  const questionsReady = reviewedQuestions >= 5 && activeQuestions >= 1;
  const questionDetail = pausedQuestions > 0
    ? activeQuestions > 0
      ? `${Math.min(5, reviewedQuestions)} of 5 priority questions approved (${activeQuestions} active, ${pausedQuestions} paused). Paused questions stay approved and are skipped in collections.`
      : `${Math.min(5, reviewedQuestions)} of 5 priority questions approved, but all are paused. Resume at least one to collect answers.`
    : `${Math.min(5, activeQuestions)} of 5 priority questions approved. Choose questions that matter to a buying decision.`;
  const steps: BaselineStep[] = [
    { label: "Add your website", detail: "Confirm which company and category this project measures.", done: Boolean(input.website), href: "/app/onboarding" },
    { label: "Review buyer questions", detail: questionDetail, done: questionsReady, href: "/app/prompts" },
    { label: "Collect your first answers", detail: input.providerAvailable ? "Run the approved questions with an available provider and review the cost estimate." : "A monitoring connection must be available before collection can start.", done: hasAnswers, href: input.providerAvailable ? "/app/prompts" : "/app/settings#providers" },
    { label: "Review your Recommendation Record", detail: "Check the saved answers and provider context. Approve only what was actually returned.", done: recordReviewed, href: recordHref },
    { label: noCitations ? "Understand the evidence limits" : "Inspect returned evidence", detail: noCitations ? "No citations were returned. The answer remains inspectable; no source-backed opportunity or causal explanation is established." : "Inspect cited evidence inside the Record. A source must be human-reviewed before it supports an opportunity.", done: Boolean(recordReviewed && (noCitations || input.sourceCount > 0 && input.reviewedSourceCount > 0)), href: recordHref },
  ];
  const complete = steps.every((step) => step.done);
  let next: BaselineStep = steps.find((step) => !step.done) || (noCitations
    ? { ...steps[4], label: "Inspect answer limitations" }
    : { label: "Review evidence-backed opportunities", detail: "Choose a reviewed finding before creating a Change Specification. No action is required when evidence is insufficient.", href: "/app/opportunities", done: false });
  const newest = input.newestRun;
  if (newest && ["failed", "cancelled", "queued", "running"].includes(newest.status)) {
    const active = ["queued", "running"].includes(newest.status);
    next = { label: active ? "Open collection in progress" : "Inspect the latest collection", detail: active ? "Answers are still being collected. Earlier evidence remains available." : "This collection did not complete. Inspect its status before retrying; earlier evidence remains available.", href: `/app/runs/${encodeURIComponent(newest.id)}`, done: false };
  } else if (input.website && questionsReady && run && !hasAnswers) {
    next = { label: "Inspect the incomplete Record", detail: "The recorded answer set is unavailable. Inspect the collection before treating it as a baseline.", href: recordHref, done: false };
  }
  return { steps, next, complete, recordReviewed, noCitations, questionsReady };
}
