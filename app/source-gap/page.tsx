import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { SourceGapForm } from "@/components/source-gap-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Free AI Search Source Gap Check", description: "Submit your company, category and one buyer question for a free review of the public evidence around AI answers, with any supported source gap reported or an explanation of why none can be established.", path: "/source-gap" });

export default function SourceGapPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--yellow">
        <div className="shell narrow-heading">
          <span className="eyebrow">Free Source Gap Check</span>
          <h1>Inspect the evidence around one buyer question.</h1>
          <p>Give us your website, category, and one buyer question. We’ll review the public evidence for one buyer question and report any supported gap—or explain why none can be established.</p>
        </div>
      </section>
      <section className="section section--paper">
        <div className="shell intake-layout">
          <div>
            <h2>What you’ll get</h2>
            <ol className="number-list">
              <li><span>01</span><p><strong>The shortlist:</strong> which brands appear for your buyer question.</p></li>
              <li><span>02</span><p><strong>The evidence layer:</strong> which outside pages were returned with that answer or retrieved separately for review. Neither shows which pages caused the answer.</p></li>
              <li><span>03</span><p><strong>Your next move:</strong> a supported gap worth checking first, or a plain explanation of why the evidence does not support one.</p></li>
            </ol>
            <div className="honesty-note"><strong>What it is not</strong><p>This is not a guaranteed ranking, a press-placement promise, a complete paid audit, or monitoring of consumer ChatGPT, Gemini or Perplexity apps.</p></div>
          </div>
          <SourceGapForm />
        </div>
      </section>
    </PublicShell>
  );
}
