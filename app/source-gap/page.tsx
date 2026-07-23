import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { SourceGapForm } from "@/components/source-gap-form";

export const metadata: Metadata = { title: "Free Source Gap Check", description: "See which third-party pages shape AI answers in your category." };

export default function SourceGapPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--yellow">
        <div className="shell narrow-heading">
          <span className="eyebrow">Free Source Gap Check</span>
          <h1>Put your category under the Source X-Ray.</h1>
          <p>Give us your website, category, and one buyer question. We’ll inspect the public evidence layer and show one useful source gap—where competitors have outside proof and your brand does not.</p>
        </div>
      </section>
      <section className="section section--paper">
        <div className="shell intake-layout">
          <div>
            <h2>What you’ll get</h2>
            <ol className="number-list">
              <li><span>01</span><p><strong>The shortlist:</strong> which brands appear for your buyer question.</p></li>
              <li><span>02</span><p><strong>The evidence layer:</strong> which outside pages help support that answer.</p></li>
              <li><span>03</span><p><strong>Your next move:</strong> one plain, fair route worth checking first.</p></li>
            </ol>
            <div className="honesty-note"><strong>What it is not</strong><p>This is not a guaranteed ranking, a press-placement promise, or a complete paid audit.</p></div>
          </div>
          <SourceGapForm />
        </div>
      </section>
    </PublicShell>
  );
}
