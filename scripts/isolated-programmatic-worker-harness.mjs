#!/usr/bin/env node
// A disposable production-artifact acceptance experiment. Run only after
// LOCAL Supabase CLI has started, migrations replayed, .dev.vars written and
// pnpm build generated the exact candidate's dist/server/wrangler.json.
// The separate browser/Worker proof and owner production gates remain intact.
import assert from "node:assert/strict";
import { access, readFile, writeFile, unlink } from "node:fs/promises";
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

// Workers AI cannot run in the offline test harness: leaving config.ai
// enabled requests Cloudflare's remote binding proxy and a real API token.
// The tested app routes NEVER invoke AI. Remove only this optional binding in
// an ephemeral copy of the exact generated production build configuration;
// preserve the production config, module bundle, D1 and static assets as-is.
const original=JSON.parse(await readFile("dist/server/wrangler.json","utf8"));
assert.equal(original.ai?.binding,"AI","Only the known optional provider binding may be stripped.");
delete original.ai;
const isolatedConfig="dist/server/wrangler.local-harness.json";
await writeFile(isolatedConfig,JSON.stringify(original),"utf8");
const harness = createTestHarness({
  workers: [{configPath:isolatedConfig}],
});
try {
  const {url} = await harness.listen();
  const directWorker=harness.getWorker();
  assert.ok(local(url.href),"Programmatic Worker harness must bind loopback only.");
  const health = await harness.fetch(new URL("/api/health",url).toString());
  assert.equal(health.status,200,"The real compiled Worker must answer its first health request.");
  const status = await health.json();
  assert.equal(status.status,"ok","The compiled Worker health payload must be verified.");
  process.stdout.write("[programmatic-harness] production-artifact-workerd-local-health-200\\n");
  // The external Workerd HTTP test server returned a synthetic 500 at an
  // intentionally invalid payload even after the remote-only AI binding was
  // removed. Isolate server transport from compiled-worker execution by
  // dispatching only loopback APP requests directly through harness.fetch.
  // Local Supabase Auth/PostgREST still receives genuine network requests.
  const originalFetch=globalThis.fetch;
  const appOrigin=url.origin;
  process.env.FOREMENTION_ISOLATED_APP_URL=url.href;
  globalThis.fetch=async (input,init)=>{
    const target=new URL(typeof input==="string"||input instanceof URL ? input : input.url);
    if(target.origin!==appOrigin) return originalFetch(input,init);
    const beforeLogs=harness.getLogs().length;
    // Dispatch the route straight to the compiled Worker, bypassing even
    // the harness routing/server adapter used by harness.fetch.
    const first=directWorker.fetch(input,init).then(response=>{
      if(response.status>=500){
        // Inspect only known fixed-stage markers and approved opaque failure
        // categories. NEVER emit raw Worker log messages, request headers,
        // potentially sensitive response bodies, or environment values.
        const collected=harness.getLogs().slice(beforeLogs);
        const serialized=collected.map(log=>JSON.stringify(log));
        const labels=["entry","origin","viewer","payload","invalid","db"];
        const reached=labels.filter(label=>serialized.some(line=>
          line.includes("isolated-onboarding-stage") && line.includes(label)
        ));
        const safeCategories={
          outbound_fetch:serialized.some(line=>/fetch failed|Network connection lost|ECONNREFUSED/i.test(line)),
          unhandled_exception:serialized.some(line=>/uncaught|unhandled|exception/i.test(line)),
          runtime_limit:serialized.some(line=>/limits exceeded|execution context|out of memory/i.test(line)),
          worker_transport:serialized.some(line=>/worker script error|internal error|disconnected/i.test(line)),
        };
        process.stdout.write("[programmatic-harness] sanitized-failed-route="+
          new URL(typeof input==="string"||input instanceof URL? input : input.url).pathname+
          " status="+response.status+" fixed-stages="+reached.join(",")+
          " log-events="+collected.length+" categories="+
          Object.entries(safeCategories).filter(([,v])=>v).map(([k])=>k).join(",")+"\\n");
      }
      return response;
    });
    const deadline=new Promise((_,reject)=>{
      const timer=setTimeout(()=>reject(Error("First direct compiled-Worker request exceeded isolated 75s deadline.")),75_000);
      first.finally(()=>clearTimeout(timer)).catch(()=>{});
    });
    return Promise.race([first,deadline]);
  };
  try {
    if(process.env.FOREMENTION_ISOLATED_FULL_BRIDGE === "1") {
      await import("./isolated-customer-api-bridge.mjs");
    } else {
      await import("./isolated-customer-api.mjs");
    }
  } finally {
    globalThis.fetch=originalFetch;
  }
  process.stdout.write("[programmatic-harness] authenticated-customer-API-acceptance-passed-without-wrangler-dev-proxy\\n");
} finally {
  await harness.close();
  await unlink(isolatedConfig);
}
