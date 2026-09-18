"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentActionRecord } from "@/lib/agent-os/contracts";

const agentLabel: Record<AgentActionRecord["agentId"], string> = {
  "research-insight": "Research / Insight",
  "customer-success": "Customer Success",
  onboarding: "Onboarding",
  sales: "Sales",
  marketing: "Marketing",
  support: "Support",
  product: "Product",
  qa: "QA / Evaluation",
  engineering: "Engineering",
  "finance-ops": "Finance / Ops",
  ceo: "CEO",
};

export function OperatingAgentQueue({ actions }: { actions: AgentActionRecord[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/agent-actions/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Decision could not be recorded.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Decision could not be recorded.");
    } finally {
      setBusy(null);
    }
  }

  const pending = actions.filter((action) => action.status === "pending_approval");
  return <section className="agent-plane">
    <header className="agent-plane__header">
      <div>
        <span className="eyebrow">Company operating agents</span>
        <h2>Operating queue</h2>
        <p>Low-risk observations may be recorded automatically. External communication, commercial commitments, financial actions, production changes, destructive actions, and legal/compliance actions stop here for human approval.</p>
      </div>
      <div className="agent-plane__telemetry"><span>Founder decisions</span><strong>{pending.length} pending</strong></div>
    </header>
    {error && <div className="evidence-note"><strong>Decision not recorded</strong><p>{error}</p></div>}
    <div className="agent-plane__grid">
      {actions.slice(0, 12).map((action) => {
        const payload = action.payload || {};
        const messageSubject = typeof payload.messageSubject === "string" ? payload.messageSubject : "";
        const messageBody = typeof payload.messageBody === "string" ? payload.messageBody : "";
        return <article className={`agent-card agent-card--${action.status === "pending_approval" ? "review" : action.status === "failed" ? "failed" : "complete"}`} key={action.id}>
        <div className="agent-card__top"><span>{agentLabel[action.agentId]} · {action.riskLevel} risk</span><strong>{action.status.replaceAll("_", " ")}</strong></div>
        <h3>{action.title}</h3>
        <p>{action.rationale}</p>
        <div className="agent-card__metrics">
          <div><span>Effect</span><strong>{action.effectClass.replaceAll("_", " ")}</strong></div>
          <div><span>Approval</span><strong>{action.requiresApproval ? "Required" : "Not required"}</strong></div>
        </div>
        {(messageSubject || messageBody) && <div className="agent-card__boundary">
          <span>Draft for review</span>
          {messageSubject && <p><strong>{messageSubject}</strong></p>}
          {messageBody && <p>{messageBody}</p>}
        </div>}
        {action.status === "pending_approval" && <footer>
          <button type="button" disabled={busy === action.id} onClick={() => decide(action.id, "approve")}>Approve</button>
          <button type="button" disabled={busy === action.id} onClick={() => decide(action.id, "reject")}>Reject</button>
        </footer>}
      </article>;
      })}
    </div>
    {!actions.length && <div className="evidence-note"><strong>No operating-agent actions yet</strong><p>After the feature flag is enabled, a human-reviewed run triggers Research / Insight and Customer Success actions. The CEO brief runs daily.</p></div>}
  </section>;
}
