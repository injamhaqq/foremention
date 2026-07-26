import Link from "next/link";
import { Arrow, StatusDot } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { sourceMapEntries } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Fictional Product Report Sample",
  description: "A clearly fictional demonstration of Foremention report structure. No company, source, observation, or outcome on this page is real.",
  path: "/sample-report",
  noIndex: true,
});

export default function SampleReportPage() {
  const gaps = sourceMapEntries.filter((source) => !source.clientPresent);
  return <PublicShell>
    <section className="report-cover"><div className="shell report-cover__grid"><div><span className="eyebrow">Fictional sample report</span><h1>Northstar HR Category Leadership Audit</h1><p>HR software for distributed teams · Evidence window: 30 days · Sample data only</p></div><div className="report-score"><span>Readiness score</span><strong>62</strong><small>/100 · category contender</small></div></div></section>
    <section className="section section--paper"><div className="shell report-layout"><aside className="report-index"><span>Report index</span><a href="#diagnosis">01 Diagnosis</a><a href="#sources">02 Source gaps</a><a href="#plan">03 90-day plan</a><a href="#limits">04 Limits</a></aside><div className="report-body">
      <section id="diagnosis"><span className="eyebrow">01 · Executive diagnosis</span><h2>The product is understood. The evidence layer is incomplete.</h2><p>In this fictional sample, Northstar HR appears in 31% of recorded answers but only two of eight recurring sources name it. Competitors win because they are supported by more of the pages the sampled engines retrieve.</p><div className="report-metrics"><div><strong>31%</strong><span>recommendation share</span></div><div><strong>12%</strong><span>first-mention share</span></div><div><strong>6</strong><span>priority source gaps</span></div></div></section>
      <section id="sources"><span className="eyebrow">02 · Priority gaps</span><h2>Three routes worth qualifying first.</h2>{gaps.slice(0,3).map((source) => <article className="report-source" key={source.id}><div><StatusDot tone={source.feasibility === "high" ? "green" : "yellow"} /><span>{source.domain}</span></div><h3>{source.title}</h3><p><strong>Route:</strong> {source.route}. <strong>Observed evidence:</strong> {source.evidenceCount} citations in the fictional dataset.</p></article>)}</section>
      <section id="plan"><span className="eyebrow">03 · 90-day plan</span><h2>Strengthen proof, earn inclusion, then measure.</h2><div className="plan-steps"><div><span>Days 1–15</span><strong>Baseline and evidence vault</strong><p>Approve buyer questions, verify claims, repair public proof, and score the source universe.</p></div><div><span>Days 16–45</span><strong>Opportunity qualification</strong><p>Confirm editorial fit, contacts, submission requirements, and reputation risk.</p></div><div><span>Days 46–90</span><strong>Placement and observation</strong><p>Execute approved work, check indexing, recheck the answers, and report observed changes.</p></div></div></section>
      <section id="limits" className="report-limit"><span className="eyebrow">04 · Honest limits</span><h2>This is a product sample, not proof of a customer outcome.</h2><p>Northstar HR, its sources, and every number on this page are fictional. Foremention does not guarantee editorial acceptance, rankings, citations, traffic, or revenue.</p><Link className="text-link" href="/honesty">Read the full honesty clause <Arrow /></Link></section>
    </div></div></section>
  </PublicShell>;
}
