import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, StatusDot } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { loadSourceMap } from "@/lib/data";

export default async function SourceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/source-map");
  const { id } = await params;
  const entries = await loadSourceMap(viewer);
  const source = entries.find((item) => item.id === id);
  if (!source) notFound();
  const reviewed = source.crawlerAccess !== "unknown";
  return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Exact source record · {source.id.slice(0, 8).toUpperCase()}</span><h1>{source.domain}</h1><p>{source.title}</p></div><Link className="button button--outline" href="/app/source-map">← Back to Source Map</Link></div><div className="record-grid"><section className="panel panel--wide"><div className="record-url"><span>Canonical URL</span><a href={source.url} target="_blank" rel="noreferrer">{source.url} ↗</a></div><div className="record-facts"><div><span>Observed evidence</span><strong>{source.evidenceCount} citations</strong></div><div><span>Your brand</span><strong><StatusDot tone={!reviewed ? "gray" : source.clientPresent ? "green" : "red"} />{!reviewed ? "Not reviewed" : source.clientPresent ? "Present" : "Absent"}</strong></div><div><span>Crawler access</span><strong>{source.crawlerAccess}</strong></div><div><span>Feasibility</span><strong>{source.feasibility}</strong></div></div><h2>Why this source is in the map</h2><p>It was cited across {source.engines.join(", ") || "the recorded provider set"}. This proves citation recurrence only; page-level brand presence and editorial feasibility remain separate review tasks.</p></section><aside className="panel"><span className="eyebrow">Candidate route</span><h2>{source.route}</h2><ol className="record-steps"><li>Inspect the source and record crawler access.</li><li>Verify whether your brand and competitors actually appear.</li><li>Confirm editorial fit and evidence requirements.</li><li>Choose only a legitimate, disclosed contribution route.</li><li>Track publication and later citations independently.</li></ol><Link className="text-link" href="/app/opportunities">Open Priority Gaps <Arrow /></Link></aside></div></main>;
}
