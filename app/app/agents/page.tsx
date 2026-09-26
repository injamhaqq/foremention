import { AgentControlPlane } from "@/components/agent-control-plane";
import { OperatingAgentQueue } from "@/components/operating-agent-queue";
import { SupportOperatorInbox } from "@/components/support-operator-inbox";
import { requireViewer } from "@/lib/auth";
import { loadAgentControlPlane } from "@/lib/data";
import { loadOperatingAgentActions } from "@/lib/agent-os/actions";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import { loadOpenSupportTickets } from "@/lib/agent-os/support";
import { loadCompanyOperationalCostReadiness } from "@/lib/company-operational-cost-readiness";
import { CompanyOperationalCostCard } from "@/components/company-operational-cost-card";

export default async function AgentsPage() {
  const viewer = await requireViewer("/app/agents");
  const plane = await loadAgentControlPlane(viewer);
  const companyOperator = viewer.mode === "supabase" && isCompanyOperatorEmail(viewer.email);
  const [operatingActions, supportTickets, costReadiness] = companyOperator
    ? await Promise.all([
      loadOperatingAgentActions(50).catch(() => []),
      loadOpenSupportTickets(25).catch(() => []),
      loadCompanyOperationalCostReadiness().catch(() => null),
    ])
    : [[], [], null];
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Owned intelligence infrastructure</span>
        <h1>Agent Control Plane</h1>
        <p>Foremention’s own orchestration layer turns one approved buyer question into provider evidence, normalized sources, brand observations, and a human-review checkpoint. It uses the existing cost-capped run—no extra model call is added for decoration.</p>
      </div>
    </div>
    <AgentControlPlane plane={plane} />
    {companyOperator && <CompanyOperationalCostCard snapshot={costReadiness} />}
    {companyOperator && <SupportOperatorInbox tickets={supportTickets} />}
    {companyOperator && <OperatingAgentQueue actions={operatingActions} />}
    <div className="evidence-note"><strong>Operating rule</strong><p>Agents may validate, collect, normalize, measure, and route work. Only a human may approve evidence for customer-facing conclusions. An unavailable stage stays unavailable.</p></div>
  </main>;
}
