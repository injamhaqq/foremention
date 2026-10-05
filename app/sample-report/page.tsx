import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Fictional Recommendation Intelligence Report Sample",
  description:
    "A clearly fictional Foremention report demonstrating one Recommendation Record, evidence-review states, an illustrative Change Specification, and explicit limitations. No company, source, observation, or outcome on this page is real.",
  path: "/sample-report",
  noIndex: true,
});

const evidenceRows = [
  ["Returned reference A", "Sample state: retrievable", "Human review pending"],
  ["Returned reference B", "Sample state: retrievable", "Human review pending"],
  ["Recommendation explanation", "Not established", "A returned reference is not proof of causation"],
] as const;

export default function SampleReportPage() {
  return (
    <PublicShell>
      <section className="report-cover">
        <div className="shell report-cover__grid">
          <div>
            <span className="eyebrow">Fictional Recommendation Intelligence report</span>
            <h1>Northstar HR buyer-question evidence review</h1>
            <p>HR software for distributed teams · Demonstration only · No real provider or customer evidence</p>
          </div>
          <div className="report-score">
            <span>Evidence state</span>
            <strong>Review</strong>
            <small>pending · fictional sample</small>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell report-layout">
          <aside className="report-index">
            <span>Report index</span>
            <a href="#observation">01 Observation</a>
            <a href="#evidence">02 Evidence review</a>
            <a href="#change">03 Change Specification</a>
            <a href="#limits">04 Limits</a>
          </aside>

          <div className="report-body">
            <section id="observation">
              <span className="eyebrow">01 · Recommendation Record</span>
              <h2>Preserve the observation before interpreting it.</h2>
              <p>
                <strong>Illustrative buyer question:</strong> “What is the best HR platform for a distributed
                company that needs enterprise security and global operations support?”
              </p>
              <div className="report-metrics">
                <div><strong>Observed</strong><span>fictional provider answer preserved</span></div>
                <div><strong>Named</strong><span>sample brands remain attached to the answer</span></div>
                <div><strong>Pending</strong><span>evidence review is not complete</span></div>
              </div>
              <p>
                This sample intentionally avoids a composite visibility or readiness score. The useful unit is the
                inspectable record: question, provider/model context, answer, named brands, returned references,
                review state, limitations, and later-comparison eligibility.
              </p>
            </section>

            <section id="evidence">
              <span className="eyebrow">02 · Evidence review</span>
              <h2>Returned, retrievable, reviewed, and causal are different states.</h2>
              {evidenceRows.map(([reference, state, conclusion]) => (
                <article className="report-source" key={reference}>
                  <div><span>{state}</span></div>
                  <h3>{reference}</h3>
                  <p><strong>Safe conclusion:</strong> {conclusion}.</p>
                </article>
              ))}
            </section>

            <section id="change">
              <span className="eyebrow">03 · Illustrative Change Specification</span>
              <h2>Turn only a reviewed, customer-owned gap into a proposed change.</h2>
              <div className="plan-steps">
                <div>
                  <span>Proposed change</span>
                  <strong>Make verified enterprise-security proof easier to inspect</strong>
                  <p>Publish an approved overview containing only capabilities the fictional company can substantiate.</p>
                </div>
                <div>
                  <span>Acceptance criteria</span>
                  <strong>Every included claim is approved and publicly verifiable</strong>
                  <p>Unsupported capabilities, inferred certifications, and customer claims are excluded.</p>
                </div>
                <div>
                  <span>Verification plan</span>
                  <strong>Remeasure only under equivalent conditions</strong>
                  <p>Record the later observation as association only; do not claim the proposed change caused it.</p>
                </div>
              </div>
            </section>

            <section id="limits" className="report-limit">
              <span className="eyebrow">04 · Honest limits</span>
              <h2>This is a product-structure demonstration, not proof of a customer outcome.</h2>
              <p>
                Northstar HR, the buyer question, provider answer, references, evidence states, and Change Specification
                on this page are fictional. Foremention does not guarantee rankings, citations, recommendation movement,
                traffic, leads, revenue, or causal impact.
              </p>
              <Link className="text-link" href="/methodology">Read the methodology <Arrow /></Link>
            </section>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
