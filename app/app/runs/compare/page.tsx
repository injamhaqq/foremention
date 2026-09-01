import Link from "next/link";
import { Arrow } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadRuns } from "@/lib/data";
import {
  assessWorkspaceRunPairComparability,
  type VerifiedRunComparisonAnswer,
} from "@/lib/run-pair-comparability";

const difference = (after: Set<string>, before: Set<string>) => [...after].filter((value) => !before.has(value)).sort();

function publicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function answerKey(answer: VerifiedRunComparisonAnswer) {
  return [answer.promptKey, answer.promptText, answer.provider, answer.model].join("\u0000");
}

function sourceSet(answers: VerifiedRunComparisonAnswer[]) {
  return new Set(answers.flatMap((answer) => answer.citations.flatMap((citation) => {
    const url = publicHttpUrl(citation.url);
    return url ? [url] : [];
  })));
}

function citedAnswerCount(answers: VerifiedRunComparisonAnswer[]) {
  return answers.filter((answer) => answer.citations.some((citation) => Boolean(publicHttpUrl(citation.url)))).length;
}

export default async function RunComparisonPage({ searchParams }: { searchParams: Promise<{ left?: string; right?: string }> }) {
  const viewer = await requireViewer("/app/runs/compare");
  const { left = "", right = "" } = await searchParams;
  const runs = await loadRuns(viewer, { limit: 100 });
  const allowed = new Map(runs.filter((run) => ["complete", "partial"].includes(run.status)).map((run) => [run.id, run]));
  const earlier = allowed.get(left);
  const later = allowed.get(right);

  if (!earlier || !later || left === right) {
    return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Run inspection</span><h1>Select two different reviewed collections.</h1><p>Both selections must belong to this workspace. Foremention will decide whether cross-collection movement is comparable after selection.</p></div><Link className="button button--outline" href="/app/runs">Back to AI Results</Link></div></main>;
  }

  const assessment = await assessWorkspaceRunPairComparability(viewer, left, right);
  if (!assessment.comparable) {
    return <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Comparison withheld</span><h1>These collections are valid separately, but not as a movement pair.</h1><p>{assessment.reason || "The exact comparison boundary could not be proven."}</p></div><Link className="button button--outline" href="/app/runs">Choose other runs</Link></div>
      <div className="run-comparison-metrics"><article><span>Earlier selection</span><strong>{earlier.date}</strong><small>{earlier.id.slice(0, 8).toUpperCase()}</small></article><article><span>Later selection</span><strong>{later.date}</strong><small>{later.id.slice(0, 8).toUpperCase()}</small></article></div>
      <div className="evidence-note"><strong>No cross-run delta was calculated</strong><p>Foremention reports movement only when human-reviewed collections use the same methodology and the exact persisted buyer-question text, provider, exact model, locale, market, buyer stage, and versioned measurement context in chronological order. Missing historical measurement context is not guessed. Each selected run remains inspectable on its own.</p><Link href={`/app/runs/${later.id}`}>Inspect the later evidence <Arrow /></Link></div>
    </main>;
  }

  const leftAnswers = assessment.answers.filter((answer) => answer.runId === left);
  const rightAnswers = assessment.answers.filter((answer) => answer.runId === right);
  const leftByKey = new Map(leftAnswers.map((answer) => [answerKey(answer), answer]));
  const rightByKey = new Map(rightAnswers.map((answer) => [answerKey(answer), answer]));
  const gainedBrandQuestions: string[] = [];
  const lostBrandQuestions: string[] = [];

  for (const [key, current] of rightByKey) {
    const previous = leftByKey.get(key);
    if (!previous) continue;
    if (previous.brandPresent === false && current.brandPresent === true) gainedBrandQuestions.push(current.promptText);
    if (previous.brandPresent === true && current.brandPresent === false) lostBrandQuestions.push(current.promptText);
  }

  const leftSources = sourceSet(leftAnswers);
  const rightSources = sourceSet(rightAnswers);
  const gainedSources = difference(rightSources, leftSources);
  const lostSources = difference(leftSources, rightSources);
  const leftCitedAnswers = citedAnswerCount(leftAnswers);
  const rightCitedAnswers = citedAnswerCount(rightAnswers);

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Exact run comparison</span><h1>Observed differences across a proven comparable pair.</h1><p>Both collections passed human review and use the same methodology plus the exact persisted buyer-question text, provider, exact model, locale, market, buyer stage, and versioned measurement context. Differences are observations, not proof of causation or buyer behavior.</p></div><Link className="button button--outline" href="/app/runs">Choose other runs</Link></div>
    <div className="run-comparison-metrics"><article><span>Earlier</span><strong>{earlier.date}</strong><small>{earlier.id.slice(0, 8).toUpperCase()}</small></article><article><span>Later</span><strong>{later.date}</strong><small>{later.id.slice(0, 8).toUpperCase()}</small></article><article><span>Verified answers</span><strong>{leftAnswers.length} → {rightAnswers.length}</strong><small>human-reviewed evidence only</small></article><article><span>Cited answers</span><strong>{leftCitedAnswers}/{leftAnswers.length} → {rightCitedAnswers}/{rightAnswers.length}</strong><small>answers with a returned public HTTP(S) citation</small></article></div>
    <div className="run-diff-grid">
      <section className="panel"><span className="eyebrow">Brand presence observations</span><h2>Newly observed</h2>{gainedBrandQuestions.length ? <ul>{gainedBrandQuestions.map((question) => <li key={`gain-${question}`}>{question}</li>)}</ul> : <p>No verified question changed from explicit brand absence to explicit brand presence.</p>}<h2>No longer observed</h2>{lostBrandQuestions.length ? <ul>{lostBrandQuestions.map((question) => <li key={`loss-${question}`}>{question}</li>)}</ul> : <p>No verified question changed from explicit brand presence to explicit brand absence.</p>}</section>
      <section className="panel"><span className="eyebrow">Returned citation observations</span><h2>Newly returned</h2>{gainedSources.length ? <ul>{gainedSources.slice(0, 25).map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url} ↗</a></li>)}</ul> : <p>No public citation URL was newly returned.</p>}<h2>No longer returned</h2>{lostSources.length ? <ul>{lostSources.slice(0, 25).map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url} ↗</a></li>)}</ul> : <p>No previously returned public citation URL disappeared from this exact pair.</p>}</section>
    </div>
    <div className="evidence-note"><strong>Comparison boundary</strong><p>“Newly observed” and “no longer observed” mean differences between these exact reviewed provider observations. Unknown brand states are not converted into gains or losses, and no synthetic confidence or causal score is calculated. The comparison gate also requires complete persisted measurement context.</p><Link href={`/app/runs/${right}`}>Inspect the later evidence <Arrow /></Link></div>
  </main>;
}