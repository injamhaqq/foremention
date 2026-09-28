import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Monitoring vs Decision Evidence",
  description: "Compare visibility monitoring with Foremention's evidence-first workflow from buyer-question observation through human decision, recorded execution, and comparable later verification.",
  path: "/monitoring-vs-execution",
});

const rows = [
  ["Buyer-question and mention tracking", "Common", "Yes — tied to a versioned Recommendation Record"],
  ["Provider-returned citation evidence", "Varies by product and provider surface", "Preserved when the observed provider returns it"],
  ["Human source review", "Varies by workflow", "Explicit reviewed / unreviewed evidence state"],
  ["Company Truth and requirement eligibility", "Varies by product", "Kept separate from observed recommendation evidence"],
  ["Human-approved company change", "Varies by product", "Change Specification with owner and acceptance criteria"],
  ["Proof of what was actually executed", "Varies by product", "Customer-owned execution reference is retained"],
  ["Comparable later measurement", "Increasingly available across the category", "Allowed only when the material measurement contract remains comparable"],
  ["Incomparable later measurement", "Handling varies", "Retained, but directional interpretation is withheld"],
  ["Automatic causal or ROI claim", "Should require independent evidence", "No — chronology and observed direction stay non-causal"],
] as const;

export default function MonitoringVsExecutionPage() {
  return <PublicShell>
    <section className="page-hero">
      <div className="shell narrow-heading">
        <span className="eyebrow">Monitoring vs decision evidence</span>
        <h1>Visibility tells you what appeared. Foremention keeps the decision chain inspectable.</h1>
        <p>AI-search products are rapidly adding recommendations, agents, execution workflows, referral analytics, and outcome reporting. Foremention is not claiming those capabilities are unique. Its narrower job is to preserve the exact evidence chain from a buyer-question observation to a human-owned company decision, recorded execution, and a later comparison that can fail closed when conditions changed.</p>
      </div>
    </section>
    <section className="section section--paper">
      <div className="shell comparison-table">
        <div className="comparison-row comparison-row--head"><span>Capability</span><span>Category pattern</span><span>Foremention evidence boundary</span></div>
        {rows.map(row => <div className="comparison-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span></div>)}
      </div>
      <div className="shell routing-note">
        <div><span className="eyebrow">Use monitoring-first software when</span><p>Your main requirement is broad model coverage, mention/share-of-voice reporting, prompt expansion, market benchmarks, or recurring visibility analytics.</p></div>
        <div><span className="eyebrow">Use Foremention when</span><p>The harder question is whether a specific recommendation gap justifies a company change, what was actually approved and shipped, and whether a later observation is comparable enough to discuss direction without pretending it proves causation.</p></div>
      </div>
      <div className="shell inline-notice" role="note"><strong>Comparison boundary.</strong><p>This is a workflow comparison, not a claim that other vendors lack execution or outcome features. Competitor capabilities change quickly; Foremention should be evaluated on its own documented evidence model and current provider coverage.</p></div>
    </section>
    <section className="cta-band">
      <div className="shell cta-band__inner">
        <div><span className="eyebrow">One decision loop</span><h2>Start with one buyer question and inspect the evidence before approving work.</h2></div>
        <Link className="button button--ink button--large" href="/contact">Apply as Design Partner <Arrow /></Link>
      </div>
    </section>
  </PublicShell>;
}
