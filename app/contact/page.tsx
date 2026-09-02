import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Apply as a Foremention Design Partner",
  description:
    "Bring five priority buyer questions, establish a Recommendation Intelligence baseline, review one decision-relevant gap, implement one approved company change, and return for comparable remeasurement.",
  path: "/contact",
});

const validPlans = new Set(["core", "signal", "intelligence"]);

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ plan?: string; submitted?: string; error?: string }> }) {
  const query = await searchParams;
  const plan = validPlans.has((query.plan || "").toLowerCase()) ? (query.plan || "").toLowerCase() : "";
  const submitted = query.submitted === "1";
  const failed = Boolean(query.error);

  return (
    <PublicShell>
      <section className="page-hero page-hero--ink outreach-contact-hero">
        <div className="shell narrow-heading">
          <h1>Bring 5 priority buyer questions. Leave with one company change worth testing.</h1>
          <p>
            The Foremention design-partner cycle is founder-led and deliberately small. We start with a real B2B software
            category, preserve the recommendation evidence, check what the company can actually substantiate, and review
            one exact company change before returning for comparable remeasurement.
          </p>
        </div>
      </section>

      <section className="section section--paper outreach-contact">
        <div className="shell contact-grid">
          <article>
            <span>One measurable cycle</span>
            <h2>Use the product on a real decision, not a generic demo.</h2>
            <ol className="access-steps">
              <li>Bring 5 priority buyer questions that can genuinely affect your shortlist or category.</li>
              <li>Establish dated Recommendation Records for the approved baseline.</li>
              <li>Review returned evidence, Company Truth, eligibility, and uncertainty before deciding what deserves action.</li>
              <li>Define one exact Change Specification with an owner, acceptance criteria, and verification plan.</li>
              <li>Implement only the change your team approves and record the applied reference.</li>
              <li>Return for comparable remeasurement and record what changed — without claiming causality the evidence cannot support.</li>
            </ol>
            <p className="table-caption">No benchmark, ranking guarantee, causal lift, ROI, or commercial outcome is promised before the evidence exists.</p>
          </article>

          <article>
            <span>Design partner</span>
            <h2>Apply as a Design Partner.</h2>
            {submitted ? <div className="inline-notice"><strong>Application received.</strong><p>We&apos;ll use the company, category, and questions you supplied to decide whether a founder-led working session is a good fit.</p></div> : <>
              {failed && <p className="inline-error" role="alert">The application could not be saved. Please try again or email hello@foremention.com.</p>}
              <form className="intake-form" data-design-partner-form action="/api/design-partner" method="post">
                {plan && <input type="hidden" name="planInterest" value={plan} />}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" hidden />
                <label>Work email<input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
                <label>Company<input name="company" autoComplete="organization" required maxLength={160} /></label>
                <label>Role<input name="role" autoComplete="organization-title" required maxLength={120} /></label>
                <label>Software category<input name="category" required maxLength={180} placeholder="e.g. product analytics, CRM, developer security" /></label>
                <label>Priority buyer questions<textarea name="buyerQuestions" rows={6} maxLength={2600} placeholder={'One question per line, up to 5\nBest product analytics tools for a Series B SaaS?\nWhich tools are strongest for enterprise governance?'} /></label>
                <label>Current decision or recommendation problem<textarea name="currentProblem" rows={5} maxLength={2000} placeholder="What are you trying to understand or change?" /></label>
                <button className="button button--ink" type="submit">Apply as a Design Partner <Arrow /></button>
                <p className="form-fineprint">Applying does not create a paid subscription, authorize automated collection, or approve a company change. Scope and commercial terms are confirmed separately.</p>
              </form>
            </>}
            <p className="table-caption">Prefer email? <a href="mailto:hello@foremention.com?subject=Foremention%20design%20partner">hello@foremention.com</a></p>
          </article>
        </div>
      </section>

      <section className="section section--yellow outreach-contact-proof">
        <div className="shell split-section">
          <div><h2>Want to inspect the evidence model first?</h2></div>
          <div><p>A Recommendation Record keeps the exact question, provider/model context, answer, returned references, evidence state, review boundary, and later-comparison eligibility together.</p><Link className="text-link" href="/recommendation-record">See a Recommendation Record <Arrow /></Link></div>
        </div>
      </section>
    </PublicShell>
  );
}
