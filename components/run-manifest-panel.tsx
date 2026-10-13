import type { RunManifest } from "@/lib/run-manifest";

const money = (value: number) => value ? `$${value.toFixed(value < 0.01 ? 4 : 2)}` : "$0.00";
const timestamp = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value))
  : "Not recorded";

export function RunManifestPanel({ manifest }: { manifest: RunManifest }) {
  const surfaceLabels = Array.from(new Set(manifest.surfaces.map((surface) => surface.label)));
  const hasSearchBacked = manifest.surfaces.some((surface) => surface.kind === "search-backed-provider-api");
  const coverage = manifest.plannedObservations
    ? Math.round((manifest.completedObservations / manifest.plannedObservations) * 100)
    : 0;

  return <section className="panel run-manifest" aria-labelledby="run-manifest-title">
    <div className="panel-heading panel-heading--padded">
      <div>
        <span className="eyebrow">Measurement contract</span>
        <h2 id="run-manifest-title">Run manifest</h2>
        <p>The exact scope and provenance Foremention uses to interpret this Recommendation Record.</p>
      </div>
      <strong className="run-manifest__coverage">{manifest.completedObservations}/{manifest.plannedObservations} observed</strong>
    </div>

    <div className="run-manifest__surface" role="note">
      <strong>{surfaceLabels.join(" + ") || "Measurement surface unavailable"}</strong>
      <p>{hasSearchBacked
        ? "This is a search-backed provider/API measurement. It is not an observation of the provider's consumer application interface, personalized UI, or hidden ranking logic."
        : "This is a provider/API measurement. It is not an observation of a consumer application interface or hidden ranking logic."}</p>
    </div>

    <dl className="run-manifest__grid">
      <div><dt>Active project</dt><dd>{manifest.projectName}</dd></div>
      <div><dt>Canonical brand</dt><dd>{manifest.brand || "Not recorded"}</dd></div>
      <div><dt>Provider</dt><dd>{manifest.providerIds.join(", ") || "Not recorded"}</dd></div>
      <div><dt>Exact model</dt><dd>{manifest.modelIds.join(", ") || "Not returned"}</dd></div>
      <div><dt>Methodology</dt><dd>{manifest.methodologyVersion} · {manifest.methodologyName}</dd></div>
      <div><dt>Coverage</dt><dd>{manifest.plannedObservations ? `${coverage}% · ${manifest.completedObservations}/${manifest.plannedObservations}` : "No planned observations"}</dd></div>
      <div><dt>Failures</dt><dd>{manifest.failedObservations} failed · {manifest.excludedObservations} excluded · {manifest.missingObservations} missing</dd></div>
      <div><dt>Spend ceiling</dt><dd>{money(manifest.estimatedMaximumCostUsd)} reserved maximum</dd></div>
      <div><dt>Actual recorded cost</dt><dd>{money(manifest.actualCostUsd)}</dd></div>
      <div><dt>Collection window</dt><dd>{timestamp(manifest.startedAt || manifest.createdAt)} → {timestamp(manifest.completedAt)}</dd></div>
    </dl>

    <details className="run-manifest__details">
      <summary>Question snapshot and version identity</summary>
      <div className="run-manifest__versions">
        <span>Prompt pipeline {manifest.versions.prompt || "unknown"}</span>
        <span>Parser {manifest.versions.parser || "unknown"}</span>
        <span>Retrieval {manifest.versions.retrieval || "unknown"}</span>
        <span>Policy {manifest.versions.policy || "unknown"}</span>
        <span>Schema {manifest.versions.schema || "unknown"}</span>
        <span>Evaluation {manifest.versions.evaluation || "unknown"}</span>
      </div>
      {manifest.questions.length ? <ol className="run-manifest__questions">
        {manifest.questions.map((question) => <li key={`${question.promptKey}-${question.promptId || question.text}`}>
          <strong>{question.text}</strong>
          <small>{question.revision ? `Revision v${question.revision} · ` : "Revision unresolved · "}{question.locale}{question.market ? ` · ${question.market}` : ""} · frozen in this run</small>
        </li>)}
      </ol> : <p className="table-caption">No persisted question snapshot is available for this record.</p>}
    </details>
  </section>;
}
