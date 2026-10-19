import { RecommendationSourceEvidence } from "@/components/recommendation-source-evidence";
import type { Viewer } from "@/lib/auth";
import type { WorkspaceRunAnswer } from "@/lib/data";
import { extractBrandMentionContexts } from "@/lib/mention-context";
import type { ProviderRunDiagnostics } from "@/lib/provider-run-diagnostics";
import { findSourceXrayTarget } from "@/lib/source-xray-link";
import type { SourceMapEntry } from "@/lib/types";
import { referenceListHeading, SUPPORT_STATUS_LABELS } from "@/lib/evidence-trust.mjs";

export function RecommendationAnswerRecord({
  viewer,
  answer,
  diagnostics,
  sourceMap,
  organizationName,
  reviewMode,
  demo,
  canInspectSources,
}: {
  viewer: Viewer;
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

  const trust = answer.evidenceTrust;
  const references = referenceListHeading({
    origin: trust?.origin || (answer.citations.some((citation) => citation.origin === "independent_retrieval" || citation.retrievedBy === "foremention") ? "independent_retrieval" : undefined),
    retrievalProvider: trust?.retrievalProvider || answer.citations.find((citation) => citation.retrievalProvider)?.retrievalProvider,
  });
  const support = trust?.support || null;
  const unsupportedClaims = (support?.claims || []).filter((claim) => !claim.supported);
  const snippetFor = (url: string) => trust?.snapshot?.find((entry) => entry.url === url) || null;

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

    {support && <section className="answer-support-check" data-support-status={support.status || "unknown"} data-verification-blocked={trust?.verificationBlocked ? "true" : "false"}>
      <span className="eyebrow">Claim check against saved snippets</span>
      <strong>{SUPPORT_STATUS_LABELS[(support.status || "") as keyof typeof SUPPORT_STATUS_LABELS] || "Claim check not recorded"}</strong>
      {typeof support.claimCount === "number" && support.claimCount > 0 && <span>{support.supportedCount ?? 0} of {support.claimCount} checked claim{support.claimCount === 1 ? "" : "s"} found in the saved snippets</span>}
      {unsupportedClaims.length > 0 && <ul>{unsupportedClaims.map((claim, index) => <li key={`${answer.id}-unsupported-${index}`}><mark>Unsupported</mark> {claim.text}</li>)}</ul>}
      {(support.citationsNotInSnapshot || []).length > 0 && <small>{support.citationsNotInSnapshot!.length} selected reference{support.citationsNotInSnapshot!.length === 1 ? " was" : "s were"} not in the saved retrieval snapshot.</small>}
      <small>{support.note || "A lexical check, not semantic verification. It does not prove a claim is true."}</small>
    </section>}

    <div className="answer-citations canonical-citations" data-reference-origin={trust?.origin || "unknown"}>
      <strong>{references.heading}</strong>
      <small>{references.boundary}</small>
      {answer.citations.length ? answer.citations.map((citation, index) => {
        const sourceTarget = reviewMode ? null : findSourceXrayTarget(citation.url, sourceMap);
        const saved = snippetFor(citation.url);
        return <div className="canonical-citation-record" key={`${citation.url}-${index}`}>
          <a href={citation.url} target="_blank" rel="noreferrer">{citation.title || citation.url} &nearr;</a>
          {saved && <blockquote className="canonical-citation-record__snippet"><small>Saved snippet Foremention retrieved{saved.injectionSuspected ? " · instruction-like text was removed" : ""}</small><p>{saved.snippet || "No snippet text was returned for this result."}</p></blockquote>}
          {sourceTarget ? <details className="canonical-contained-evidence">
            <summary>
              <span>Evidence inspection</span>
              <strong>{sourceTarget.domain}</strong>
              <small>Returned reference → mapped source record → bounded retrieval → human review</small>
            </summary>
            <div className="canonical-contained-evidence__body">
              <RecommendationSourceEvidence viewer={viewer} source={sourceTarget} demo={demo} canInspectSources={canInspectSources} inspectionId={`${answer.id}-${index}`} />
            </div>
          </details> : <small className="canonical-citation-record__boundary">No run-scoped mapped source record is available yet. The recorded reference remains the evidence boundary.</small>}
        </div>;
      }) : <span>No references recorded</span>}
    </div>

    <small>Collected {answer.collectedAt}</small>
  </article>;
}
