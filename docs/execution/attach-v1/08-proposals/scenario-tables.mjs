// Regenerates the scenario tables in economics-stress-tests.md.
// Run: node docs/execution/attach-v1/08-proposals/scenario-tables.mjs
// Every number printed is a PLANNING SCENARIO from the inputs below, not a receipt.
import { fourWeekPilotScenario } from "../../../../lib/commercial-proof-economics.mjs";
import { cohortScenario } from "../../../../lib/commercial-operations.mjs";

const usd = v => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const pct = v => v === null ? "n/a" : (v * 100).toFixed(1) + "%";
const hrs = v => v.toFixed(1);
const out = [];
const table = (head, rows) => {
  out.push("| " + head.join(" | ") + " |", "| " + head.map(() => "---:").join(" | ") + " |");
  for (const r of rows) out.push("| " + r.join(" | ") + " |");
  out.push("");
};

// Paddle standard fee 5% + $0.50 per checkout transaction (https://www.paddle.com/pricing, read 2026-10-13).
const PADDLE = { feeRate: 0.05, flatFeeUsd: 0.5 };

out.push("### A. Report hypothesis: $299 four-week single-client agency pilot (all clients new)", "");
const a = { priceUsd: 299, setupHours: 2, reviewHours: 3, supportHours: 1, hourlyCostUsd: 25, providerCostUsd: 12,
  fixedInfraUsd: 100, sellingHours: 2, acquisitionCashUsd: 20, ...PADDLE, refundReserveRate: 0.01,
  pilotCallLimit: 60, plannedCalls: 50 };
table(["Clients", "Contracted", "Fees", "Delivery contribution", "Margin", "Founder h", "After CAC + fixed"],
  [1, 5, 20].map(clients => {
    const r = fourWeekPilotScenario({ ...a, clients });
    return [clients, usd(r.contractedUsd), usd(r.processingUsd), usd(r.deliveryContributionUsd), pct(r.deliveryMargin),
      hrs(r.founderHours), usd(r.afterAcquisitionAndFixedUsd)];
  }));

out.push("### B. Live Paddle catalog: Signal $299/month and Core $99/month subscriptions (steady state, no new clients)", "",
  "Founder time and provider cost reuse Chat06 `capacity-model-1-5-20.md` steady-state assumptions (1.6 h/org/month; $1.48 expected / $3.29 worst-case provider spend per org-month). Chat06 marks both as ASSUMPTION/CODE estimates, not measurements.", "");
for (const [label, price] of [["Signal", 299], ["Core", 99]]) {
  for (const [case_, provider] of [["expected", 1.48], ["worst", 3.29]]) {
    const rows = [1, 5, 20].map(clients => {
      const r = cohortScenario({ periods: 1, newClientsPerPeriod: [clients], pilotPeriods: 0, priceUsd: price, churnRate: 0,
        ...PADDLE, providerCostUsd: provider, setupHours: 0, recurringHours: 1.6, sellingHoursPerNewClient: 0,
        acquisitionCashUsd: 0, hourlyCostUsd: 25, fixedCostUsd: 100, founderCapacityHours: 80 }).rows[0];
      return [clients, usd(r.collectedUsd), usd(r.feesUsd), usd(r.deliveryContributionUsd),
        pct(r.deliveryContributionUsd / r.collectedUsd), hrs(r.founderHours), usd(r.deliveryContributionUsd - 100)];
    });
    out.push(`**${label} $${price}/month, ${case_} provider cost**`, "");
    table(["Orgs", "Collected", "Fees", "Delivery contribution", "Margin", "Founder h", "After $100 fixed"], rows);
  }
}

out.push("### C. Stress: 12 four-week periods, $299, ramp to 20 clients, churn/collection/lag/capacity varied", "",
  "New clients per period: 1,1,1,2,2,3,3,3,4,0,0,0 (cumulative 20 acquired). Recurring 4 h/client (CV-13 ceiling), setup 2 h, selling 2 h + $20 per new client, $12 provider/client, $25/h, $100 fixed, founder delivery capacity 80 h/period (hypothesis: 20 h/week). First period of each client is a one-off pilot, not recurring.", "");
const ramp = [1, 1, 1, 2, 2, 3, 3, 3, 4, 0, 0, 0];
const base = { periods: 12, newClientsPerPeriod: ramp, priceUsd: 299, ...PADDLE, providerCostUsd: 12, setupHours: 2,
  recurringHours: 4, sellingHoursPerNewClient: 2, acquisitionCashUsd: 20, hourlyCostUsd: 25, fixedCostUsd: 100,
  founderCapacityHours: 80, pilotPeriods: 1 };
const cases = [
  ["Base: churn 5%, collect 100%, lag 0", { churnRate: 0.05 }],
  ["Churn 10%", { churnRate: 0.10 }],
  ["Churn 20%", { churnRate: 0.20 }],
  ["Churn 10%, collect 90%, refunds 3%", { churnRate: 0.10, collectionFraction: 0.9, refundRate: 0.03 }],
  ["Churn 10%, settlement lag 1 period", { churnRate: 0.10, settlementLagPeriods: 1 }],
  ["Churn 10%, recurring 6 h (over target)", { churnRate: 0.10, recurringHours: 6 }],
  ["Churn 10%, capacity 40 h", { churnRate: 0.10, founderCapacityHours: 40 }],
];
table(["Case", "Active end", "Recurring run-rate end", "Cum. net cash excl. founder labor", "Unsettled at end", "Peak founder h", "Capacity breach period", "Sum contribution after CAC+fixed"],
  cases.map(([name, over]) => {
    const r = cohortScenario({ ...base, ...over });
    const last = r.rows.at(-1);
    const peak = Math.max(...r.rows.map(x => x.founderHours));
    const sum = r.rows.reduce((t, x) => t + x.contributionAfterAcquisitionAndFixedUsd, 0);
    return [name, last.activeClients.toFixed(1), usd(last.recurringRevenueRunRateUsd), usd(last.cumulativeCashUsd),
      usd(r.cashUnsettledAtEndUsd), hrs(peak), r.capacityBreachPeriod ?? "none", usd(sum)];
  }));

out.push("### D. Stage-0 $3,000 / $6,000 assisted pilot: break-even founder hours (delivery hours are UNKNOWN)", "",
  "Hours at which delivery contribution reaches zero after Paddle fees and $50 provider cost; not an estimate of hours needed.", "");
table(["Price", "Net after fees", "Break-even h @ $25/h", "@ $50/h", "@ $100/h"],
  [3000, 6000].map(p => {
    const net = p - p * PADDLE.feeRate - PADDLE.flatFeeUsd - 50;
    return [usd(p), usd(net), hrs(net / 25), hrs(net / 50), hrs(net / 100)];
  }));

console.log(out.join("\n"));
