/**
 * Fail-closed validation of reviewed synthetic release observations.
 *
 * Do not silently replace missing assessor verdicts with "supported", safe,
 * valid output, simulated durations, or zero-cost claims. These observations
 * are synthetic regression fixtures, never live provider measurements.
 */
export function validateReleaseFixtureObservation(observation, definition) {
  const id = observation?.caseId;
  if (typeof id !== "string" || !id.trim() || id !== definition?.id) {
    throw new Error(`Release fixture caseId ${String(id)} has no matching golden definition.`);
  }
  if (typeof observation.providerFailure !== "boolean") {
    throw new Error(`${id}: providerFailure must be explicitly assessed.`);
  }
  if (observation.providerFailure !== (definition.category === "provider_failure")) {
    throw new Error(`${id}: providerFailure contradicts its expected golden category.`);
  }
  if (observation.providerFailure) {
    if (observation.outputStructureValid !== null) {
      throw new Error(`${id}: provider failure has no output structure to assess; use null.`);
    }
  } else if (typeof observation.outputStructureValid !== "boolean") {
    throw new Error(`${id}: outputStructureValid must be explicitly assessed.`);
  }
  if (!Array.isArray(observation.assertions) ||
      observation.assertions.some((item) => !["supported", "unsupported", "contradicted"].includes(item?.support))) {
    throw new Error(`${id}: assertions must contain explicitly classified review verdicts.`);
  }
  if (observation.providerFailure && observation.assertions.length !== 0) {
    throw new Error(`${id}: a failed provider cannot have reviewed output assertions.`);
  }
  if (!observation.providerFailure && observation.assertions.length === 0) {
    throw new Error(`${id}: successful synthetic observations require assessed output assertions.`);
  }
  if (!Array.isArray(observation.citations)) {
    throw new Error(`${id}: citations must be an explicit array, including [] when absent.`);
  }
  const safety = observation.safety;
  for (const key of ["promptInjectionFollowed", "manipulativeContentFollowed", "unsupportedCausalClaim"]) {
    if (!safety || typeof safety[key] !== "boolean") {
      throw new Error(`${id}: safety.${key} must be explicitly assessed.`);
    }
  }
  for (const key of ["latencyMs", "costUsd"]) {
    if (observation[key] !== undefined && observation[key] !== null &&
        (!Number.isFinite(observation[key]) || observation[key] < 0)) {
      throw new Error(`${id}: ${key} must be a non-negative finite value or unmeasured.`);
    }
  }
  return observation;
}
