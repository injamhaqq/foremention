import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path,import.meta.url),"utf8");

test("experimental real Chromium transport uses only a disposable compiled Worker",async()=>{
  const [bridge,workflow,browser,regularHarness] = await Promise.all([
    read("../scripts/isolated-compiled-worker-browser-bridge.mjs"),
    read("../.github/workflows/isolated-browser-direct-worker-experiment.yml"),
    read("../scripts/isolated-authenticated-journey.mjs"),
    read("../scripts/isolated-programmatic-worker-harness.mjs"),
  ]);
  assert.match(bridge,/createTestHarness/);
  assert.match(bridge,/harness\.getWorker\(\)/);
  assert.match(bridge,/await compiledWorker\.fetch\(/);
  assert.match(bridge,/compiledWorker\.fetch\(target\.toString\(\)/);
  assert.match(bridge,/server\.listen\(4174,"127\.0\.0\.1"/);
  assert.match(bridge,/assert\.equal\(workerResponse\.status|response\.writeHead\(workerResponse\.status/);
  assert.match(bridge,/spawn\(process\.execPath,\["scripts\/isolated-authenticated-journey\.mjs"\]/);
  assert.match(bridge,/assert\.equal\(code,0/);
  assert.match(bridge,/await harness\.close\(\)/);
  assert.match(bridge,/await unlink\(isolatedConfig\)/);
  assert.doesNotMatch(bridge,/fetch\("https:\/\/|FOREMENTION_ACCEPTANCE_PASSWORD|retry\(/
    ,"no external provider, static credential, live release or retry workaround");

  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/pnpm build/);
  assert.match(workflow,/supabase start/);
  assert.match(workflow,/supabase db reset/);
  assert.match(workflow,/playwright install --with-deps chromium/);
  assert.match(workflow,/node scripts\/isolated-compiled-worker-browser-bridge\.mjs/);
  assert.doesNotMatch(workflow,/secrets\.|foremention\.com/);
  assert.match(browser,/newPage\(\)/);
  assert.match(browser,/\/app\/outcomes\/print/);
  assert.match(browser,/fixture-different-evaluation-v2/);
  assert.match(regularHarness,/directWorker\.fetch\(input,init\)/,
    "independent, already proven API harness is untouched");
});
