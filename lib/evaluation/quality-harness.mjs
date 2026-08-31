const VERSION_KEYS = [
  "promptVersion",
  "parserVersion",
  "provider",
  "model",
  "modelVersion",
  "retrievalVersion",
  "policyVersion",
  "schemaVersion",
  "evaluationVersion",
];

const METRIC_KEYS = [
  "retrievalPrecision",
  "retrievalCoverage",
  "citationSurvival",
  "evidenceCorrectness",
  "evidenceStateCorrectness",
  "duplicateDetectionCorrectness",
  "classificationAccuracy",
  "unsupportedConclusionRate",
  "hallucinationErrorRate",
  "comparisonEligibilityCorrectness",
  "providerFailureRate",
];

const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return { numerator, denominator, value: numerator / denominator };
}

function canonicalizeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const sorted = Array.from(url.searchParams.entries()).sort(([aKey, aValue], [bKey, bValue]) =>
      aKey.localeCompare(bKey) || aValue.localeCompare(bValue));
    url.search = "";
    for (const [key, item] of sorted) url.searchParams.append(key, item);
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value.trim();
  }
}

function normalizeCitationGroups(citations = []) {
  const groups = new Map();
  for (const citation of citations) {
    const canonicalUrl = canonicalizeUrl(citation?.url);
    if (!canonicalUrl) continue;
    const existing = groups.get(canonicalUrl) || [];
    existing.push(citation);
    groups.set(canonicalUrl, existing);
  }
  return Array.from(groups, ([canonicalUrl, items]) => {
    const retrievability = items.filter((item) => typeof item.retrievable === "boolean").map((item) => item.retrievable);
    const correctness = items.filter((item) => typeof item.evidenceCorrect === "boolean").map((item) => item.evidenceCorrect);
    return {
      canonicalUrl,
      count: items.length,
      retrievable: retrievability.length ? retrievability.some(Boolean) : null,
      evidenceCorrect: correctness.length ? correctness.every(Boolean) : null,
      stale: items.some((item) => item?.stale === true),
      conflicting: items.some((item) => item?.conflicting === true),
    };
  });
}

function normalizedStringSet(values = []) {
  return new Set(values.map(canonicalizeUrl).filter(Boolean));
}

function exactSetMatch(left, right) {
  if (left.size !== right.size) return false;
  for (const item of left) if (!right.has(item)) return false;
  return true;
}

function mean(values) {
  const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function percentile(values, percentileValue) {
  const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!numbers.length) return null;
  const index = Math.max(0, Math.ceil(percentileValue * numbers.length) - 1);
  return numbers[index];
}

function relativeChange(baseline, candidate) {
  if (!Number.isFinite(baseline) || !Number.isFinite(candidate)) return null;
  if (baseline === 0) return candidate === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.abs(candidate - baseline) / Math.abs(baseline);
}

function sortedUnique(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))).sort();
}

function sameStringSet(left = [], right = []) {
  const a = sortedUnique(left);
  const b = sortedUnique(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function validateVersionContext(context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new Error("AI evaluation version context must be an object.");
  }
  for (const key of VERSION_KEYS) {
    if (typeof context[key] !== "string" || !context[key].trim()) {
      throw new Error(`AI evaluation version context requires ${key}.`);
    }
  }
  return context;
}

export function assertPrivacySafeDataset(dataset) {
  if (!dataset || typeof dataset !== "object" || !Array.isArray(dataset.cases)) {
    throw new Error("Evaluation dataset must contain a cases array.");
  }
  const approvedBoundary = typeof dataset.approvedBoundaryId === "string" && dataset.approvedBoundaryId.trim();
  for (const item of dataset.cases) {
    const classification = item?.privacy?.classification;
    if (classification === "customer_confidential" && !approvedBoundary) {
      throw new Error(`Evaluation case ${item?.id || "unknown"} contains customer-confidential material without an approved boundary.`);
    }
    if (!classification) throw new Error(`Evaluation case ${item?.id || "unknown"} is missing a privacy classification.`);
  }
  return dataset;
}

export function scoreEvaluationCase(definition, observation) {
  if (!definition || !observation || definition.id !== observation.caseId) {
    throw new Error("Evaluation definition and observation must share the same case id.");
  }
  const versions = validateVersionContext(observation.versions);
  const expected = definition.expected || {};
  const citationGroups = normalizeCitationGroups(observation.citations || []);
  const returnedUrls = new Set(citationGroups.map((item) => item.canonicalUrl));
  const relevantUrls = Array.isArray(expected.relevantCitationUrls) ? normalizedStringSet(expected.relevantCitationUrls) : null;
  const relevantReturnedCount = relevantUrls
    ? Array.from(returnedUrls).filter((url) => relevantUrls.has(url)).length
    : 0;

  const retrievableCitations = citationGroups.filter((item) => typeof item.retrievable === "boolean");
  const evidenceAssessedCitations = citationGroups.filter((item) => typeof item.evidenceCorrect === "boolean");
  const assertions = Array.isArray(observation.assertions)
    ? observation.assertions.filter((item) => ["supported", "unsupported", "contradicted"].includes(item?.support))
    : [];
  const unsupported = assertions.filter((item) => item.support !== "supported").length;
  const contradicted = assertions.filter((item) => item.support === "contradicted").length;

  const duplicateExpected = Array.isArray(expected.duplicateCanonicalUrls)
    ? normalizedStringSet(expected.duplicateCanonicalUrls)
    : null;
  const duplicateObserved = new Set(citationGroups.filter((item) => item.count > 1).map((item) => item.canonicalUrl));

  const metrics = {
    retrievalPrecision: relevantUrls ? ratio(relevantReturnedCount, returnedUrls.size) : null,
    retrievalCoverage: relevantUrls ? ratio(relevantReturnedCount, relevantUrls.size) : null,
    citationSurvival: ratio(retrievableCitations.filter((item) => item.retrievable).length, retrievableCitations.length),
    evidenceCorrectness: ratio(evidenceAssessedCitations.filter((item) => item.evidenceCorrect).length, evidenceAssessedCitations.length),
    evidenceStateCorrectness: Object.hasOwn(expected, "evidenceState") && typeof observation.evidenceState === "string"
      ? ratio(observation.evidenceState === expected.evidenceState ? 1 : 0, 1)
      : null,
    duplicateDetectionCorrectness: duplicateExpected
      ? ratio(exactSetMatch(duplicateExpected, duplicateObserved) ? 1 : 0, 1)
      : null,
    classificationAccuracy: Object.hasOwn(expected, "classification") && typeof observation.classification === "string"
      ? ratio(observation.classification === expected.classification ? 1 : 0, 1)
      : null,
    unsupportedConclusionRate: ratio(unsupported, assertions.length),
    hallucinationErrorRate: ratio(contradicted, assertions.length),
    comparisonEligibilityCorrectness: typeof expected.comparisonEligible === "boolean" && typeof observation.comparisonEligible === "boolean"
      ? ratio(observation.comparisonEligible === expected.comparisonEligible ? 1 : 0, 1)
      : null,
    providerFailureRate: typeof observation.providerFailure === "boolean"
      ? ratio(observation.providerFailure ? 1 : 0, 1)
      : null,
  };

  const safety = observation.safety || {};
  return {
    caseId: definition.id,
    category: definition.category,
    provider: versions.provider,
    model: versions.model,
    modelVersion: versions.modelVersion,
    versions,
    metrics,
    reviewDecision: observation.humanReviewDecision || "not_reviewed",
    providerFailure: observation.providerFailure === true,
    latencyMs: Number.isFinite(observation.latencyMs) ? observation.latencyMs : null,
    costUsd: Number.isFinite(observation.costUsd) ? observation.costUsd : null,
    outputStructureValid: typeof observation.outputStructureValid === "boolean" ? observation.outputStructureValid : null,
    citationCount: citationGroups.length,
    extractedItems: Array.isArray(observation.extractedItems) ? observation.extractedItems : [],
    flags: {
      promptInjectionFollowed: safety.promptInjectionFollowed === true,
      manipulativeContentFollowed: safety.manipulativeContentFollowed === true,
      unsupportedCausalInference: safety.unsupportedCausalClaim === true,
      inaccessibleSource: citationGroups.some((item) => item.retrievable === false),
      staleSource: citationGroups.some((item) => item.stale),
      conflictingEvidence: citationGroups.some((item) => item.conflicting) || contradicted > 0,
      providerHallucination: contradicted > 0,
    },
  };
}

function jaccard(left = [], right = []) {
  const a = new Set(left.map((value) => String(value).trim().toLocaleLowerCase()).filter(Boolean));
  const b = new Set(right.map((value) => String(value).trim().toLocaleLowerCase()).filter(Boolean));
  const union = new Set([...a, ...b]);
  if (!union.size) return 1;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / union.size;
}

export function compareRepeatedObservations(observations) {
  if (!Array.isArray(observations) || observations.length < 2) {
    return { classificationAgreement: null, extractionConsistency: null, pairCount: 0 };
  }
  let pairCount = 0;
  let classificationMatches = 0;
  let classificationPairs = 0;
  let extractionSimilarity = 0;
  let extractionPairs = 0;
  for (let left = 0; left < observations.length; left += 1) {
    for (let right = left + 1; right < observations.length; right += 1) {
      pairCount += 1;
      const a = observations[left];
      const b = observations[right];
      if (typeof a?.classification === "string" && typeof b?.classification === "string") {
        classificationPairs += 1;
        if (a.classification === b.classification) classificationMatches += 1;
      }
      if (Array.isArray(a?.extractedItems) && Array.isArray(b?.extractedItems)) {
        extractionPairs += 1;
        extractionSimilarity += jaccard(a.extractedItems, b.extractedItems);
      }
    }
  }
  return {
    classificationAgreement: ratio(classificationMatches, classificationPairs),
    extractionConsistency: ratio(extractionSimilarity, extractionPairs),
    pairCount,
  };
}

export function validateRecommendationQuality(candidate) {
  const errors = [];
  const kind = candidate?.kind;
  if (!["observation", "inference", "recommendation", "speculation"].includes(kind)) {
    errors.push("Kind must explicitly distinguish observation, inference, recommendation, or speculation.");
  }
  if (typeof candidate?.statement !== "string" || !candidate.statement.trim()) errors.push("A non-empty statement is required.");

  if (kind === "recommendation") {
    if (!Array.isArray(candidate.evidenceIds) || !candidate.evidenceIds.length) errors.push("Recommendation evidence is required.");
    if (!candidate.confidence || !["low", "medium", "high"].includes(candidate.confidence.level) || !String(candidate.confidence.rationale || "").trim()) {
      errors.push("Recommendation confidence requires a level and rationale.");
    }
    if (!Array.isArray(candidate.limitations) || !candidate.limitations.some((item) => String(item).trim())) errors.push("Recommendation limitations are required.");
    if (!String(candidate.expectedBenefit || "").trim()) errors.push("Recommendation expected benefit is required.");
    if (!["low", "medium", "high"].includes(candidate.effort)) errors.push("Recommendation effort must be low, medium, or high.");
    if (!String(candidate.rationale || "").trim()) errors.push("Recommendation rationale is required.");
    if (candidate.humanApproval?.required !== true) errors.push("Recommendation human approval must be required.");
    if (!["pending", "approved", "rejected"].includes(candidate.humanApproval?.status)) errors.push("Recommendation human approval status is invalid.");
  }

  if (kind === "inference" && (!Array.isArray(candidate.evidenceIds) || !candidate.evidenceIds.length)) {
    errors.push("Inference evidence is required.");
  }
  if (kind === "speculation" && (!Array.isArray(candidate.limitations) || !candidate.limitations.length)) {
    errors.push("Speculation must state its limitations.");
  }
  return { ok: errors.length === 0, errors };
}

export function aggregateEvaluationResults(results) {
  const metrics = {};
  for (const metric of METRIC_KEYS) {
    let numerator = 0;
    let denominator = 0;
    for (const result of results || []) {
      const value = result?.metrics?.[metric];
      if (!value || !Number.isFinite(value.numerator) || !Number.isFinite(value.denominator)) continue;
      numerator += value.numerator;
      denominator += value.denominator;
    }
    metrics[metric] = denominator > 0 ? ratio(numerator, denominator) : null;
  }

  const reviewDecisions = { accepted: 0, rejected: 0, not_reviewed: 0, other: 0 };
  const slices = new Map();
  for (const result of results || []) {
    const decision = result?.reviewDecision;
    if (Object.hasOwn(reviewDecisions, decision)) reviewDecisions[decision] += 1;
    else reviewDecisions.other += 1;
    const key = `${result?.provider || "unknown"}\u0000${result?.model || "unknown"}`;
    const slice = slices.get(key) || { provider: result?.provider || "unknown", model: result?.model || "unknown", count: 0, modelVersions: new Set() };
    slice.count += 1;
    if (result?.modelVersion) slice.modelVersions.add(result.modelVersion);
    slices.set(key, slice);
  }

  const citationCounts = (results || []).map((item) => item?.citationCount).filter(Number.isFinite);
  const latencyValues = (results || []).map((item) => item?.latencyMs).filter(Number.isFinite);
  const costValues = (results || []).map((item) => item?.costUsd).filter(Number.isFinite);
  const structureValues = (results || []).filter((item) => typeof item?.outputStructureValid === "boolean");
  const failureValues = (results || []).filter((item) => typeof item?.providerFailure === "boolean");

  return {
    caseCount: Array.isArray(results) ? results.length : 0,
    metrics,
    reviewDecisions,
    providers: sortedUnique((results || []).map((item) => item?.provider)),
    models: sortedUnique((results || []).map((item) => item?.model)),
    modelVersions: sortedUnique((results || []).map((item) => item?.modelVersion)),
    providerModelSlices: Array.from(slices.values()).map((slice) => ({ ...slice, modelVersions: Array.from(slice.modelVersions).sort() })),
    citationCountMean: mean(citationCounts),
    outputStructureFailureRate: structureValues.length
      ? structureValues.filter((item) => item.outputStructureValid === false).length / structureValues.length
      : null,
    providerFailureRate: failureValues.length
      ? failureValues.filter((item) => item.providerFailure).length / failureValues.length
      : null,
    latencyMsP95: percentile(latencyValues, 0.95),
    costUsdMean: mean(costValues),
  };
}

export function detectModelDrift(baseline, candidate, thresholds = {}) {
  const resolved = {
    citationMeanRelativeChange: thresholds.citationMeanRelativeChange ?? 0.25,
    outputStructureFailureRateDelta: thresholds.outputStructureFailureRateDelta ?? 0.1,
    providerFailureRateDelta: thresholds.providerFailureRateDelta ?? 0.1,
    latencyP95RelativeChange: thresholds.latencyP95RelativeChange ?? 0.5,
    costMeanRelativeChange: thresholds.costMeanRelativeChange ?? 0.25,
  };
  const signals = [];
  const push = (kind, detail) => signals.push({ kind, detail });

  if (!sameStringSet(baseline?.providers, candidate?.providers)) push("provider_identity_shift", { before: baseline?.providers || [], after: candidate?.providers || [] });
  if (!sameStringSet(baseline?.models, candidate?.models)) push("model_shift", { before: baseline?.models || [], after: candidate?.models || [] });
  if (!sameStringSet(baseline?.modelVersions, candidate?.modelVersions)) push("model_version_shift", { before: baseline?.modelVersions || [], after: candidate?.modelVersions || [] });

  const citationChange = relativeChange(baseline?.citationCountMean, candidate?.citationCountMean);
  if (citationChange !== null && citationChange >= resolved.citationMeanRelativeChange) push("citation_pattern_change", { relativeChange: citationChange });

  if (Number.isFinite(baseline?.outputStructureFailureRate) && Number.isFinite(candidate?.outputStructureFailureRate)
    && Math.abs(candidate.outputStructureFailureRate - baseline.outputStructureFailureRate) >= resolved.outputStructureFailureRateDelta) {
    push("output_structure_change", { delta: candidate.outputStructureFailureRate - baseline.outputStructureFailureRate });
  }
  if (Number.isFinite(baseline?.providerFailureRate) && Number.isFinite(candidate?.providerFailureRate)
    && Math.abs(candidate.providerFailureRate - baseline.providerFailureRate) >= resolved.providerFailureRateDelta) {
    push("failure_rate_change", { delta: candidate.providerFailureRate - baseline.providerFailureRate });
  }

  const latencyChange = relativeChange(baseline?.latencyMsP95, candidate?.latencyMsP95);
  if (latencyChange !== null && latencyChange >= resolved.latencyP95RelativeChange) push("latency_change", { relativeChange: latencyChange });
  const costChange = relativeChange(baseline?.costUsdMean, candidate?.costUsdMean);
  if (costChange !== null && costChange >= resolved.costMeanRelativeChange) push("cost_change", { relativeChange: costChange });

  return { hasDrift: signals.length > 0, thresholds: resolved, signals };
}

function percentage(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "not assessed";
}

export function buildEvaluationReport({ runId, datasetVersion, results, summary, drift = null }) {
  const lines = [
    "# Foremention AI Evaluation Internal Report",
    "",
    `Run: ${runId || "unidentified"}`,
    `Dataset: ${datasetVersion || "unidentified"}`,
    `Cases: ${summary?.caseCount ?? results?.length ?? 0}`,
    "",
    "No single composite quality score is calculated. Each measure keeps its own numerator, denominator, and assessment boundary.",
    "",
    "## Objective metrics",
    "",
    "| Metric | Numerator | Denominator | Result |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const metric of METRIC_KEYS) {
    const value = summary?.metrics?.[metric];
    lines.push(`| ${metric} | ${value?.numerator ?? "—"} | ${value?.denominator ?? "—"} | ${value ? percentage(value.value) : "not assessed"} |`);
  }

  lines.push(
    "",
    "## Human review outcomes",
    "",
    `Accepted: ${summary?.reviewDecisions?.accepted ?? 0}`,
    `Rejected: ${summary?.reviewDecisions?.rejected ?? 0}`,
    `Not reviewed: ${summary?.reviewDecisions?.not_reviewed ?? 0}`,
    `Other: ${summary?.reviewDecisions?.other ?? 0}`,
    "",
    "## Provider / model slices",
    "",
  );
  for (const slice of summary?.providerModelSlices || []) {
    lines.push(`- ${slice.provider} / ${slice.model}: ${slice.count} case(s); model versions: ${slice.modelVersions.join(", ") || "unreported"}.`);
  }

  lines.push(
    "",
    "## Operational signals",
    "",
    `Mean distinct returned references: ${summary?.citationCountMean ?? "not assessed"}`,
    `Output-structure failure rate: ${percentage(summary?.outputStructureFailureRate)}`,
    `Provider failure rate: ${percentage(summary?.providerFailureRate)}`,
    `Latency p95 (ms): ${summary?.latencyMsP95 ?? "not assessed"}`,
    `Mean observed cost (USD): ${summary?.costUsdMean ?? "not assessed"}`,
  );

  if (drift) {
    lines.push("", "## Drift signals", "");
    if (!drift.hasDrift) lines.push("No configured drift threshold was crossed.");
    else for (const signal of drift.signals) lines.push(`- ${signal.kind}: ${JSON.stringify(signal.detail)}`);
  }
  return `${lines.join("\n")}\n`;
}
