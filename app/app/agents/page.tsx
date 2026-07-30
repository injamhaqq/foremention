import { AgentControlPlane } from "@/components/agent-control-plane";
import { requireViewer } from "@/lib/auth";
import { loadAgentControlPlane } from "@/lib/data";

export default async function AgentsPage() {
  const viewer = await requireViewer("/app/agents");
  const plane = await loadAgentControlPlane(viewer);
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Owned intelligence infrastructure</span>
        <h1>Agent Control Plane</h1>
        <p>Foremention’s own orchestration layer turns one approved buyer question into provider evidence, normalized sources, brand observations, and a human-review checkpoint. It uses the existing cost-capped run—no extra model call is added for decoration.</p>
      </div>
    </div>
    <AgentControlPlane plane={plane} />
    <div className="evidence-note"><strong>Operating rule</strong><p>Agents may validate, collect, normalize, measure, and route work. Only a human may approve evidence for customer-facing conclusions. An unavailable stage stays unavailable.</p></div>
  </main>;
}
