import Link from "next/link";
import { CommentThread } from "@/components/comment-thread";
import { SourceLiveInspector } from "@/components/source-live-inspector";
import { SourceReviewForm } from "@/components/source-review-form";
import type { Viewer } from "@/lib/auth";
import { estimateSourceCredibility } from "@/lib/source-credibility";
import { loadSourceSnapshotHistory } from "@/lib/source-snapshots";
import type { SourceMapEntry } from "@/lib/types";

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

export async function RecommendationSourceEvidence({
  viewer,
  source,
  demo,
  canInspectSources,
}: {
  viewer: Viewer;
  source: SourceMapEntry;
  demo: boolean;
  canInspectSources: boolean;
}) {
  const reviewed = Boolean(source.reviewedAt);
  const credibility = estimateSourceCredibility(source);
  const snapshots = source.sourceId ? await loadSourceSnapshotHistory(viewer, source.sourceId) : [];

  return <div className="canonical-source-evidence">
    <dl className="canonical-contained-evidence__facts">
      <div><dt>Returned</dt><dd>Yes</dd></div>
      <div><dt>Retrievability</dt><dd>{source.crawlerAccess}</dd></div>
      <div><dt>Human review</dt><dd>{reviewed ? "Reviewed" : "Pending"}</dd></div>
    </dl>

    <section className="canonical-observed-evidence" aria-labelledby={`evidence-chain-${source.id}`}>
      <span className="eyebrow">Observed evidence chain</span>
      <h3 id={`evidence-chain-${source.id}`}>{source.domain}</h3>
      <p>{source.evidenceCount} provider-returned citation observation{source.evidenceCount === 1 ? "" : "s"} across {new Set(source.engines).size} observed AI system{new Set(source.engines).size === 1 ? "" : "s"}. Citation recurrence is observed evidence; it does not prove authority, influence, or that this page caused a recommendation.</p>
    </section>

    <section className="canonical-source-credibility source-credibility" aria-labelledby={`credibility-${source.id}`}>
      <div>
        <span className="eyebrow">Estimated source credibility</span>
        <h3 id={`credibility-${source.id}`}>{credibility.score}/100 · {credibility.confidence} confidence</h3>
        <p>This transparent heuristic uses only Foremention-observed citation recurrence, provider coverage, publisher-type signals, observed reachability, and explicit human review. It is not a third-party domain-authority score.</p>
      </div>
      <div><strong>Signals used</strong><ul>{credibility.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul></div>
      <div><strong>Still unknown</strong><ul>{credibility.missing.map((signal) => <li key={signal}>{signal}</li>)}</ul></div>
    </section>

    <section className="canonical-snapshot-history source-snapshot-history" aria-labelledby={`snapshots-${source.id}`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Saved page observations</span>
          <h3 id={`snapshots-${source.id}`}>What changed on this cited page?</h3>
          <p>Foremention saves bounded retrieval metadata and a text fingerprint—not the page body. A changed fingerprint records an observed difference; it does not prove what caused the difference.</p>
        </div>
      </div>
      {snapshots.length ? <div className="table-wrap"><table><thead><tr><th>Checked</th><th>Result</th><th>Page</th><th>Provenance</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}>
        <td>{snapshotDate(snapshot.checkedAt)}<div className="table-caption">Snapshot {shortRecord(snapshot.id)}</div></td>
        <td><strong>{snapshotStateLabel(snapshot.changeState)}</strong><div className="table-caption">{snapshot.access}{snapshot.httpStatus ? ` · HTTP ${snapshot.httpStatus}` : ""}{snapshot.changeReason ? ` · ${snapshot.changeReason}` : ""}</div></td>
        <td>{snapshot.pageTitle || source.title}<div className="table-caption">{snapshot.finalUrl}</div>{snapshot.contentLength !== null && <div className="table-caption">Bounded visible text: {snapshot.contentLength.toLocaleString()} chars</div>}</td>
        <td>{snapshot.runId ? <Link href={`/app/runs/${snapshot.runId}`}>Collection {shortRecord(snapshot.runId)} →</Link> : <strong>Manual page check</strong>}<div className="table-caption">{snapshot.linkedObservationCount} linked citation observation{snapshot.linkedObservationCount === 1 ? "" : "s"}</div><div className="table-caption">{snapshot.previousSnapshotId ? `Previous ${shortRecord(snapshot.previousSnapshotId)}` : "No previous saved observation"}</div><div className="table-caption">Representation: {snapshot.representationVersion}</div><div className="table-caption">Fingerprint: {snapshot.fingerprint || "Unavailable"}</div></td>
      </tr>)}</tbody></table></div> : <div className="empty-state empty-state--compact"><strong>No saved page observations yet.</strong><span>Run a collection or inspect this evidence to create the first bounded fingerprint.</span></div>}
      <p className="table-caption">Fingerprint values come from a bounded normalized text representation. They are not stored page content and are not proof of why a page changed.</p>
    </section>

    <SourceLiveInspector entryId={source.id} demo={demo} canInspect={canInspectSources} />
    <section className="panel source-review-panel canonical-contained-review"><SourceReviewForm source={source} demo={demo} canEdit={canInspectSources} /></section>
    <section className="panel canonical-contained-comments"><CommentThread entityType="source_map_entry" entityId={source.id} demo={demo} /></section>
  </div>;
}
