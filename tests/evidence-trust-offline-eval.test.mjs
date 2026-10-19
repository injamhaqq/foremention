// Evidence trust (fix track "evidence"): offline eval suite + prompt-injection
// fixtures. Runs the real grounded Cloudflare path with fake fetch/model; any
// non-fixture network host fails the case.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { partitionOfficialSourceReview } from "../lib/official-source-relevance.mjs";
import { loadEvidenceTrustDataset, runEvidenceTrustEvaluation } from "../scripts/evidence-trust-eval-harness.mjs";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);

const dataset = await loadEvidenceTrustDataset();
const summary = await runEvidenceTrustEvaluation(dataset, { partitionOfficialSourceReview });
const byId = new Map(summary.results.map((result) => [result.id, result]));

test("offline evidence-trust dataset covers every category with synthetic data only", () => {
  const categories = new Set(dataset.cases.map((item) => item.category));
  for (const category of ["labelling", "claim_support", "abstention", "prompt_injection"]) assert.ok(categories.has(category), category);
  assert.ok(dataset.cases.filter((item) => item.category === "prompt_injection").length >= 4, "at least four injection fixtures");
  for (const item of dataset.cases) {
    for (const result of item.search.web.results) assert.match(new URL(result.url).hostname, /\.example$/, "fixtures use reserved example domains only");
  }
});

for (const item of dataset.cases) {
  test(`offline eval case ${item.id} (${item.category}) passes`, () => {
    const result = byId.get(item.id);
    assert.ok(result, `missing result for ${item.id}`);
    assert.deepEqual(result.failures, []);
    assert.equal(result.passed, true);
  });
}

test("pnpm eval:evidence runs offline, writes JSON and exits 0", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fm-evidence-eval-cli-"));
  const json = join(directory, "summary.json");
  const { stdout } = await execFileAsync(process.execPath, ["--experimental-strip-types", "scripts/run-evidence-trust-eval.mjs", "--json", json], {
    cwd: new URL(".", root),
    env: { ...process.env, BRAVE_SEARCH_API_KEY: "" },
  });
  assert.match(stdout, /cases passed\. Offline/);
  const written = JSON.parse(await readFile(json, "utf8"));
  assert.equal(written.failed, 0);
  assert.equal(written.total, dataset.cases.length);
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.match(pkg.scripts["eval:evidence"], /run-evidence-trust-eval\.mjs/);
});
