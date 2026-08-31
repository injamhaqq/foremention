import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { trustCapabilities, type TrustCapabilityStatus } from "@/lib/trust-capabilities";

export const metadata: Metadata = pageMetadata({
  title: "Trust Center",
  description: "Foremention security, privacy, tenant isolation, provider handling, data control, and enterprise-readiness boundaries.",
  path: "/trust",
});

const statusLabel: Record<TrustCapabilityStatus, string> = {
  implemented: "Implemented",
  configuration_required: "Configuration required",
  architecture_ready: "Architecture ready",
  unavailable: "Unavailable today",
};

const architecture = trustCapabilities.filter((item) => item.status !== "unavailable");
const unavailable = trustCapabilities.filter((item) => item.status === "unavailable");

export default function TrustPage() {
  return <PublicShell>
    <section className="page-hero">
      <div className="shell narrow-heading">
        <span className="eyebrow">Enterprise trust</span>
        <h1>Trust is an evidence boundary, not a badge.</h1>
        <p>Foremention separates implemented controls, configuration-dependent capabilities, architecture that is not yet exposed as a product feature, and assurances that are unavailable today.</p>
      </div>
    </section>

    <section className="section section--paper">
      <div className="shell legal-copy">
        <div className="legal-summary">
          <strong>Claim boundary</strong>
          <p>The controls described here are product and engineering statements. They are not a compliance certification, audit opinion, contractual warranty, legal conclusion, or substitute for a signed customer agreement.</p>
        </div>

        <h2>Security architecture</h2>
        <p>Foremention uses authenticated application access, organization membership boundaries, PostgreSQL row-level security, service-role separation for privileged background work, verified webhook boundaries where applicable, and fail-closed configuration for enterprise access features.</p>

        <h2>Tenant isolation</h2>
        <p>Workspace data is organization-scoped. Database RLS and tenant-relation integrity controls are the primary isolation boundary; application checks are additive and do not replace database authorization.</p>

        <h2>Human review</h2>
        <p>Evidence review and Recommendation Record publication are explicit workflow boundaries. Foremention does not treat collected AI output as automatically verified evidence or autonomously publish customer conclusions.</p>

        <h2>Data deletion and export</h2>
        <p>Owner-controlled export and delayed workspace deletion architecture exists. Deletion uses a safety window and produces a non-identifying receipt. Enterprise governance requests add an auditable request state without bypassing the existing deletion control.</p>

        <h2>Provider handling</h2>
        <p>Provider/model labels are recorded at the collection boundary. A provider is not treated as active merely because integration code exists. Customer-content training is disallowed by Foremention&apos;s governance model; provider-specific contractual or no-training assurances must still be verified for the provider and agreement actually in use.</p>

        <h2>Subprocessors</h2>
        <p>The current operational provider list and configuration boundaries are maintained on the <Link href="/subprocessors">subprocessors page</Link>. A listed service is not automatically active for every workspace.</p>

        <h2>Implemented and staged controls</h2>
        <div className="integration-list">
          {architecture.map((item) => <div key={item.name}>
            <span><strong>{item.name}</strong> · {statusLabel[item.status]}</span>
            <small>{item.summary}</small>
          </div>)}
        </div>

        <h2>Unavailable today</h2>
        <p>These items are deliberately not marketed as available until independently true and, where relevant, contractually established.</p>
        <div className="integration-list">
          {unavailable.map((item) => <div key={item.name}>
            <span><strong>{item.name}</strong> · {statusLabel[item.status]}</span>
            <small>{item.summary}</small>
          </div>)}
        </div>

        <h2>Testing and security evidence</h2>
        <p>The repository includes authorization, RLS, tenant-integrity, authentication, release, provenance, and enterprise-governance contract tests. Passing engineering checks support a security program; they do not convert into SOC 2, ISO 27001, or another certification.</p>

        <h2>Status and continuity</h2>
        <p>Operational monitoring, backup configuration, recovery evidence, disaster-recovery exercises, and business-continuity evidence must be verified from the environment in scope. Foremention does not publish an uptime or recovery guarantee here.</p>

        <h2>Responsible disclosure</h2>
        <p>Security reports can be sent to <a href="mailto:hello@foremention.com?subject=Security%20report">hello@foremention.com</a> with “Security report” in the subject. Please include reproduction steps, affected surface, and impact. Do not include unnecessary customer data or exploit data beyond what is needed to demonstrate the issue.</p>

        <h2>Privacy and legal boundaries</h2>
        <p>Review <Link href="/privacy">Privacy</Link>, <Link href="/terms">Terms</Link>, and <Link href="/subprocessors">Subprocessors</Link>. Customer-specific DPA, MSA, SLA, residency, processor, or security commitments require an executed agreement and cannot be inferred from this page.</p>
      </div>
    </section>
  </PublicShell>;
}
