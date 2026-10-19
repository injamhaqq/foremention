// pnpm eval:evidence [-- --json <summary.json>] [--report <report.md>]
// Offline evidence-trust evaluation: labelling, saved snippets, claim support,
// abstention guard and prompt-injection hardening. Never touches the network.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { partitionOfficialSourceReview } from "../lib/official-source-relevance.mjs";
import { formatEvidenceTrustReport, loadEvidenceTrustDataset, runEvidenceTrustEvaluation } from "./evidence-trust-eval-harness.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const input = argumentValue("--input");
const dataset = await loadEvidenceTrustDataset(input ? resolve(input) : undefined);
const summary = await runEvidenceTrustEvaluation(dataset, { partitionOfficialSourceReview });
const report = formatEvidenceTrustReport(summary);
const jsonPath = argumentValue("--json");
const reportPath = argumentValue("--report");
if (jsonPath) await writeFile(resolve(jsonPath), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (reportPath) await writeFile(resolve(reportPath), report, "utf8");
process.stdout.write(report);
if (summary.failed > 0) process.exitCode = 1;
