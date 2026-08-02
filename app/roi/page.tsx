import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { RoiCalculator } from "@/components/roi-calculator";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility ROI Scenario Calculator",
  description: "Model the measured gap between your current AI brand-mention rate and a documented category benchmark without guaranteed outcome claims.",
  path: "/roi",
});

export default function RoiPage() {
  return <PublicShell>
    <section className="page-hero page-hero--mint"><div className="shell narrow-heading"><span className="eyebrow">Free planning tool</span><h1>Turn a visibility benchmark into a testable scenario.</h1><p>See the arithmetic improvement required to move from your current observed brand-mention rate to a benchmark you trust. This is a planning model, not a performance promise.</p></div></section>
    <section className="section section--paper"><div className="shell"><RoiCalculator /></div></section>
  </PublicShell>;
}
