import Link from "next/link";

const readiness = [
  ["Tenant isolation", "Enforced through organization-scoped application access and database RLS boundaries."],
  ["Data control", "Workspace export, owner-only full export, deletion workflow, and customer-controlled Recommendation Record sharing are available."],
  ["Signed mutations", "Workspace webhooks and commercial webhooks use verified server-side signatures; secrets are never rendered into the product UI."],
  ["Enterprise SSO", "Configuration-dependent. Foremention does not represent SSO as active until a real workspace connection exists."],
  ["Operational monitoring", "Configuration-dependent. A provider is not described as active merely because integration code exists."],
  ["Security / release evidence", "CI, browser acceptance, security analysis, provenance, and authenticated production canaries are engineering controls, not compliance certifications."],
] as const;

export function EnterpriseReadiness() {
  return <section className="panel panel--wide enterprise-readiness">
    <span className="eyebrow">Enterprise readiness</span>
    <h2>What is operationally true—and what is not claimed.</h2>
    <div className="integration-list">
      {readiness.map(([label, description]) => <div key={label}><span><strong>{label}</strong></span><small>{description}</small></div>)}
    </div>
    <div className="inline-notice">
      <strong>Not claimed</strong>
      <p>Foremention does not claim SOC 2 certification, ISO 27001 certification, a contractual SLA, automatic SCIM, or a legal entity/jurisdiction that has not been established in the published terms.</p>
    </div>
    <div className="settings-actions"><Link className="button button--outline" href="/subprocessors">Subprocessors</Link><Link className="button button--outline" href="/privacy">Privacy</Link><Link className="button button--outline" href="/terms">Terms</Link></div>
  </section>;
}
