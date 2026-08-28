import { SourceLiveInspector } from "@/components/source-live-inspector";
import { SourceReviewForm } from "@/components/source-review-form";
import type { WorkspaceRunAnswer } from "@/lib/data";
import { extractBrandMentionContexts } from "@/lib/mention-context";
import type { ProviderRunDiagnostics } from "@/lib/provider-run-diagnostics";
import { findSourceXrayTarget } from "@/lib/source-xray-link";
import type { SourceMapEntry } from "@/lib/types";

export function RecommendationAnswerRecord({
  answer,
  diagnostics,
  sourceMap,
  organizationName,
  reviewMode,
  demo,
  canInspectSources,
}: {
  answer: WorkspaceRunAnswer;
  diagnostics?: ProviderRunDiagnostics;
  sourceMap: SourceMapEntry[];
  organizationName: string;
  reviewMode: boolean;
  demo: boolean;
  canInspectSources: boolean;
}) {
  const mentionContexts = extractBrandMentionContexts(answer.answer, organizationName);
  const searchMetadataLabel = diagnostics?.searchUsed === true
    ? diagnostics.searchResultCount === null
      ? "Web search executed · structured search-result count was not recorded"
      : `Web search executed · ${diagnostics.searchResultCount} structured search result${diagnostics.searchResultCount === 1 ? "" : "s"} returned`
    : diagnostics?.searchUsed === false
      ? "Web search was not observed in the provider tool metadata"
      : "Web-search execution was not recorded for this answer";

  return <article className="panel canonical-answer-record">
    <header>
      <div><span>AI system</span><strong>{answer.provider}</strong><small>{answer.model || "Recorded model"}</small></div>
      <span className={`status-chip ${answer.status === "verified" ? "status-chip--active" : ""}`}>{answer.status}</span>
    </header>

    <h2>{answer.prompt}</h2>
    <p>{answer.answer}</p>

    {diagnostics && <div className="answer-provider-metadata" data-provider-search-used={diagnostics.searchUsed === null ? "unknown" : String(diagnostics.searchUsed)} data-provider-search-result-count={diagnostics.searchResultCount === null ? "unknown" : String(diagnostics.searchResultCount)}>
      <strong>Provider search metadata</strong>
      <span>{searchMetadataLabel}</span>
      <small>Provider search execution and returned citations are separate facts. A search does not prove that the provider returned a citable URL.</small>
    </div>}

    {mentionContexts.length > 0 && <section className="brand-mention-context">
      <span className="eyebrow">Brand mention context</span>
      <h3>{mentionContexts.length} exact mention{mentionContexts.length === 1 ? "" : "s"}</h3>
      {mentionContexts.map((mention, index) => <article key={`${answer.id}-mention-${index}`}><strong>{mention.sentence}</strong><p>{mention.paragraph}</p></article>)}
      <small>Sentence and surrounding paragraph are extracted verbatim from this persisted provider answer.</small>
    </section>}

    <div className="answer-citations canonical-citations">
      <strong>References returned by the AI system</strong>
      {answer.citations.length ? answer.citations.map((citation, index) => {
        const sourceTarget = reviewMode ? null : findSourceXrayTarget(citation.url, sourceMap);
        return <div className="canonical-citation-record" key={`${citation.url}-${index}`}>
          <a href={citation.url} target="_blank" rel="noreferrer">{citation.title || citation.url} &nearr;</a>
          {sourceTarget ? <details className="canonical-contained-evidence">
            <summary>
              <span>Evidence inspection</span>
              <strong>{sourceTarget.domain}</strong>
              <small>Returned reference → mapped source record → bounded retrieval → human review</small>
            </summary>
            <div className="canonical-contained-evidence__body">
              <dl className="canonical-contained-evidence__facts">
                <div><dt>Returned</dt><dd>Yes</dd></div>
                <div><dt>Retrievability</dt><dd>{sourceTarget.crawlerAccess}</dd></div>
                <div><dt>Human review</dt><dd>{sourceTarget.reviewedAt ? "Reviewed" : "Pending"}</dd></div>
              </dl>
              <SourceLiveInspector entryId={sourceTarget.id} demo={demo} canInspect={canInspectSources} />
              <section className="panel source-review-panel canonical-contained-review"><SourceReviewForm source={sourceTarget} demo={demo} canEdit={canInspectSources} /></section>
            </div>
          </details> : <small className="canonical-citation-record__boundary">No run-scoped mapped source record is available yet. The returned citation remains the evidence boundary.</small>}
        </div>;
      }) : <span>No cited URLs returned</span>}
    </div>

    <small>Collected {answer.collectedAt}</small>
  </article>;
}
