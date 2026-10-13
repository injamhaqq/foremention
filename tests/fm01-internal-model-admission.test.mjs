// A29 / CV-07 (Chat01): onboarding enrichment and every internal provider
// attempt pass the shared fail-closed free-only + durable admission policy.
// Offline only: fetch is replaced and fails the test if touched.
import assert from "node:assert/strict";
import test from "node:test";
import { admitInternalModelCall, internalModelDailyCap, INTERNAL_MODEL_DAILY_CAP_CEILING } from "../lib/internal-model-admission.ts";
import { setEvidenceCapacityStore } from "../lib/evidence-capacity.ts";
import { enrichOnboardingDraft } from "../lib/onboarding-enrichment.ts";

const KEYS = ["FOREMENTION_FREE_ONLY_MODE", "FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP", "GROQ_API_KEY", "GROQ_MODEL"];

async function withEnv(values, action) {
  const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, values);
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("network must not be called"); };
  try {
    return await action(() => fetchCalls);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    setEvidenceCapacityStore(null, false);
  }
}

function memoryStore() {
  const counters = new Map();
  return {
    counters,
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async run() { return {}; },
        async first() {
          if (/INSERT INTO evidence_capacity_counters/.test(sql)) {
            const [key, cap] = args;
            const used = counters.get(key) || 0;
            if (used >= cap) return null;
            counters.set(key, used + 1);
            return { used: used + 1 };
          }
          return null;
        },
      };
    },
  };
}

const draft = { companyName: "Acme", websiteUrl: "https://acme.example", category: "", categoryDescription: "", market: "Global", audience: "", competitors: [], questions: [] };
const input = { draft, websiteUrl: "https://acme.example", pageTitle: "Acme", pageDescription: "CRM", pageText: "Acme CRM for B2B sales teams" };

function spyAdapter(answer = '{"companyName":"Acme","category":"CRM software"}') {
  const calls = [];
  return {
    calls,
    configured: () => true,
    async run(prompt, options) {
      calls.push({ prompt, options });
      return { provider: "groq", model: "groq-pinned-test", promptId: prompt.promptId, answer, citations: [], raw: {}, collectedAt: "2026-10-12T00:00:00.000Z", latencyMs: 1, usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }, requestId: "req_fixture" };
    },
  };
}

test("A29 acceptance: free-only mode + Groq key/model configured => zero Groq calls, editable draft kept", async () => {
  await withEnv({ GROQ_API_KEY: "test-key", GROQ_MODEL: "groq-pinned-test", FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "10" }, async (fetchCalls) => {
    setEvidenceCapacityStore(memoryStore(), true);
    const adapter = spyAdapter();
    const result = await enrichOnboardingDraft(input, { adapter });
    assert.equal(result.enriched, false);
    assert.equal(result.admission.reason, "FREE_ONLY_MODE");
    assert.deepEqual(result.draft, draft);
    assert.equal(adapter.calls.length, 0);
    // Default path (no injected adapter) must not load or call Groq either.
    const defaultPath = await enrichOnboardingDraft(input);
    assert.equal(defaultPath.admission.reason, "FREE_ONLY_MODE");
    assert.equal(fetchCalls(), 0);
  });
});

test("CV-07: outside free-only mode, no operator cap means disabled (no call)", async () => {
  await withEnv({ FOREMENTION_FREE_ONLY_MODE: "0", GROQ_API_KEY: "k", GROQ_MODEL: "m" }, async (fetchCalls) => {
    setEvidenceCapacityStore(memoryStore(), true);
    const adapter = spyAdapter();
    const result = await enrichOnboardingDraft(input, { adapter });
    assert.equal(result.admission.reason, "NOT_ENABLED");
    assert.equal(adapter.calls.length, 0);
    assert.equal(fetchCalls(), 0);
  });
});

test("CV-07: missing durable store is CAPACITY_UNVERIFIED, never admitted uncapped", async () => {
  await withEnv({ FOREMENTION_FREE_ONLY_MODE: "0", FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "3" }, async () => {
    setEvidenceCapacityStore(null, false);
    const adapter = spyAdapter();
    const result = await enrichOnboardingDraft(input, { adapter });
    assert.equal(result.admission.reason, "CAPACITY_UNVERIFIED");
    assert.equal(adapter.calls.length, 0);
  });
});

test("CV-07: unconfigured provider is denied before admission spends a unit", async () => {
  await withEnv({ FOREMENTION_FREE_ONLY_MODE: "0", FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "3" }, async () => {
    const store = memoryStore();
    setEvidenceCapacityStore(store, true);
    const adapter = { ...spyAdapter(), configured: () => false };
    const result = await enrichOnboardingDraft(input, { adapter });
    assert.equal(result.admission.reason, "PROVIDER_NOT_CONFIGURED");
    assert.equal(store.counters.size, 0);
  });
});

test("CV-07: each attempt consumes one durable unit; exhausted cap stops before the network", async () => {
  await withEnv({ FOREMENTION_FREE_ONLY_MODE: "0", FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "2" }, async () => {
    const store = memoryStore();
    setEvidenceCapacityStore(store, true);
    const adapter = spyAdapter();
    const first = await enrichOnboardingDraft(input, { adapter });
    assert.equal(first.enriched, true);
    assert.equal(first.receipt.model, "groq-pinned-test");
    assert.equal(first.receipt.requestId, "req_fixture");
    assert.deepEqual(first.receipt.usage, { inputTokens: 10, outputTokens: 5, totalTokens: 15 });
    assert.match(first.receipt.admissionPeriodKey, /^internal:onboarding-enrichment:groq:day:\d{4}-\d{2}-\d{2}$/);
    assert.equal(adapter.calls[0].options.budget.runLimitUsd <= 0.10, true);
    await enrichOnboardingDraft(input, { adapter });
    const third = await enrichOnboardingDraft(input, { adapter });
    assert.equal(third.admission.reason, "CAPACITY_EXHAUSTED");
    assert.equal(adapter.calls.length, 2, "the third attempt never reached the provider");
  });
});

test("CV-07: provider failure is not retried and not substituted", async () => {
  await withEnv({ FOREMENTION_FREE_ONLY_MODE: "0", FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "5" }, async () => {
    const store = memoryStore();
    setEvidenceCapacityStore(store, true);
    let calls = 0;
    const adapter = { configured: () => true, async run() { calls++; throw new Error("upstream 503"); } };
    const result = await enrichOnboardingDraft(input, { adapter });
    assert.equal(result.enriched, false);
    assert.equal(result.admission.reason, "PROVIDER_FAILED");
    assert.equal(calls, 1);
    assert.equal([...store.counters.values()][0], 1);
  });
});

test("CV-07: unparseable answer keeps the receipt but not the enrichment", async () => {
  await withEnv({ FOREMENTION_FREE_ONLY_MODE: "0", FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "5" }, async () => {
    setEvidenceCapacityStore(memoryStore(), true);
    const result = await enrichOnboardingDraft(input, { adapter: spyAdapter("no json here") });
    assert.equal(result.enriched, false);
    assert.equal(result.admission.reason, "UNPARSEABLE");
    assert.equal(result.receipt.requestId, "req_fixture");
    assert.deepEqual(result.draft, draft);
  });
});

test("daily cap parsing is bounded and fails closed", () => {
  assert.equal(internalModelDailyCap("onboarding-enrichment", {}), 0);
  assert.equal(internalModelDailyCap("onboarding-enrichment", { FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "-1" }), 0);
  assert.equal(internalModelDailyCap("onboarding-enrichment", { FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "abc" }), 0);
  assert.equal(internalModelDailyCap("onboarding-enrichment", { FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "999999" }), INTERNAL_MODEL_DAILY_CAP_CEILING);
});

test("Cloudflare stays the only free-only internal provider; admission still needs cap + store", async () => {
  await withEnv({ FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP: "1" }, async () => {
    setEvidenceCapacityStore(memoryStore(), true);
    const cf = await admitInternalModelCall({ provider: "cloudflare", purpose: "onboarding-enrichment", configured: true });
    assert.equal(cf.admitted, true);
    const again = await admitInternalModelCall({ provider: "cloudflare", purpose: "onboarding-enrichment", configured: true });
    assert.equal(again.admitted, false);
    const groq = await admitInternalModelCall({ provider: "groq", purpose: "onboarding-enrichment", configured: true });
    assert.equal(groq.reason, "FREE_ONLY_MODE");
  });
});
