import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, StatusDot } from "@/components/brand";
import { SourceLiveInspector } from "@/components/source-live-inspector";
import { SourceReviewForm } from "@/components/source-review-form";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadSourceEvidenceContexts, loadSourceMap } from "@/lib/data";
import { estimateSourceCredibility } from "@/lib/source-credibility";
import { loadSourceSnapshotHistory } from "@/lib/source-snapshots";
import { CommentThread } from "@/components/comment-thread";

const snapshotStateLabel = (state: string) => ({
  initial: "First saved check",
  unchanged: "No fingerprint change",
  changed: "Fingerprint changed",
  unreachable: "Became unreachable",
  unknown: "Not comparable",
}[state] || state);

const snapshotDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
}).format(new Date(value));

const shortRecord = (value: string) => value.slice(0, 8).toUpperCase();

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app/source-map");
  const { id } = await params;
  const [sources, role] = await Promise.all([loadSourceMap(viewer), getPrimaryWorkspaceRole(viewer)]);
  const source = sources.find((entry) => entry.id === id);
  if (!source) notFound();
  const [evidence, snapshots] = source.sourceId
    ? await Promise.all([
      loadSourceEvidenceContexts(viewer, [source.sourceId]).then((rows) => rows[source.sourceId as string] || []),
      loadSourceSnapshotHistory(viewer, source.sourceId),
    ])
    : [[], []];
  const reviewed = source.crawlerAccess !== "unknown";
  const canEdit = role === "owner" || role === "admin" || role === "analyst";
  const credibility = estimateSourceCredibility(source);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Exact source record · {source.id.slice(0, 8).toUpperCase()}</span><h1>{source.domain}</h1><p>{source.title}</p></div><Link className="button button--outline" href="/app/source-map">← Back to Sources</Link></div>
    <div className="record-grid">
      <section className="panel panel--wide"><div className="record-url"><span>Canonical URL</span><a href={source.url} target="_blank" rel="noreferrer">{source.url} ↗</a></div><div className="record-facts"><div><span>Observed evidence</span><strong>{source.evidenceCount} citations</strong></div><div><span>Your brand</span><strong><StatusDot tone={!reviewed ? "gray" : source.clientPresent ? "green" : "red"} />{!reviewed ? "Not reviewed" : source.clientPresent ? "Present" : "Absent"}</strong></div><div><span>Crawler access</span><strong>{source.crawlerAccess}</strong></div><div><span>Last reviewed</span><strong>{source.reviewedAt || (viewer.mode === "demo" ? "Seeded demo" : "Not reviewed")}</strong></div></div><h2>Why this source is in the map</h2><p>It was cited across {source.engines.join(", ") || "the recorded provider set"}. This proves citation recurrence only; page-level brand presence and editorial feasibility remain separate review tasks.</p></section>
      <aside className="panel"><span className="eyebrow">Candidate route</span><h2>{source.route}</h2><ol className="record-steps"><li>Inspect the source and record crawler access.</li><li>Verify whether your brand and competitors actually appear.</li><li>Confirm editorial fit and evidence requirements.</li><li>Choose only a legitimate, disclosed contribution route.</li><li>Track publication and later citations independently.</li></ol><Link className="text-link" href="/app/opportunities">Open Opportunities <Arrow /></Link></aside>
    </div>
    <section className="panel source-credibility"><div><span className="eyebrow">Estimated source credibility</span><h2>{credibility.score}/100 · {credibility.confidence} confidence</h2><p>This transparent heuristic uses only Foremention-observed citation recurrence, provider coverage, publisher-type signals, reachability, and dated human review. It is not a third-party domain-authority score.</p></div><div><strong>Signals used</strong><ul>{credibility.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul></div><div><strong>Still unknown</strong><ul>{credibility.missing.map((signal) => <li key={signal}>{signal}</li>)}</ul></div></section>
    {evidence.length > 0 && <section className="panel source-evidence-chain"><div className="panel-heading"><div><span className="eyebrow">Observed evidence chain</span><h2>The answer that cited this page.</h2></div></div>{evidence.map((item) => <article key={`${item.answerId}-${item.citationOrdinal}`}><div><span>Buyer question</span><strong>{item.prompt}</strong></div><div><span>Provider record</span><strong>{item.provider}{item.model ? ` · ${item.model}` : ""} · {item.observedAt}</strong></div><div><span>Citation position</span><strong>{item.citationOrdinal ? `#${item.citationOrdinal}` : "Recorded without position"}</strong></div><p>{item.answerExcerpt}</p></article>)}</section>}
    <section className="panel source-snapshot-history">
      <div className="panel-heading"><div><span className="eyebrow">Saved page observations</span><h2>What changed on this cited page?</h2><p>Foremention saves bounded retrieval metadata and a text fingerprint—not the page body. Each row keeps its collection link, previous-observation pointer, and representation version so the provenance can be inspected later. A changed fingerprint records an observed difference; it does not prove what caused the difference.</p></div></div>
      {snapshots.length ? <div className="table-wrap"><table><thead><tr><th>Checked</th><th>Result</th><th>Page</th><th>Provenance</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}><td>{snapshotDate(snapshot.checkedAt)}<div className="table-caption">Snapshot {shortRecord(snapshot.id)}</div></td><td><strong>{snapshotStateLabel(snapshot.changeState)}</strong><div className="table-caption">{snapshot.access}{snapshot.httpStatus ? ` · HTTP ${snapshot.httpStatus}` : ""}{snapshot.changeReason ? ` · ${snapshot.changeReason}` : ""}</div></td><td>{snapshot.pageTitle || source.title}<div className="table-caption">{snapshot.finalUrl}</div>{snapshot.contentLength !== null && <div className="table-caption">Bounded visible text: {snapshot.contentLength.toLocaleString()} chars</div>}</td><td>{snapshot.runId ? <Link href={`/app/runs/${snapshot.runId}`}>Collection {shortRecord(snapshot.runId)} →</Link> : <strong>Manual page check</strong>}<div className="table-caption">{snapshot.linkedObservationCount} linked citation observation{snapshot.linkedObservationCount === 1 ? "" : "s"}</div><div className="table-caption">{snapshot.previousSnapshotId ? `Previous ${shortRecord(snapshot.previousSnapshotId)}` : "No previous saved observation"}</div><div className="table-caption">Representation: {snapshot.representationVersion}</div><div className="table-caption">Fingerprint: {snapshot.fingerprint || "Unavailable"}</div></td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No saved page observations yet.</strong><span>Run a collection or inspect this source to create the first bounded fingerprint.</span></div>}
      <p className="table-caption">Fingerprint values are derived from a bounded normalized text representation for comparison. They are not stored page content and are not proof of why a page changed.</p>
    </section>
    <SourceLiveInspector entryId={source.id} demo={viewer.mode === "demo"} canInspect={canEdit} />
    <section className="panel source-review-panel"><SourceReviewForm source={source} demo={viewer.mode === "demo"} canEdit={canEdit} /></section>
    <section className="panel"><CommentThread entityType="source_map_entry" entityId={source.id} demo={viewer.mode === "demo"} /></section>
  </main>;
}
