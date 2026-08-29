import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Work with Foremention",
  description:
    "Request a Foremention working-session demo or apply as a design partner to establish Recommendation Records, review evidence, take an owned action, and return for comparable measurement.",
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
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Design partner / working session</span>
          <h1>Bring the buyer questions that determine the shortlist.</h1>
          <p>
            We&apos;ll work from a real software category and decision. Foremention turns observed AI recommendations
            into Recommendation Records, keeps the returned evidence inspectable, and preserves the boundary between
            what changed and what can safely be concluded.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell contact-grid">
          <article>
            <span>Design partner</span>
            <h2>Prove the workflow with one measurable cycle.</h2>
            <p>The design-partner loop is deliberately small:</p>
            <ol className="access-steps">
              <li>Define 5 priority buyer questions that matter to your category.</li>
              <li>Establish a baseline Recommendation Record for the approved scope.</li>
              <li>Review the returned evidence before deciding what deserves action.</li>
              <li>Create one owned action with a clear follow-through boundary.</li>
              <li>Return for comparable remeasurement and decide whether the workflow is worth continuing.</li>
            </ol>
            <p className="table-caption">No benchmark, causal lift, or commercial outcome is promised before the evidence exists.</p>
          </article>

          <article>
            <span>Apply</span>
            <h2>Give us enough context to make the first session useful.</h2>
            {submitted ? <div className="inline-notice"><strong>Application received.</strong><p>We&apos;ll use the company, category, and questions you supplied to decide whether a founder-led working session is a good fit.</p></div> : <>
              {failed && <p className="inline-error" role="alert">The application could not be saved. Please try again or email hello@foremention.com.</p>}
              <form className="intake-form" action="/api/design-partner" method="post">
                {plan && <input type="hidden" name="planInterest" value={plan} />}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" hidden />
                <label>Work email<input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
                <label>Company<input name="company" autoComplete="organization" required maxLength={160} /></label>
                <label>Role<input name="role" autoComplete="organization-title" required maxLength={120} /></label>
                <label>Software category<input name="category" required maxLength={180} placeholder="e.g. product analytics, CRM, developer security" /></label>
                <label>Priority buyer questions<textarea name="buyerQuestions" rows={6} maxLength={2600} placeholder={'One question per line, up to 5\nBest product analytics tools for a Series B SaaS?\nWhich tools are strongest for enterprise governance?'} /></label>
                <label>Current decision or recommendation problem<textarea name="currentProblem" rows={5} maxLength={2000} placeholder="What are you trying to understand or change?" /></label>
                <button className="button button--ink" type="submit">Apply as a design partner <Arrow /></button>
                <p className="form-fineprint">Submitting this form does not create a paid subscription or authorize automated collection. Measurement scope is confirmed separately.</p>
              </form>
            </>}
            <p className="table-caption">Prefer email? <a href="mailto:hello@foremention.com?subject=Foremention%20design%20partner">hello@foremention.com</a></p>
          </article>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell split-section">
          <div><span className="eyebrow">Want to inspect first?</span><h2>See the object we use in the working session.</h2></div>
          <div><p>A Recommendation Record keeps the exact question, provider/model context, answer, returned references, evidence state, review boundary, and later comparison together.</p><Link className="text-link" href="/recommendation-record">See a Recommendation Record <Arrow /></Link></div>
        </div>
      </section>
    </PublicShell>
  );
}
