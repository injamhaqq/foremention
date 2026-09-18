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

  async function execute(id: string) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/agent-actions/${id}/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok && response.status !== 202) {
        throw new Error(payload.error || "Execution could not be completed.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Execution could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  const pending = actions.filter((action) => action.status === "pending_approval");
  const readyToExecute = actions.filter((action) =>
    action.status === "approved"
    && (
      (action.agentId === "customer-success" && action.actionType === "customer_success_message_draft")
      || (action.agentId === "support" && action.actionType === "support_reply_draft")
    )
  );
  return <section className="agent-plane">
    <header className="agent-plane__header">
      <div>
        <span className="eyebrow">Company operating agents</span>
        <h2>Operating queue</h2>
        <p>Low-risk observations may be recorded automatically. External communication, commercial commitments, financial actions, production changes, destructive actions, and legal/compliance actions stop here for human approval.</p>
      </div>
      <div className="agent-plane__telemetry"><span>Founder controls</span><strong>{pending.length} pending · {readyToExecute.length} ready</strong></div>
    </header>
    {error && <div className="evidence-note"><strong>Agent control not completed</strong><p>{error}</p></div>}
    <div className="agent-plane__grid">
      {actions.slice(0, 12).map((action) => {
        const payload = action.payload || {};
        const messageSubject = typeof payload.messageSubject === "string" ? payload.messageSubject : "";
        const messageBody = typeof payload.messageBody === "string" ? payload.messageBody : "";
        const recipientEmail = typeof payload.recipientEmail === "string" ? payload.recipientEmail : "";
        const canExecute =
          action.status === "approved"
          && (
            (action.agentId === "customer-success" && action.actionType === "customer_success_message_draft")
            || (action.agentId === "support" && action.actionType === "support_reply_draft")
          );
        const supportReply = action.agentId === "support" && action.actionType === "support_reply_draft";
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
          {recipientEmail && <p><strong>Recipient:</strong> {recipientEmail}</p>}
          {!recipientEmail && (action.actionType === "customer_success_message_draft" || action.actionType === "support_reply_draft") && <p><strong>Recipient:</strong> unavailable — execution will fail closed.</p>}
          {messageSubject && <p><strong>{messageSubject}</strong></p>}
          {messageBody && <p>{messageBody}</p>}
        </div>}
        {action.execution && <div className="agent-card__boundary">
          <span>Execution receipt</span>
          <p><strong>Status:</strong> {action.execution.status}</p>
          {action.execution.provider && <p><strong>Provider:</strong> {action.execution.provider}</p>}
          {action.execution.providerMessageId && <p><strong>Provider receipt:</strong> {action.execution.providerMessageId}</p>}
          {action.execution.errorCode && <p><strong>Control result:</strong> {action.execution.errorCode}</p>}
        </div>}
        {action.status === "pending_approval" && <footer>
          <button type="button" disabled={busy === action.id} onClick={() => decide(action.id, "approve")}>Approve</button>
          <button type="button" disabled={busy === action.id} onClick={() => decide(action.id, "reject")}>Reject</button>
        </footer>}
        {canExecute && <footer>
          <button type="button" disabled={busy === action.id || !recipientEmail} onClick={() => execute(action.id)}>
            Send approved email
          </button>
          <span>{supportReply ? "Separate execution step. Ticket state, workspace membership, and recipient email are rechecked immediately before send." : "Separate execution step. Recipient eligibility and unsubscribe status are rechecked immediately before send."}</span>
        </footer>}
      </article>;
      })}
    </div>
    {!actions.length && <div className="evidence-note"><strong>No operating-agent actions yet</strong><p>After the feature flag is enabled, a human-reviewed run triggers Research / Insight and Customer Success actions. The CEO brief runs daily.</p></div>}
  </section>;
}
