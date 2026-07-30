import Link from "next/link";
import { Arrow } from "@/components/brand";
import type { AgentControlPlaneView } from "@/lib/agent-control-plane";

const statusLabel = {
  waiting: "Waiting",
  running: "Running",
  review: "Review required",
  complete: "Complete",
  failed: "Needs attention",
  cancelled: "Cancelled",
} as const;

export function AgentControlPlane({ plane, compact = false }: { plane: AgentControlPlaneView; compact?: boolean }) {
  const telemetryLabel = plane.telemetry === "fictional"
    ? "Fictional product demonstration"
    : plane.telemetry === "recorded"
      ? "Recorded agent telemetry"
      : "Derived from persisted run records";
  return <section className={`agent-plane ${compact ? "agent-plane--compact" : ""}`}>
    <header className="agent-plane__header">
      <div>
        <span className="eyebrow">Foremention Agent Control Plane</span>
        <h2>{compact ? "See exactly what the system did." : "Six agents. One inspectable evidence chain."}</h2>
        <p>{compact ? "Every stage reports a persisted state instead of hiding work behind a magic score." : "Foremention coordinates provider collection and deterministic analysis as separate agents. Each one has a narrow job, a visible evidence boundary, and no permission to fabricate missing results."}</p>
      </div>
      <div className="agent-plane__telemetry"><span>{telemetryLabel}</span><strong>{plane.latestRunId ? `Run ${plane.latestRunId.slice(0, 8).toUpperCase()}` : "No run yet"}</strong>{plane.latestRunId && <Link href={`/app/runs/${plane.latestRunId}`}>Inspect run <Arrow /></Link>}</div>
    </header>
    <div className="agent-plane__summary">
      <div><span>Agents</span><strong>{plane.agents.length}</strong></div>
      <div><span>Running</span><strong>{plane.activeAgents}</strong></div>
      <div><span>Waiting / review</span><strong>{plane.waitingAgents}</strong></div>
      <div><span>Attention</span><strong>{plane.failedAgents}</strong></div>
    </div>
    <div className="agent-plane__grid">
      {plane.agents.map((agent, index) => <article className={`agent-card agent-card--${agent.status}`} key={agent.id}>
        <div className="agent-card__top"><span>{String(index + 1).padStart(2, "0")} · {agent.mode}</span><strong>{statusLabel[agent.status]}</strong></div>
        <h3>{agent.name}</h3>
        <p>{agent.summary}</p>
        {agent.metrics.length > 0 && <div className="agent-card__metrics">{agent.metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>}
        {!compact && <div className="agent-card__boundary"><span>Evidence boundary</span><p>{agent.evidenceBoundary}</p></div>}
        <footer><span>{agent.telemetry === "recorded" ? "Stage telemetry" : agent.telemetry === "fictional" ? "Demo only" : "Existing run record"}</span><small>{agent.observedAt || "Not run"}</small></footer>
      </article>)}
    </div>
    {compact && <Link className="agent-plane__link" href="/app/agents">Open Agent Control Plane <Arrow /></Link>}
  </section>;
}
