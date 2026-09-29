#!/usr/bin/env node
// A disposable production-artifact acceptance experiment. Run only after
// LOCAL Supabase CLI has started, migrations replayed, .dev.vars written and
// pnpm build generated the exact candidate's dist/server/wrangler.json.
// The separate browser/Worker proof and owner production gates remain intact.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createTestHarness } from "wrangler";

const local = value => {
  const url = new URL(value);
  return url.protocol === "http:" && ["127.0.0.1","localhost"].includes(url.hostname);
};
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
if (!local(supabase) || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.FOREMENTION_ISOLATED_APP_URL?.startsWith("http://127.0.0.1:")) {
  throw Error("Refusing programmatic acceptance without disposable local Supabase/Auth.");
}
await access("dist/server/wrangler.json");
await access("dist/server/.dev.vars");

const harness = createTestHarness({
  workers: [{configPath:"dist/server/wrangler.json"}],
});
try {
  const {url} = await harness.listen();
  assert.ok(local(url.href),"Programmatic Worker harness must bind loopback only.");
  const health = await harness.fetch(new URL("/api/health",url).toString());
  assert.equal(health.status,200,"The real compiled Worker must answer its first health request.");
  const status = await health.json();
  assert.equal(status.status,"ok","The compiled Worker health payload must be verified.");
  process.stdout.write("[programmatic-harness] production-artifact-workerd-local-health-200\\n");
  const result = await new Promise((resolve,reject)=>{
    const child = spawn(process.execPath,["scripts/isolated-customer-api.mjs"],{
      env:{...process.env,FOREMENTION_ISOLATED_APP_URL:url.href},
      stdio:"inherit",
    });
    child.once("error",()=>reject(Error("Native authenticated child process could not start.")));
    child.once("exit",(code,signal)=>resolve({code,signal}));
  });
  assert.equal(result.signal,null,"A signal-terminated application acceptance never passes.");
  assert.equal(result.code,0,"All first-attempt real authenticated API stages must pass.");
  process.stdout.write("[programmatic-harness] authenticated-customer-API-acceptance-passed-without-wrangler-dev-proxy\\n");
} finally {
  await harness.close();
}
