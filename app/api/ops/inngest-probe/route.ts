import { inngest } from "@/lib/jobs/inngest";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

type ProbeRow = {
  service: "inngest";
  build_commit: string;
  requested_at: string;
  executed_at: string | null;
};

type HealthPayload = { buildCommit?: unknown };

const BUILD_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const NO_STORE = { "Cache-Control": "no-store" };

async function resolveCurrentBuild(request: Request) {
  const response = await fetch(new URL("/api/health", request.url), {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Production health is not ready for a runtime probe.");
  const payload = await response.json() as HealthPayload;
  const buildCommit = String(payload.buildCommit || "").trim().toLowerCase();
  if (!BUILD_COMMIT_PATTERN.test(buildCommit)) throw new Error("The deployed build commit could not be verified.");
  return buildCommit;
}

async function loadProbe(buildCommit: string) {
  const rows = await supabaseRest<ProbeRow[]>(
    `runtime_service_probes?select=service,build_commit,requested_at,executed_at&service=eq.inngest&build_commit=eq.${buildCommit}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

function probeResponse(buildCommit: string, probe: ProbeRow | null) {
  return {
    service: "inngest" as const,
    buildCommit,
    status: probe?.executed_at ? "executed" as const : probe ? "pending" as const : "not_requested" as const,
    requestedAt: probe?.requested_at || null,
    executedAt: probe?.executed_at || null,
    note: "This runtime probe contains no customer data and makes no AI-provider request.",
  };
}

function unavailable(error: unknown) {
  const migrationPending = isMissingRelationError(error);
  return Response.json(
    {
      error: migrationPending
        ? "The runtime probe ledger is not available on this release yet."
        : "The runtime probe could not be completed.",
    },
    { status: 503, headers: NO_STORE },
  );
}

export async function GET(request: Request) {
  try {
    const buildCommit = await resolveCurrentBuild(request);
    const probe = await loadProbe(buildCommit);
    return Response.json(probeResponse(buildCommit, probe), { headers: NO_STORE });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  if (!process.env.INNGEST_EVENT_KEY) {
    return Response.json({ error: "Inngest event dispatch is not configured." }, { status: 503, headers: NO_STORE });
  }

  try {
    // The caller never supplies a SHA. The exact deployed release is resolved
    // from the same public health contract used by the production release gate.
    const buildCommit = await resolveCurrentBuild(request);
    const existing = await loadProbe(buildCommit);
    if (existing) {
      const body = probeResponse(buildCommit, existing);
      return Response.json(body, { status: body.status === "executed" ? 200 : 202, headers: NO_STORE });
    }

    const inserted = await supabaseRest<ProbeRow[]>(
      "runtime_service_probes?on_conflict=service,build_commit",
      {
        method: "POST",
        serviceRole: true,
        prefer: "resolution=ignore-duplicates,return=representation",
        body: { service: "inngest", build_commit: buildCommit },
      },
    );
    const probe = inserted[0] || await loadProbe(buildCommit);
    if (!inserted[0]) {
      const body = probeResponse(buildCommit, probe);
      return Response.json(body, { status: body.status === "executed" ? 200 : 202, headers: NO_STORE });
    }

    try {
      await inngest.send({
        id: `runtime-probe-${buildCommit}`,
        name: "foremention/runtime.probe",
        data: { buildCommit },
      });
    } catch {
      // Only remove a still-pending marker. If the event executed before an
      // upstream response failure, its durable evidence must not be erased.
      await supabaseRest(
        `runtime_service_probes?service=eq.inngest&build_commit=eq.${buildCommit}&executed_at=is.null`,
        { method: "DELETE", serviceRole: true },
      ).catch(() => undefined);
      return Response.json({ error: "Inngest did not accept the runtime probe." }, { status: 502, headers: NO_STORE });
    }

    return Response.json(probeResponse(buildCommit, probe), { status: 202, headers: NO_STORE });
  } catch (error) {
    return unavailable(error);
  }
}
