#!/usr/bin/env node
// Chat06: 1 / 5 / 20 organization operating-capacity model.
// Pure arithmetic over explicit, labelled inputs. Every input is either
// MEASURED (read-only production metadata / Cloudflare analytics, dated),
// CODE (a constant in the repository), VENDOR (a published plan limit, dated),
// or ASSUMPTION (a hypothesis to replace with measurement). Output is a
// planning illustration, never a forecast, invoice or price.
//
//   node docs/execution/attach-v1/06-proposals/tools/capacity-model.mjs [--json]

export const INPUTS = {
  questionsPerRun: { value: 5, kind: "CODE", note: "five-question baseline (GROQ_SPEND_LIMITS comment); max 10 per run" },
  runsPerOrgMonth: { value: 4.35, kind: "ASSUMPTION", note: "weekly Measurement Schedule (52/12); biweekly halves it" },
  attemptsPerAnswer: { value: 265 / 196, kind: "MEASURED", note: "production run_attempts/run_answers row counts, 2026-10-13" },
  maxAttemptsPerQuestion: { value: 3, kind: "CODE", note: "LIVE_COLLECTION_LIMITS.providerRetries=2 (+1 first try)" },
  estCostPerAttemptUsd: { value: 0.05 + (512 * 0.075 + 1200 * 0.30) / 1e6, kind: "CODE", note: "wrangler.jsonc GROQ_* rate vars at max tokens; estimate, not invoice" },
  reservedPerQuestionUsd: { value: 0.10, kind: "CODE", note: "GROQ_SPEND_LIMITS.reservedCostPerPromptUsd" },
  monthlyOrgCapUsd: { value: 5.0, kind: "CODE", note: "GROQ_SPEND_LIMITS.maxMonthlyOrgSpendUsd" },
  storagePerAnswerKiB: { value: 868352 / 196 / 1024, kind: "MEASURED", note: "pg_total_relation_size(run_answers)/rows incl. indexes, 2026-10-13" },
  storagePerAttemptKiB: { value: 376832 / 265 / 1024, kind: "MEASURED", note: "pg_total_relation_size(run_attempts)/rows incl. indexes, 2026-10-13" },
  dbBaselineMiB: { value: 30526611 / 1048576, kind: "MEASURED", note: "pg_database_size, 2026-10-13" },
  inngestFixedStepsPerRun: { value: 19, kind: "CODE", note: "run-multi-engine-scan non-per-question steps (+1 run execution)" },
  inngestStepsPerQuestion: { value: 3, kind: "CODE", note: "check-cancellation + collect + persist" },
  inngestIdleExecutionsMonth: { value: 2880 * 2 + 720 * 2 + 240 * 2 + 30 * 2 * 2 + 5, kind: "CODE", note: "zoho */15, schedule dispatcher hourly, interrupted-run sweeper */3h, 2 daily crons, weekly digest; >=2 executions each when idle" },
  emailsPerOwnerMonth: { value: 4.35 + 0.1, kind: "CODE", note: "weekly digest + amortized first-run email; one owner per org assumed" },
  onboardingMinutes: { value: 45, kind: "ASSUMPTION", note: "founder-led setup, once per new org (amortized over month 1)" },
  reviewMinutesPerRun: { value: 20, kind: "ASSUMPTION", note: "human evidence review per run" },
  exceptionMinutesPerOrgMonth: { value: 10, kind: "ASSUMPTION", note: "failed/interrupted run triage, email/support" },
};

export const VENDOR_LIMITS = {
  inngestFreeExecutionsMonth: { value: 50000, source: "https://www.inngest.com/pricing (read 2026-10-13): Free 50k executions, 5 concurrent steps; execution pauses at quota" },
  workersFreeRequestsDay: { value: 100000, source: "https://developers.cloudflare.com/workers/platform/limits/ (read 2026-10-13): Free 100,000/day, 10 ms CPU, 5 cron triggers/account" },
  resendFreeEmailsMonth: { value: 3000, source: "https://resend.com/pricing (read 2026-10-13): Free 3,000/month, 100/day" },
  supabaseFreeDbMiB: { value: 500, source: "Supabase Free plan database size (not re-read this run; verify on supabase.com/pricing)" },
};

export function model(orgs, inputs = INPUTS) {
  const v = Object.fromEntries(Object.entries(inputs).map(([k, x]) => [k, x.value]));
  const runs = orgs * v.runsPerOrgMonth;
  const answers = runs * v.questionsPerRun;
  const expectedAttempts = answers * v.attemptsPerAnswer;
  const maxAttempts = answers * v.maxAttemptsPerQuestion;
  const inngestRunExecutions = runs * (1 + v.inngestFixedStepsPerRun + v.inngestStepsPerQuestion * v.questionsPerRun) + (expectedAttempts - answers);
  const inngestTotal = v.inngestIdleExecutionsMonth + inngestRunExecutions;
  const storageMiBMonth = (answers * v.storagePerAnswerKiB + expectedAttempts * v.storagePerAttemptKiB) / 1024;
  const supportHours = (orgs * (v.onboardingMinutes + v.exceptionMinutesPerOrgMonth) + runs * v.reviewMinutesPerRun) / 60;
  return {
    orgs,
    runsPerMonth: round(runs, 1),
    plannedAnswers: round(answers, 0),
    expectedProviderAttempts: round(expectedAttempts, 0),
    worstCaseProviderAttempts: round(maxAttempts, 0),
    estimatedProviderSpendUsd: round(expectedAttempts * v.estCostPerAttemptUsd, 2),
    worstCaseProviderSpendUsd: round(Math.min(maxAttempts * v.estCostPerAttemptUsd, orgs * v.monthlyOrgCapUsd), 2),
    reservationHeldUsd: round(answers * v.reservedPerQuestionUsd, 2),
    spendCapBindsPerOrg: answers / orgs * v.reservedPerQuestionUsd > v.monthlyOrgCapUsd,
    inngestExecutions: round(inngestTotal, 0),
    inngestShareOfFree: round(inngestTotal / VENDOR_LIMITS.inngestFreeExecutionsMonth.value, 3),
    newStorageMiBPerMonth: round(storageMiBMonth, 2),
    dbMiBAfter12Months: round(v.dbBaselineMiB + 12 * storageMiBMonth, 1),
    emailsPerMonth: round(orgs * v.emailsPerOwnerMonth, 0),
    founderSupportHoursMonth1: round(supportHours, 1),
    founderSupportHoursSteadyState: round((orgs * v.exceptionMinutesPerOrgMonth + runs * v.reviewMinutesPerRun) / 60, 1),
  };
}
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = [1, 5, 20].map((n) => model(n));
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ inputs: INPUTS, vendor_limits: VENDOR_LIMITS, rows }, null, 1) + "\n");
  } else {
    const cols = Object.keys(rows[0]);
    process.stdout.write(`| metric | ${rows.map((r) => `${r.orgs} org${r.orgs > 1 ? "s" : ""}`).join(" | ")} |\n|---|${rows.map(() => "---:").join("|")}|\n`);
    for (const c of cols.slice(1)) process.stdout.write(`| ${c} | ${rows.map((r) => r[c]).join(" | ")} |\n`);
  }
}
