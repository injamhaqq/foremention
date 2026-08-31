import assert from "node:assert/strict";
import test from "node:test";

const { buildUnitEconomicsSnapshot } = await import("../lib/finops/unit-economics.ts");

const counts = {
  runs: 2,
  questions: 10,
  records: 2,
  workspaces: 1,
  accounts: 1,
};

test("gross margin remains unknown until revenue and the complete COGS basis are supplied", () => {
  const snapshot = buildUnitEconomicsSnapshot({
    costs: {
      providerUsd: 0.50,
      storageUsd: null,
      databaseUsd: null,
      edgeUsd: null,
      backgroundProcessingUsd: null,
      otherCogsUsd: null,
    },
    counts,
    revenueUsd: 100,
  });

  assert.equal(snapshot.knownCogsUsd, 0.50);
  assert.equal(snapshot.completeCogsUsd, null);
  assert.equal(snapshot.grossProfitUsd, null);
  assert.equal(snapshot.grossMarginPct, null);
  assert.deepEqual(snapshot.missingCostInputs, [
    "storageUsd",
    "databaseUsd",
    "edgeUsd",
    "backgroundProcessingUsd",
    "otherCogsUsd",
  ]);
  assert.equal(snapshot.providerUnitCost.perRunUsd, 0.25);
  assert.equal(snapshot.fullyAllocatedUnitCost.perRunUsd, null);
});

test("complete verified inputs produce allocated unit economics without invented values", () => {
  const snapshot = buildUnitEconomicsSnapshot({
    costs: {
      providerUsd: 2,
      storageUsd: 1,
      databaseUsd: 2,
      edgeUsd: 1,
      backgroundProcessingUsd: 3,
      otherCogsUsd: 1,
    },
    counts,
    retryProviderUsd: 0.50,
    revenueUsd: 20,
  });

  assert.equal(snapshot.completeCogsUsd, 10);
  assert.equal(snapshot.grossProfitUsd, 10);
  assert.equal(snapshot.grossMarginPct, 50);
  assert.equal(snapshot.retryShareOfProviderCostPct, 25);
  assert.equal(snapshot.fullyAllocatedUnitCost.perRunUsd, 5);
  assert.equal(snapshot.fullyAllocatedUnitCost.perQuestionUsd, 1);
});

test("retry spend is a provider-cost subset and is never double counted", () => {
  const snapshot = buildUnitEconomicsSnapshot({
    costs: {
      providerUsd: 1,
      storageUsd: 0,
      databaseUsd: 0,
      edgeUsd: 0,
      backgroundProcessingUsd: 0,
      otherCogsUsd: 0,
    },
    counts,
    retryProviderUsd: 0.25,
  });

  assert.equal(snapshot.completeCogsUsd, 1);
  assert.equal(snapshot.retryProviderUsd, 0.25);
  assert.equal(snapshot.retryShareOfProviderCostPct, 25);
});

test("invalid negative costs and impossible retry totals fail closed", () => {
  assert.throws(() => buildUnitEconomicsSnapshot({
    costs: {
      providerUsd: -1,
      storageUsd: 0,
      databaseUsd: 0,
      edgeUsd: 0,
      backgroundProcessingUsd: 0,
      otherCogsUsd: 0,
    },
    counts,
  }), /finite non-negative/);

  assert.throws(() => buildUnitEconomicsSnapshot({
    costs: {
      providerUsd: 0.10,
      storageUsd: 0,
      databaseUsd: 0,
      edgeUsd: 0,
      backgroundProcessingUsd: 0,
      otherCogsUsd: 0,
    },
    counts,
    retryProviderUsd: 0.11,
  }), /cannot exceed providerUsd/);
});

test("unit costs remain unknown when the denominator is unavailable", () => {
  const snapshot = buildUnitEconomicsSnapshot({
    costs: {
      providerUsd: 1,
      storageUsd: 0,
      databaseUsd: 0,
      edgeUsd: 0,
      backgroundProcessingUsd: 0,
      otherCogsUsd: 0,
    },
    counts: { ...counts, records: null, accounts: 0 },
  });

  assert.equal(snapshot.fullyAllocatedUnitCost.perRecordUsd, null);
  assert.equal(snapshot.fullyAllocatedUnitCost.perAccountUsd, null);
});
