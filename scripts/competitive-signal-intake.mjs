#!/usr/bin/env node
/**
 * Offline, read-only public competitive signal intake.
 *
 * Accepts manually exported NDJSON from Agent Reach or any public research
 * method. Agent Reach is NOT executed here. No crawler, cookie, credentials,
 * auto-commit, publication, CRM or customer DB writes are present.
 * The entire output stays human-review-pending until source verification.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const HOSTS = Object.freeze({
  "Profound": ["www.tryprofound.com", "tryprofound.com", "product.tryprofound.com"],
  "Scrunch": ["scrunch.com", "www.scrunch.com"],
  "Peec AI": ["peec.ai", "www.peec.ai"],
  "Evertune": ["www.evertune.ai", "evertune.ai"],
  "OtterlyAI": ["otterly.ai", "www.otterly.ai"],
});
const OWN_KEYS = ["url", "title", "summary", "published_on", "observed_on", "competitor", "source_kind"];
const PII_OR_SECRET = /(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:api[_-]?key|access[_ -]?token|auth[_ -]?token|password|authorization|cookie|session)[\s:="']{1,8}[a-z0-9_-]{6,})/i;
const isoDate = value => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value + "T00:00:00.000Z"))
  && new Date(value + "T00:00:00.000Z").toISOString().slice(0,10) === value;
const smallText = (value, max) =>
  typeof value === "string" && value.trim().length > 4 && value.length <= max
  && !/[\u0000-\u001f\u007f]/.test(value) && !PII_OR_SECRET.test(value);

export function validatePublicSignal(input, asOf) {
  if (!isoDate(asOf)) throw Error("The specified evidence cutoff date is invalid.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Record must be an object.");
  if (Object.keys(input).some(k => !OWN_KEYS.includes(k))) throw Error("Unrecognized or sensitive input field.");
  for (const key of OWN_KEYS) if (!(key in input)) throw Error("A required signal field is missing.");
  if (!HOSTS[input.competitor]) throw Error("Competitor outside the explicit public registry.");
  if (input.source_kind !== "OFFICIAL_COMPANY_ANNOUNCEMENT" &&
      input.source_kind !== "VENDOR_PUBLISHED_RESEARCH") {
    throw Error("Only dated public official source descriptions are allowed in this intake.");
  }
  if (input.source_kind === "VENDOR_PUBLISHED_RESEARCH" && input.competitor !== "OtterlyAI") {
    // Allow new study sources only after a code-review change to the source policy.
    throw Error("An unreviewed vendor research source requires explicit registry review.");
  }
  if (!smallText(input.title, 150) || !smallText(input.summary, 230)) {
    throw Error("Title/summary missing, oversized, contains controls or potential personal/secret content.");
  }
  if (!isoDate(input.published_on) || !isoDate(input.observed_on) ||
      input.published_on > input.observed_on || input.observed_on > asOf) {
    throw Error("Publication and observation dates must be real, ordered and not in the future.");
  }
  if (typeof input.url !== "string" || input.url.length > 500 ||
      /[\s\u0000-\u001f]/.test(input.url)) throw Error("Invalid public source URL.");
  let u;
  try { u = new URL(input.url); } catch { throw Error("Unparseable public source URL."); }
  if (u.protocol !== "https:" || u.username || u.password || u.port || u.search || u.hash ||
      !HOSTS[input.competitor].includes(u.hostname) || u.pathname === "/") {
    throw Error("Source URL must be a clean official HTTPS page, never a proxy or credentialed URL.");
  }
  const source_url = u.toString();
  const id = createHash("sha256")
    .update([input.competitor, source_url, input.published_on].join("|")).digest("hex").slice(0,20);
  return {
    id,
    competitor: input.competitor,
    published_on: input.published_on,
    observed_on: input.observed_on,
    title: input.title.trim(),
    summary: input.summary.trim(),
    source_url,
    evidence_class: input.source_kind === "VENDOR_PUBLISHED_RESEARCH"
      ? "VENDOR_PUBLISHED_STUDY" : "PUBLIC_COMPANY_CLAIM",
    review_status: "NEEDS_HUMAN_SOURCE_VERIFICATION",
    qualification: "Publisher statement only; never customer evidence or independently proven adoption.",
  };
}

export function parsePublicSignals(ndjson, asOf, maxRecords = 100) {
  if (Buffer.byteLength(ndjson, "utf8") > 500_000) throw Error("Input exceeds the 500 KB safety bound.");
  const lines = ndjson.split(/\r?\n/).filter(x=>x.trim());
  if (lines.length < 1 || lines.length > maxRecords) throw Error("Invalid bounded signal count.");
  const seen = new Set();
  return lines.map((line, index) => {
    if (Buffer.byteLength(line, "utf8") > 3_000) throw Error("Public signal line exceeds size bound.");
    let obj;
    try { obj=JSON.parse(line); } catch { throw Error("Invalid JSON on line " + (index+1)); }
    const clean = validatePublicSignal(obj, asOf);
    if (seen.has(clean.id)) throw Error("Duplicate public source/date candidate at line " + (index+1));
    seen.add(clean.id);
    return clean;
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== "--input" ||
      (args.length !== 2 && (args.length !== 4 || args[2] !== "--as-of"))) {
    throw Error("Usage: node scripts/competitive-signal-intake.mjs --input public.ndjson [--as-of YYYY-MM-DD]");
  }
  const asOf=args.length===4?args[3]:new Date().toISOString().slice(0,10);
  const raw=await readFile(args[1], {encoding:"utf8",flag:"r"});
  const records=parsePublicSignals(raw,asOf);
  // STDOUT only. The caller must manually review and decide what to preserve.
  process.stdout.write(JSON.stringify({
    schema_version:"foremention.public-signal-review-queue.v1",
    generated_on:asOf,
    data_use:"Operator-only research candidate; no automatic publication, outreach or product ingestion.",
    source_tool_claim:"Caller-supplied NDJSON; this script does not attest that Agent Reach ran.",
    records,
  },null,2)+"\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Do not echo untrusted supplied content, paths, URLs or secrets into logs.
    process.stderr.write("Public competitive intake rejected input. Inspect local schema and source permissions.\n");
    process.exitCode=1;
  });
}
