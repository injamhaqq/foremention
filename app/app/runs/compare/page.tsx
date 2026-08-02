import Link from "next/link";
import { Arrow } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadRunAnswers, loadRuns, loadWorkspaceCompetitors, loadWorkspaceContext } from "@/lib/data";

const normalized = (value: string) => value.toLocaleLowerCase();
const difference = (after: Set<string>, before: Set<string>) => [...after].filter((value) => !before.has(value)).sort();
const confidence = (answers: Awaited<ReturnType<typeof loadRunAnswers>>) => {
  if (!answers.length) return 0;
  const reviewed = answers.filter((answer) => answer.status === "verified").length / answers.length;
  const cited = answers.filter((answer) => answer.citations.length > 0).length / answers.length;
  return Math.round((reviewed * .7 + cited * .3) * 100);
};

export default async function RunComparisonPage({ searchParams }: { searchParams: Promise<{ left?: string; right?: string }> }) {
  const viewer = await requireViewer("/app/runs/compare");
  const { left = "", right = "" } = await searchParams;
  const runs = await loadRuns(viewer, { limit: 100 });
  const allowed = new Map(runs.filter((run) => ["complete", "partial"].includes(run.status)).map((run) => [run.id, run]));
  const earlier = allowed.get(left);
  const later = allowed.get(right);
  if (!earlier || !later || left === right) return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Comparable evidence</span><h1>Select two different completed runs.</h1><p>Only runs belonging to this workspace are available for comparison.</p></div><Link className="button button--outline" href="/app/runs">Back to Answer Runs</Link></div></main>;
  const [leftAnswers, rightAnswers, context, competitors] = await Promise.all([loadRunAnswers(viewer, left), loadRunAnswers(viewer, right), loadWorkspaceContext(viewer), loadWorkspaceCompetitors(viewer)]);
  const trackedBrands = [context?.organizationName || "", ...competitors].filter(Boolean);
  const brandSet = (answers: typeof leftAnswers) => new Set(trackedBrands.filter((brand) => answers.some((answer) => normalized(answer.answer).includes(normalized(brand)))));
  const sourceSet = (answers: typeof leftAnswers) => new Set(answers.flatMap((answer) => answer.citations.map((citation) => citation.url).filter(Boolean)));
  const leftBrands = brandSet(leftAnswers); const rightBrands = brandSet(rightAnswers);
  const leftSources = sourceSet(leftAnswers); const rightSources = sourceSet(rightAnswers);
  const gainedBrands = difference(rightBrands, leftBrands); const lostBrands = difference(leftBrands, rightBrands);
  const gainedSources = difference(rightSources, leftSources); const lostSources = difference(leftSources, rightSources);
  const leftConfidence = confidence(leftAnswers); const rightConfidence = confidence(rightAnswers);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Run comparison</span><h1>What changed between these collections.</h1><p>Differences come from persisted answers and provider-returned citations. They do not prove causation or buyer behavior.</p></div><Link className="button button--outline" href="/app/runs">Choose other runs</Link></div>
    <div className="run-comparison-metrics"><article><span>Earlier</span><strong>{earlier.date}</strong><small>{earlier.id.slice(0, 8).toUpperCase()}</small></article><article><span>Later</span><strong>{later.date}</strong><small>{later.id.slice(0, 8).toUpperCase()}</small></article><article><span>Confidence</span><strong>{leftConfidence}% → {rightConfidence}%</strong><small>review coverage plus cited-answer coverage</small></article><article><span>Citations</span><strong>{earlier.citations} → {later.citations}</strong><small>{later.citations - earlier.citations >= 0 ? "+" : ""}{later.citations - earlier.citations} change</small></article></div>
    <div className="run-diff-grid">
      <section className="panel"><span className="eyebrow">Brand movement</span><h2>Newly observed</h2>{gainedBrands.length ? <ul>{gainedBrands.map((brand) => <li key={brand}>{brand}</li>)}</ul> : <p>No tracked brand was newly observed.</p>}<h2>Lost</h2>{lostBrands.length ? <ul>{lostBrands.map((brand) => <li key={brand}>{brand}</li>)}</ul> : <p>No tracked brand disappeared.</p>}</section>
      <section className="panel"><span className="eyebrow">Source movement</span><h2>New citations</h2>{gainedSources.length ? <ul>{gainedSources.slice(0, 25).map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url} ↗</a></li>)}</ul> : <p>No citation URL was newly returned.</p>}<h2>Lost citations</h2>{lostSources.length ? <ul>{lostSources.slice(0, 25).map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url} ↗</a></li>)}</ul> : <p>No citation URL disappeared.</p>}</section>
    </div>
    <div className="evidence-note"><strong>Comparison boundary</strong><p>“New” and “lost” mean different provider observations between these exact runs. Re-run the same questions and model before treating movement as durable.</p><Link href={`/app/runs/${right}`}>Inspect the later evidence <Arrow /></Link></div>
  </main>;
}
