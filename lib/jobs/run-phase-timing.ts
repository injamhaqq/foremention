import { logOperationalEvent } from "../structured-logger.ts";

// Durable Inngest steps may replay. Each receipt measures only one *executed*
// step body, never inferred queue wait or customer-visible time to first value.
// Phase names are fixed constants: no prompt, email, URL or provider response.
export type RunPhase =
  | "load_run"
  | "start_supervisor"
  | "load_prompts"
  | "load_identity"
  | "record_question_scout"
  | "check_provider_circuit"
  | "mark_running"
  | "start_collector"
  | "persist_answer"
  | "record_collector"
  | "count_sources"
  | "mark_for_review"
  | "generate_source_map"
  | "notify_owner";

export async function measureRunPhase<T>(
  phase: RunPhase,
  runId: string,
  operation: () => Promise<T>,
  clock: () => number = () => performance.now(),
): Promise<T> {
  const started = clock();
  let status = 200;
  try {
    return await operation();
  } catch (error) {
    status = 500;
    throw error;
  } finally {
    const elapsed = clock() - started;
    // Protect the logger if a platform clock behaves unexpectedly.
    const durationMs = Number.isFinite(elapsed) ? Math.max(0, Math.min(3_600_000, Math.round(elapsed))) : 0;
    logOperationalEvent("run_phase_timing", { runId, phase, status, durationMs });
  }
}
