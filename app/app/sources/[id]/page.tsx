import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, StatusDot } from "@/components/brand";
import { SourceLiveInspector } from "@/components/source-live-inspector";
import { SourceReviewForm } from "@/components/source-review-form";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadSourceEvidenceContexts, loadSourceMap } from "@/lib/data";

export default async function SourceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/source-map");
  const { id } = await params;
  const [entries, role] = await Promise.all([loadSourceMap(viewer), getPrimaryWorkspaceRole(viewer)]);
  const source = entries.find((item) => item.id === id);
  if (!source) notFound();
  const evidenceContexts = await loadSourceEvidenceContexts(viewer, source.sourceId ? [source.sourceId] : []);
  const evidence = source.sourceId ? evidenceContexts[source.sourceId] || [] : [];
  const reviewed = source.crawlerAccess !== "unknown";
  const canEdit = role === "owner" || role === "admin" || role === "analyst";
  return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Exact source record · {source.id.slice(0, 8).toUpperCase()}</span><h1>{source.domain}</h1><p>{source.title}</p></div><Link className="button button--outline" href="/app/source-map">← Back to Source Map</Link></div><div className="record-grid"><section className="panel panel--wide"><div className="record-url"><span>Canonical URL</span><a href={source.url} target="_blank" rel="noreferrer">{source.url} ↗</a></div><div className="record-facts"><div><span>Observed evidence</span><strong>{source.evidenceCount} citations</strong></div><div><span>Your brand</span><strong><StatusDot tone={!reviewed ? "gray" : source.clientPresent ? "green" : "red"} />{!reviewed ? "Not reviewed" : source.clientPresent ? "Present" : "Absent"}</strong></div><div><span>Crawler access</span><strong>{source.crawlerAccess}</strong></div><div><span>Last reviewed</span><strong>{source.reviewedAt || (viewer.mode === "demo" ? "Seeded demo" : "Not reviewed")}</strong></div></div><h2>Why this source is in the map</h2><p>It was cited across {source.engines.join(", ") || "the recorded provider set"}. This proves citation recurrence only; page-level brand presence and editorial feasibility remain separate review tasks.</p></section><aside className="panel"><span className="eyebrow">Candidate route</span><h2>{source.route}</h2><ol className="record-steps"><li>Inspect the source and record crawler access.</li><li>Verify whether your brand and competitors actually appear.</li><li>Confirm editorial fit and evidence requirements.</li><li>Choose only a legitimate, disclosed contribution route.</li><li>Track publication and later citations independently.</li></ol><Link className="text-link" href="/app/opportunities">Open Priority Gaps <Arrow /></Link></aside></div>{evidence.length > 0 && <section className="panel source-evidence-chain"><div className="panel-heading"><div><span className="eyebrow">Observed evidence chain</span><h2>The answer that cited this page.</h2></div></div>{evidence.map((item) => <article key={`${item.answerId}-${item.citationOrdinal}`}><div><span>Buyer question</span><strong>{item.prompt}</strong></div><div><span>Provider record</span><strong>{item.provider}{item.model ? ` · ${item.model}` : ""} · {item.observedAt}</strong></div><div><span>Citation position</span><strong>{item.citationOrdinal ? `#${item.citationOrdinal}` : "Recorded without position"}</strong></div><p>{item.answerExcerpt}</p></article>)}</section>}<SourceLiveInspector entryId={source.id} demo={viewer.mode === "demo"} canInspect={canEdit} /><section className="panel source-review-panel"><SourceReviewForm source={source} demo={viewer.mode === "demo"} canEdit={canEdit} /></section></main>;
}
