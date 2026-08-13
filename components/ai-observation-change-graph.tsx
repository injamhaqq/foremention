import Link from "next/link";
import type { AiObservationChangeGraph } from "@/lib/ai-observation-change";

const kindLabel = (kind: string) => ({
  brand_mention: "Brand mention",
  citation: "Citation observation",
  source: "Unique cited source",
  competitor: "Competitor context",
  answer_context: "AI answer context",
}[kind] || "Observed change");

const eventHref = (kind: string, latestRunId: string) => kind === "competitor"
  ? "/app/competitors"
  : kind === "source"
    ? "/app/source-map"
    : `/app/runs/${latestRunId}`;

export function AiObservationChangeGraphPanel({ graph }: { graph: AiObservationChangeGraph }) {
  const heading = graph.status === "comparable"
    ? "What changed inside the exact comparable AI evidence pair?"
    : graph.status === "withheld"
      ? "AI-observation movement is withheld."
      : graph.status === "fictional"
        ? "AI-observation movement is disabled in the fictional demo."
        : "One reviewed collection establishes the AI baseline.";

  return <section className="panel panel--flush ai-observation-change-graph">
    <div className="panel-heading panel-heading--padded">
      <div>
        <span className="eyebrow">AI Observation Change Graph</span>
        <h2>{heading}</h2>
        <p>{graph.note}</p>
        <p className="table-caption"><strong>{graph.comparable ? "Exact persisted-question comparison pair" : "No customer movement claim"}</strong> · Competitor context {graph.coverage.competitorContext === "comparable" ? "has reviewed Source Maps on both runs" : "is withheld unless both runs have reviewed Source Maps"}</p>
      </div>
      <Link className="text-link" href={`/app/runs/${graph.latestRunId}`}>Inspect latest AI Results →</Link>
    </div>
    {graph.events.length ? <div className="notification-list">{graph.events.map((event) => <article key={event.id}><div><span>{kindLabel(event.kind)} · {event.direction}</span><strong>{event.title}</strong><p>{event.detail}</p></div><Link href={eventHref(event.kind, graph.latestRunId)}>Inspect →</Link></article>)}</div> : <div className="empty-state empty-state--border"><h2>{graph.status === "comparable" ? "No supported AI-observation differences were recorded." : "No comparable AI movement is available yet."}</h2><p>{graph.status === "comparable" ? "Brand mentions, canonical citation observations, unique cited sources, reviewed competitor context when available, and exact answer text did not produce a supported change event." : "Foremention waits for an exact persisted buyer-question/provider/model/methodology pair instead of turning chronological neighbors into a trend."}</p></div>}
    <p className="table-caption panel-heading--padded">These are persisted observation differences, not explanations. They do not establish causation, ranking, market share, demand, traffic, leads, revenue, or publisher acceptance.</p>
  </section>;
}
