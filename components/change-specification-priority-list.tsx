import Link from "next/link";
import type { ChangeSpecificationPriorityItem } from "@/lib/change-specification-data";

const readable = (value: string) => value.replaceAll("_", " ").toLowerCase();
const optional = (value: string | number | null, fallback: string) => value === null || value === "" ? fallback : String(value);

export function ChangeSpecificationPriorityList({ items }: { items: ChangeSpecificationPriorityItem[] }) {
  if (!items.length) {
    return <div className="panel">
      <div className="empty-state">
        <h2>No active Change Specifications yet.</h2>
        <p>Foremention will not manufacture actions without reviewed evidence. Review opportunities first, then submit a Change Specification when the decision is inspectable.</p>
        <Link className="button button--ink" href="/app/opportunities">Open reviewed opportunities →</Link>
      </div>
    </div>;
  }

  return <div className="dashboard-grid">
    {items.slice(0, 5).map((item) => <article className="panel" key={item.id}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Priority {optional(item.priorityRank, "Not specified")}</span>
          <h2>{item.title}</h2>
        </div>
      </div>
      <p>{item.exactChange || "Exact change not specified."}</p>
      <dl className="fact-grid">
        <div><dt>Decision</dt><dd>{readable(item.decisionState)}</dd></div>
        <div><dt>Control</dt><dd>{item.controlClass ? readable(item.controlClass) : "Unknown"}</dd></div>
        <div><dt>Eligibility</dt><dd>{readable(item.eligibilityState)}</dd></div>
        <div><dt>Confidence</dt><dd>{readable(item.confidenceState)}</dd></div>
        <div><dt>Effort</dt><dd>{item.effort ? readable(item.effort) : "Not specified"}</dd></div>
        <div><dt>Owner</dt><dd>{item.ownerRole || "Not specified"}</dd></div>
        <div><dt>Evidence</dt><dd>{item.evidenceCount || "Insufficient evidence"}</dd></div>
        <div><dt>Acceptance</dt><dd>{item.acceptanceCriteriaCount || "Not specified"}</dd></div>
        <div><dt>Verification</dt><dd>{item.hasVerificationPlan ? "Recorded" : "Not specified"}</dd></div>
      </dl>
      <Link className="text-link" href={`/app/opportunities?changeSpecificationId=${encodeURIComponent(item.id)}`}>Open decision and evidence <span aria-hidden="true">→</span></Link>
    </article>)}
  </div>;
}
