import { inngest } from "@/lib/jobs/inngest";
import { supabaseRest } from "@/lib/supabase-rest";

type ProbeRow = {
  build_commit: string;
  executed_at: string | null;
};

const BUILD_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

export const runtimeServiceProbe = inngest.createFunction(
  {
    id: "runtime-service-probe",
    retries: 2,
    triggers: { event: "foremention/runtime.probe" },
  },
  async ({ event, step }) => {
    const buildCommit = String((event.data as { buildCommit?: unknown })?.buildCommit || "").trim().toLowerCase();
    if (!BUILD_COMMIT_PATTERN.test(buildCommit)) return { skipped: true, reason: "invalid_build_commit" };

    const rows = await step.run("load-requested-runtime-probe", () =>
      supabaseRest<ProbeRow[]>(
        `runtime_service_probes?select=build_commit,executed_at&service=eq.inngest&build_commit=eq.${buildCommit}&limit=1`,
        { serviceRole: true },
      ));
    const probe = rows[0];
    if (!probe) return { buildCommit, skipped: true, reason: "probe_not_requested" };
    if (probe.executed_at) return { buildCommit, executed: true, alreadyExecuted: true, executedAt: probe.executed_at };

    const executedAt = new Date().toISOString();
    await step.run("record-runtime-probe-execution", () =>
      supabaseRest(
        `runtime_service_probes?service=eq.inngest&build_commit=eq.${buildCommit}&executed_at=is.null`,
        {
          method: "PATCH",
          serviceRole: true,
          prefer: "return=minimal",
          body: { executed_at: executedAt, updated_at: executedAt },
        },
      ));

    return { buildCommit, executed: true, executedAt };
  },
);
