// Mirrors RETRIEVAL_VERSIONS / LEGACY_RETRIEVAL_VERSION in lib/evidence-trust.mjs
// (kept import-free for isolated harnesses; equality asserted in tests).
const RETRIEVAL_VERSIONS = Object.freeze({
  "brave-search": "independent-retrieval.brave-search.2026-10-19.1",
  "bing-rss": "independent-retrieval.bing-rss.2026-10-19.1",
} as const);
const LEGACY_RETRIEVAL_VERSION = "returned-references.2026-08-30.1" as const;

export type ObservationMethodology = {
  version: string;
  name: string;
  observationSurface: "provider-api";
  promptSnapshot: "persisted-run-selection";
  providerIdentity: "exact-provider";
  modelIdentity: "exact-returned-or-configured-model";
  /**
   * Evidence trust (2026-10-19): corrected descriptor. The hosted-model lane
   * has always grounded on search results Foremention retrieves itself; those
   * are recorded and labelled as independent retrieval, never as provider
   * citations. Native provider citations stay provider-returned only.
   */
  citationHandling: "provider-returned-or-labelled-independent-retrieval";
  /** Retrieval method identity; per-answer retrievalVersion is the comparison gate. */
  retrieval: {
    hostedModelLane: "foremention-independent-search";
    activeProvider: "brave-search-api-when-configured";
    retrievalVersions: typeof RETRIEVAL_VERSIONS;
    legacyRetrievalVersion: typeof LEGACY_RETRIEVAL_VERSION;
    snippetPersistence: "sanitised-snippets-saved-with-each-observation";
    claimCheck: "lexical-overlap-against-saved-snippets";
    retrievedTextPolicy: "data-not-instructions";
  };
  sourceInspection: "bounded-public-page-fingerprint";
  humanReview: "required-before-trend-analytics";
  comparisonBoundary: "exact-question-provider-model-methodology";
};

/**
 * Registry for the methodology stamped onto newly created AI observation runs.
 *
 * A version change is a measurement-method change, not a cosmetic release.
 * Existing runs and derived Source Maps must retain the version recorded at
 * collection time so historical evidence never silently upgrades itself.
 *
 * Evidence trust (2026-10-19): the Bing RSS -> Brave Search switch and the new
 * retrieved-text sanitisation are recorded per answer as retrievalVersion
 * (see lib/evidence-trust.mjs and the 20261019173100 migration), which every
 * comparability gate already requires to be identical. The run-level version
 * stays "3.0" on purpose: bumping it holds every existing Measurement Schedule
 * until a customer re-approves it, which is a founder decision.
 */
export const CURRENT_OBSERVATION_METHODOLOGY: ObservationMethodology = Object.freeze({
  version: "3.0",
  name: "Foremention evidence-first provider observation",
  observationSurface: "provider-api",
  promptSnapshot: "persisted-run-selection",
  providerIdentity: "exact-provider",
  modelIdentity: "exact-returned-or-configured-model",
  citationHandling: "provider-returned-or-labelled-independent-retrieval",
  retrieval: Object.freeze({
    hostedModelLane: "foremention-independent-search",
    activeProvider: "brave-search-api-when-configured",
    retrievalVersions: RETRIEVAL_VERSIONS,
    legacyRetrievalVersion: LEGACY_RETRIEVAL_VERSION,
    snippetPersistence: "sanitised-snippets-saved-with-each-observation",
    claimCheck: "lexical-overlap-against-saved-snippets",
    retrievedTextPolicy: "data-not-instructions",
  }) as ObservationMethodology["retrieval"],
  sourceInspection: "bounded-public-page-fingerprint",
  humanReview: "required-before-trend-analytics",
  comparisonBoundary: "exact-question-provider-model-methodology",
});

export function currentObservationMethodologyVersion() {
  return CURRENT_OBSERVATION_METHODOLOGY.version;
}
