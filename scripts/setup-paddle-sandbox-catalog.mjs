/**
 * Creates/reuses two Foremention test catalog products in Paddle SANDBOX only.
 * Refuses Live credentials, never sends secrets to stdout, and never creates
 * transactions, customers, subscriptions, webhooks or production resources.
 *
 * Usage (Codespaces, after securely configuring PADDLE_API_KEY):
 *   node scripts/setup-paddle-sandbox-catalog.mjs --apply
 */
import { writeFileSync } from "node:fs";

const API = "https://sandbox-api.paddle.com";
const KEY_PATTERN = /^pdl_sdbx_apikey_[a-z0-9]{26}_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{3}$/;
const PRODUCT_ID = /^pro_[a-z0-9]{26}$/;
const PRICE_ID = /^pri_[a-z0-9]{26}$/;
const plans = [
  {
    packageKey: "core",
    name: "Foremention Core",
    description: "Recommendation intelligence for one B2B SaaS brand, with up to 25 approved buyer questions and monthly measurement.",
    price: "9900",
    envName: "PADDLE_CORE_MONTHLY_PRICE_ID",
  },
  {
    packageKey: "signal",
    name: "Foremention Signal",
    description: "Recommendation intelligence for up to three B2B SaaS brand workspaces, 100 approved buyer questions and weekly measurement.",
    price: "24900",
    envName: "PADDLE_SIGNAL_MONTHLY_PRICE_ID",
  },
];

function requireSandboxKey() {
  const primary = process.env.PADDLE_SANDBOX_API_KEY?.trim();
  const codespaces = process.env.PADDLE_API_KEY?.trim();
  if (primary && codespaces && primary !== codespaces) {
    throw new Error("Two different Paddle keys were provided; refuse ambiguous credentials.");
  }
  const key = primary || codespaces || "";
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Expected a modern Paddle SANDBOX API key (pdl_sdbx_apikey_...). Live and legacy keys are refused. Set a Codespaces secret named PADDLE_API_KEY, then restart the Codespace.");
  }
  return key;
}

async function request(key, method, path, body) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid Paddle path.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(API + path, {
      method,
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Paddle Sandbox returned HTTP " + response.status + " for " + method + " " + path.split("?")[0] + ". Check sandbox key permissions and existing catalog.");
    }
    const payload = await response.json();
    if (!payload || !("data" in payload)) throw new Error("Unexpected Paddle Sandbox API response.");
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function listAll(key, resource) {
  const all = [];
  for (const status of ["active", "archived"]) {
    let after = null;
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ per_page: "200", status });
      if (after) params.set("after", after);
      const result = await request(key, "GET", "/" + resource + "?" + params);
      if (!Array.isArray(result.data)) throw new Error("Invalid paginated " + resource + " response.");
      all.push(...result.data);
      if (!result.meta?.pagination?.has_more) break;
      const lastId = result.data.at(-1)?.id;
      if (!lastId || lastId === after) throw new Error("Unsafe " + resource + " pagination state.");
      after = lastId;
      if (page === 99) throw new Error("Too many " + resource + " pages; refusing partial audit.");
    }
  }
  return all;
}

async function ensureProduct(key, plan, products) {
  const matching = products.filter((p) => p.name === plan.name);
  if (matching.length > 1) throw new Error("Duplicate product names in Sandbox: " + plan.name + ". Reconcile manually.");
  if (matching.length === 1) {
    const existing = matching[0];
    if (!PRODUCT_ID.test(existing.id) || existing.status !== "active" || existing.tax_category !== "saas" || existing.type !== "standard") {
      throw new Error("Existing " + plan.name + " has incompatible product attributes. No changes made.");
    }
    console.log("Reusing sandbox product: " + plan.name + " (" + existing.id + ")");
    return existing;
  }
  const created = (await request(key, "POST", "/products", {
    name: plan.name,
    type: "standard",
    description: plan.description,
    tax_category: "saas",
    custom_data: { project: "foremention", environment: "sandbox", package_key: plan.packageKey },
  })).data;
  if (!PRODUCT_ID.test(created?.id)) throw new Error("Product creation returned invalid ID; verify Sandbox before retrying.");
  console.log("Created sandbox product: " + plan.name + " (" + created.id + ")");
  return created;
}

async function ensurePrice(key, plan, product, prices) {
  const monthly = prices.filter((p) =>
    p.product_id === product.id &&
    p.billing_cycle?.interval === "month" &&
    p.billing_cycle?.frequency === 1 &&
    p.type === "standard"
  );
  if (monthly.length > 1) throw new Error("Multiple monthly prices for " + plan.name + ". Reconcile manually.");
  if (monthly.length === 1) {
    const existing = monthly[0];
    const valid = existing.status === "active" &&
      PRICE_ID.test(existing.id) &&
      existing.unit_price?.amount === plan.price &&
      existing.unit_price?.currency_code === "USD" &&
      existing.trial_period === null &&
      existing.quantity?.minimum === 1 &&
      existing.quantity?.maximum === 1;
    if (!valid) throw new Error("Conflicting monthly price for " + plan.name + ". No price was modified.");
    console.log("Reusing sandbox monthly price: " + existing.id);
    return existing;
  }
  const created = (await request(key, "POST", "/prices", {
    product_id: product.id,
    description: "Foremention " + plan.packageKey + " monthly sandbox plan",
    name: "Monthly",
    type: "standard",
    billing_cycle: { interval: "month", frequency: 1 },
    unit_price: { amount: plan.price, currency_code: "USD" },
    tax_mode: "account_setting",
    quantity: { minimum: 1, maximum: 1 },
    custom_data: { project: "foremention", environment: "sandbox", package_key: plan.packageKey },
  })).data;
  if (!PRICE_ID.test(created?.id)) throw new Error("Price creation returned invalid ID; verify Sandbox before retrying.");
  console.log("Created sandbox monthly price: " + created.id);
  return created;
}

async function main() {
  if (process.argv.slice(2).join(" ") !== "--apply") {
    console.log("No changes made. To create/reuse the SANDBOX test catalog, run:");
    console.log("node scripts/setup-paddle-sandbox-catalog.mjs --apply");
    return;
  }
  const key = requireSandboxKey();
  console.log("Paddle SANDBOX only. Auditing existing products and prices...");
  const products = await listAll(key, "products");
  const prices = await listAll(key, "prices");
  // Inspect all existing same-name products before creating anything.
  for (const plan of plans) {
    const same = products.filter((p) => p.name === plan.name);
    if (same.length > 1 || same.some((p) =>
      !PRODUCT_ID.test(p.id) || p.status !== "active" || p.tax_category !== "saas" || p.type !== "standard"
    )) throw new Error("Conflicting Sandbox product: " + plan.name + ". Resolve in dashboard first.");
    if (same.length === 1) {
      const monthly = prices.filter((p) => p.product_id === same[0].id &&
        p.billing_cycle?.interval === "month" &&
        p.billing_cycle?.frequency === 1 && p.type === "standard");
      if (monthly.length > 1 || monthly.some((p) =>
        p.status !== "active" || p.unit_price?.amount !== plan.price ||
        p.unit_price?.currency_code !== "USD" || p.trial_period !== null ||
        p.quantity?.minimum !== 1 || p.quantity?.maximum !== 1
      )) throw new Error("Conflicting Sandbox monthly price: " + plan.name + ". Resolve in dashboard first.");
    }
  }
  const results = [];
  for (const plan of plans) {
    const product = await ensureProduct(key, plan, products);
    const price = await ensurePrice(key, plan, product, prices);
    results.push({ plan: plan.packageKey, product_id: product.id, price_id: price.id, usd_monthly: Number(plan.price) / 100, envName: plan.envName });
  }
  const file = ".env.paddle-sandbox.catalog.local";
  writeFileSync(file, results.map((r) => r.envName + "=" + r.price_id).join("\n") + "\n", { mode: 0o600 });
  console.log("\nVerified Paddle SANDBOX catalog:");
  console.log(JSON.stringify(results.map(({ envName, ...safe }) => safe), null, 2));
  console.log("\nSaved price IDs (NO secrets) in ignored local file " + file);
  console.log("No real payments, live catalog changes, or customer records were created.");
}

main().catch((error) => {
  console.error("Sandbox catalog setup stopped: " + (error instanceof Error ? error.message : "Unknown error."));
  console.error("If a POST timed out, inspect the Sandbox dashboard before rerunning; the resource may have been created.");
  process.exitCode = 1;
});
