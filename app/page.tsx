import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { EvidenceReference, HonestyState, RunningLabel } from "@/components/evidence-standard-primitives";
import { MissingAnswerExperience, SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence for B2B SaaS",
  description:
    "Record the AI answers buyers see, preserve returned source evidence, review competitor presence, and compare equivalent runs over time.",
  path: "/",
});

const honestyStates = [
  {
    tone: "not-observed" as const,
    title: "No observation exists",
    body: "The provider did not return a usable observation for this record. Foremention leaves the gap visible instead of filling it with an estimate.",
  },
  {
    tone: "not-comparable" as const,
    title: "The measurement changed",
    body: "Question, provider, configuration, or another comparison condition changed enough that a later run should not be presented as the same measurement.",
  },
  {
    tone: "insufficient" as const,
    title: "The record is too thin",
    body: "Evidence exists, but coverage, review, agreement, or history is not strong enough to support the next decision yet.",
  },
];

const decisionChecks = [
  ["01", "Collection coverage", "Complete"],
  ["02", "Provider agreement", "Directional"],
  ["03", "Source review", "Pending"],
  ["04", "Source concentration", "Review"],
  ["05", "Exact repeatability", "Matched"],
] as const;

const readinessStates = ["Decision-ready", "Directional only", "Insufficient evidence"] as const;

export default function HomePage() {
  return <PublicShell>
    <section className="goat-hero" aria-label="01 / Recommendation record">
      <MissingAnswerExperience />
    </section>

    <section className="goat-xray-section" aria-label="02 / Source X-Ray">
      <div className="shell"><SourceXRayExperience /></div>
    </section>

    <section className="fm-section" aria-labelledby="honesty-title">
      <div className="shell">
        <div className="fm-section__intro">
          <div><span className="goat-kicker">03 / Honesty as product</span></div>
          <div>
            <h2 id="honesty-title">Absence and uncertainty are part of the interface.</h2>
            <p>A serious evidence system must show when a record is missing, when two runs cannot be compared, and when the available evidence is not yet strong enough for a decision. These are product states, not error decoration.</p>
          </div>
        </div>
        <div className="fm-honesty-grid">
          {honestyStates.map((item) => <article key={item.tone}>
            <HonestyState tone={item.tone} />
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="fm-section fm-section--surface" aria-labelledby="competitor-title">
      <div className="shell">
        <div className="fm-section__intro">
          <div><span className="goat-kicker">04 / Competitor evidence</span></div>
          <div>
            <h2 id="competitor-title">Competitor presence stays attached to the exact answer record.</h2>
            <p>This illustrative product interface shows an observation, the evidence returned with it, and the review boundary. Competitors are presented as evidence in a specific answer record, not as a universal ranking, and a returned source is not treated as proof of causation.</p>
          </div>
        </div>

        <article className="fm-competitor-record" aria-label="Illustrative competitor evidence record">
          <header className="fm-competitor-record__header">
            <div><RunningLabel number="RECORD" label="COMPETITOR EVIDENCE" /><strong>Illustrative product interface</strong></div>
            <div className="fm-record-meta"><span>Provider / Example provider</span><span>Run ID / RUN-2026-08-25-01</span><span>Collected / 2026-08-25</span></div>
          </header>

          <div className="fm-competitor-record__question">
            <RunningLabel number="01" label="QUESTION" />
            <h3>Which reporting platform fits a growing B2B SaaS team?</h3>
          </div>

          <div className="fm-competitor-record__body">
            <div className="fm-competitor-observation">
              <RunningLabel number="02" label="OBSERVED ANSWER" />
              <p><strong>Brand A, Brand B, and Brand C appear.</strong> Brand B is present in the provider response. That presence is an observation tied to this run—not a universal rank.</p>
              <div className="fm-competitor-presence" aria-label="Observed competitor presence">
                <span>Brand A / observed</span><span>Brand B / observed</span><span>Brand C / observed</span>
              </div>
            </div>

            <div className="fm-competitor-evidence">
              <div>
                <EvidenceReference>[03]</EvidenceReference>
                <strong>Returned reference</strong>
                <p>example.com/category-guide</p>
              </div>
              <div>
                <RunningLabel number="SOURCE" label="03" />
                <strong>Distinct source · retrievable</strong>
                <p>The URL is preserved as a source record. Retrievability is not the same as review.</p>
              </div>
              <div>
                <RunningLabel number="04" label="REVIEW STATE" />
                <strong>Human review pending</strong>
                <p>The source-to-answer relationship is observable. Causal influence is not established.</p>
              </div>
            </div>
          </div>

          <footer className="fm-competitor-record__footer">
            <div><RunningLabel number="BOUNDARY" label="CAUSAL RESTRAINT" /><p>ANSWER ↔ RETURNED SOURCE is recorded. SOURCE → CAUSED ANSWER is not claimed.</p></div>
            <div><RunningLabel number="ACTION" label="NEXT REVIEW" /><p>Review the returned source and source concentration before committing category-page work.</p></div>
          </footer>
        </article>
      </div>
    </section>

    <section className="fm-section" aria-labelledby="decision-title">
      <div className="shell">
        <div className="fm-section__intro">
          <div><span className="goat-kicker">05 / Decision Gate</span></div>
          <div>
            <h2 id="decision-title">Readiness is a set of evidence checks, not a composite score.</h2>
            <p>The gate separates a record that is ready to support a decision from one that is only directional or still lacks enough evidence. No arbitrary composite readiness number is manufactured.</p>
          </div>
        </div>

        <div className="fm-decision-gate">
          <div className="fm-decision-gate__summary">
            <RunningLabel number="STATE" label="CURRENT" />
            <strong>Directional only</strong>
            <p>Collection is present and the repeat setup is matched, but provider agreement is directional and source review is still pending. The correct next move is review, not certainty.</p>
            <div className="fm-readiness-states" aria-label="Decision readiness states">
              {readinessStates.map((state) => <span key={state}>{state}</span>)}
            </div>
          </div>
          <div className="fm-decision-gate__checks" aria-label="Decision Gate evidence checks">
            {decisionChecks.map(([n, label, state]) => <div className="fm-decision-check" key={label}>
              <span>{n}</span><span>{label}</span><strong>{state}</strong>
            </div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="fm-section fm-section--surface" aria-labelledby="measurement-title">
      <div className="shell">
        <div className="fm-section__intro">
          <div><span className="goat-kicker">06 / Later measurement</span></div>
          <div>
            <h2 id="measurement-title">Compare later only when the measurement remains equivalent.</h2>
            <p>Equivalent buyer question, provider, collection configuration, and comparison rules make a later observation reviewable. When those conditions drift, Foremention should show <strong>≠ NOT COMPARABLE</strong> instead of a trend.</p>
          </div>
        </div>

        <div className="fm-compare" aria-label="Illustrative equivalent later measurement">
          <article className="fm-compare__run" aria-label="RUN / 01">
            <RunningLabel number="RUN" label="01" />
            <h3>Brand B observed with returned reference [03].</h3>
            <p>Run ID / RUN-2026-08-25-01 · exact buyer question preserved · provider configuration recorded.</p>
          </article>
          <div className="fm-compare__boundary" aria-hidden="true">→</div>
          <article className="fm-compare__run" aria-label="RUN / 02">
            <RunningLabel number="RUN" label="02" />
            <h3>Brand B remains observed; returned source set changes.</h3>
            <p>Run ID / RUN-2026-09-01-01 · equivalent measurement setup · later source set preserved for review.</p>
          </article>
        </div>

        <div className="fm-measurement-note">
          <div><RunningLabel number="OBSERVED" label="CHANGE" /><strong>Observed change</strong><p>The source set differs between equivalent runs. That is a later observation, not proof of causation or proof that an action produced the change.</p></div>
          <div><HonestyState tone="not-comparable" /><p>If the approved question, provider, configuration, or another material comparison condition changes, the run is withheld from equivalent comparison.</p></div>
          <div><HonestyState tone="insufficient" /><p>A repeated observation can still be too thin for a decision when review or supporting coverage remains incomplete.</p></div>
        </div>
      </div>
    </section>

    <section className="fm-workspace-entry" aria-labelledby="workspace-title">
      <div className="shell fm-workspace-entry__inner">
        <div>
          <span className="goat-kicker">07 / Enter workspace</span>
          <h2 id="workspace-title">Build your first evidence record.</h2>
          <p>Start with the company, category, competitors, and buyer questions that matter. Then collect, review returned evidence, and make the first decision-relevant record.</p>
        </div>
        <div className="fm-workspace-entry__action">
          <Link className="button button--ink button--large" href="/signup">Create workspace <Arrow /></Link>
          <p>Private beta. Creating a workspace does not charge a card. Collection capacity is activated separately.</p>
        </div>
      </div>
    </section>
  </PublicShell>;
}
