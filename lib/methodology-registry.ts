export type ObservationMethodology = {
  version: string;
  name: string;
  observationSurface: "provider-api";
  promptSnapshot: "persisted-run-selection";
  providerIdentity: "exact-provider";
  modelIdentity: "exact-returned-or-configured-model";
  citationHandling: "provider-returned-only";
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
 */
export const CURRENT_OBSERVATION_METHODOLOGY: ObservationMethodology = Object.freeze({
  version: "3.0",
  name: "Foremention evidence-first provider observation",
  observationSurface: "provider-api",
  promptSnapshot: "persisted-run-selection",
  providerIdentity: "exact-provider",
  modelIdentity: "exact-returned-or-configured-model",
  citationHandling: "provider-returned-only",
  sourceInspection: "bounded-public-page-fingerprint",
  humanReview: "required-before-trend-analytics",
  comparisonBoundary: "exact-question-provider-model-methodology",
});

export function currentObservationMethodologyVersion() {
  return CURRENT_OBSERVATION_METHODOLOGY.version;
}
