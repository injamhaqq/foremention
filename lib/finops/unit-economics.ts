export type UnitEconomicsCostBasis = {
  /** Provider spend is inclusive of any recorded retry spend. */
  providerUsd: number | null;
  storageUsd: number | null;
  databaseUsd: number | null;
  edgeUsd: number | null;
  backgroundProcessingUsd: number | null;
  otherCogsUsd: number | null;
};

export type UnitEconomicsCounts = {
  runs: number | null;
  questions: number | null;
  records: number | null;
  workspaces: number | null;
  accounts: number | null;
};

export type UnitEconomicsInput = {
  costs: UnitEconomicsCostBasis;
  counts: UnitEconomicsCounts;
  /**
   * Retry provider cost is a diagnostic subset of providerUsd. It is never
   * added to COGS a second time.
   */
  retryProviderUsd?: number | null;
  /** Revenue must be supplied from a verified commercial source. */
  revenueUsd?: number | null;
};

const COST_KEYS: Array<keyof UnitEconomicsCostBasis> = [
  "providerUsd",
  "storageUsd",
  "databaseUsd",
  "edgeUsd",
  "backgroundProcessingUsd",
  "otherCogsUsd",
];

function assertMoney(label: string, value: number | null | undefined) {
  if (value === null || value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number or null.`);
  }
}

function assertCount(label: string, value: number | null | undefined) {
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer or null.`);
  }
}

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function perUnit(cost: number | null, count: number | null) {
  if (cost === null || count === null || count <= 0) return null;
  return round(cost / count);
}

export function buildUnitEconomicsSnapshot(input: UnitEconomicsInput) {
  for (const key of COST_KEYS) assertMoney(key, input.costs[key]);
  assertMoney("retryProviderUsd", input.retryProviderUsd);
  assertMoney("revenueUsd", input.revenueUsd);
  for (const [key, value] of Object.entries(input.counts)) assertCount(key, value);

  const retryProviderUsd = input.retryProviderUsd ?? null;
  if (
    retryProviderUsd !== null
    && input.costs.providerUsd !== null
    && retryProviderUsd > input.costs.providerUsd
  ) {
    throw new Error("retryProviderUsd cannot exceed providerUsd because retries are a subset of provider spend.");
  }

  const missingCostInputs = COST_KEYS.filter((key) => input.costs[key] === null);
  const knownCogsUsd = round(COST_KEYS.reduce(
    (total, key) => total + (input.costs[key] ?? 0),
    0,
  ));
  const completeCogsUsd = missingCostInputs.length === 0 ? knownCogsUsd : null;
  const revenueUsd = input.revenueUsd ?? null;
  const grossProfitUsd = revenueUsd !== null && completeCogsUsd !== null
    ? round(revenueUsd - completeCogsUsd)
    : null;
  const grossMarginPct = revenueUsd !== null && revenueUsd > 0 && grossProfitUsd !== null
    ? round((grossProfitUsd / revenueUsd) * 100)
    : null;
  const providerUsd = input.costs.providerUsd;

  return {
    knownCogsUsd,
    completeCogsUsd,
    missingCostInputs,
    revenueUsd,
    grossProfitUsd,
    grossMarginPct,
    retryProviderUsd,
    retryShareOfProviderCostPct:
      retryProviderUsd !== null && providerUsd !== null && providerUsd > 0
        ? round((retryProviderUsd / providerUsd) * 100)
        : null,
    providerUnitCost: {
      perRunUsd: perUnit(providerUsd, input.counts.runs),
      perQuestionUsd: perUnit(providerUsd, input.counts.questions),
      perRecordUsd: perUnit(providerUsd, input.counts.records),
      perWorkspaceUsd: perUnit(providerUsd, input.counts.workspaces),
      perAccountUsd: perUnit(providerUsd, input.counts.accounts),
    },
    fullyAllocatedUnitCost: {
      perRunUsd: perUnit(completeCogsUsd, input.counts.runs),
      perQuestionUsd: perUnit(completeCogsUsd, input.counts.questions),
      perRecordUsd: perUnit(completeCogsUsd, input.counts.records),
      perWorkspaceUsd: perUnit(completeCogsUsd, input.counts.workspaces),
      perAccountUsd: perUnit(completeCogsUsd, input.counts.accounts),
    },
  };
}
