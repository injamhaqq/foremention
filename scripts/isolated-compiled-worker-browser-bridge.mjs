#!/usr/bin/env node
// Bounded experiment only: real compiled Worker plus its generated static
// assets through the local test-harness listener, exposed to one real Chromium
// fixture through a minimal loopback HTTP bridge. Not production/edge/network-
// representative acceptance.
// No production service, provider, paid API, existing browser credentials or
// sensitive failure log is accessed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile, writeFile, unlink } from "node:fs/promises";
import { createServer } from "node:http";
import { createTestHarness } from "wrangler";

const appOrigin = "http://127.0.0.1:4174";
const local = value => {
  try {
    const target = new URL(value);
    return target.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(target.hostname) &&
      !target.username && !target.password;
  } catch {
    return false;
  }
};
if (!local(process.env.NEXT_PUBLIC_SUPABASE_URL || "") ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw Error("Refusing browser experiment without disposable loopback Supabase Auth.");
}
await access("dist/server/wrangler.json");
await access("dist/server/.dev.vars");
const original = JSON.parse(await readFile("dist/server/wrangler.json","utf8"));
assert.equal(original.ai?.binding,"AI",
  "Only the known optional remote Workers AI binding may be excluded.");
delete original.ai;
const isolatedConfig = "dist/server/wrangler.local-browser-bridge.json";
await writeFile(isolatedConfig,JSON.stringify(original),"utf8");

let harness;
let server;
let browserChild;
try {
  harness = createTestHarness({workers:[{configPath:isolatedConfig}]});
  const {url} = await harness.listen();
  assert.ok(local(url.href),"The compiled Worker test harness must bind loopback.");
  const compiledWorker = harness.getWorker();
  const health = await compiledWorker.fetch(new URL("/api/health",url).toString());
  assert.equal(health.status,200,"The compiled Worker must answer its first health request.");

  server = createServer(async (request,response) => {
    // Only a disposable HTTP loopback address is reachable from Chromium.
    // No forwarding proxy, remote fetch, generic URL handling or raw log dump.
    try {
      const target = new URL(request.url || "/",appOrigin);
      if (target.origin !== appOrigin) {
        response.writeHead(400).end();
        return;
      }
      const headers = new Headers();
      for (const [name,value] of Object.entries(request.headers)) {
        if (["host","connection","content-length","transfer-encoding","accept-encoding"].includes(name)) continue;
        if (Array.isArray(value)) {
          for (const item of value) headers.append(name,item);
        } else if (value !== undefined) headers.set(name,value);
      }
      // Preserve the browser-facing same-origin boundary through the loopback
      // harness transport. The application already recognizes validated
      // forwarded host/protocol metadata for reverse-proxy execution.
      headers.set("x-forwarded-host", new URL(appOrigin).host);
      headers.set("x-forwarded-proto", new URL(appOrigin).protocol.replace(":", ""));

      const chunks = [];
      let received = 0;
      for await (const chunk of request) {
        received += chunk.length;
        if (received > 2_000_000) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const method = request.method || "GET";
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      // Browser hydration needs the generated static asset layer as well as
      // the Worker. The harness listener exercises both; direct getWorker()
      // dispatch above remains the independent compiled-Worker health proof.
      const harnessTarget = new URL(target.pathname + target.search, url);
      const workerResponse = await fetch(harnessTarget,{
        method,
        headers,
        ...(body && !["GET","HEAD"].includes(method) ? {body} : {}),
        redirect:"manual",
      });
      // A bridge is not a pass-retry device: return the actual first status.
      // Keep Set-Cookie as separate headers for real browser session handling.
      // Undici has already decoded any compressed response body. Do not
      // forward Content-Encoding for those decoded bytes or the outer browser/
      // fetch client will attempt a second decompression.
      const sentHeaders = {};
      workerResponse.headers.forEach((value,name) => {
        if (["set-cookie","connection","content-length","transfer-encoding","content-encoding"].includes(name)) return;
        sentHeaders[name] = value;
      });
      const setCookies = workerResponse.headers.getSetCookie();
      if (setCookies.length) sentHeaders["set-cookie"] = setCookies;
      response.writeHead(workerResponse.status,sentHeaders);
      if (method === "HEAD") {
        response.end();
      } else {
        response.end(Buffer.from(await workerResponse.arrayBuffer()));
      }
    } catch {
      // Never expose exception text, bearer tokens, URLs or body fragments.
      if (!response.headersSent) response.writeHead(502);
      response.end("Local browser bridge transport failed.");
    }
  });
  await new Promise((resolve,reject) => {
    server.once("error",reject);
    server.listen(4174,"127.0.0.1",resolve);
  });
  const proxyHealth = await fetch(appOrigin + "/api/health");
  assert.equal(proxyHealth.status,200,"Browser-facing loopback must preserve compiled-Worker health.");
  const root = await fetch(appOrigin + "/");
  assert.equal(root.status,200,"Browser-facing loopback must render the compiled application shell.");
  const rootHtml = await root.text();
  const assetPath = rootHtml.match(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/)?.[1];
  assert.ok(assetPath,"Compiled application shell must reference a generated browser asset.");
  const asset = await fetch(appOrigin + assetPath);
  assert.equal(asset.status,200,"Browser-facing loopback must serve generated static assets.");
  process.stdout.write("[compiled-browser-bridge] first-compiled-worker-loopback-and-static-asset-health-200\n");

  // Existing full Playwright Chromium journey performs real review/approval,
  // locally persisted second cycle and strict positive/negative page reads.
  // It must pass unchanged on its FIRST route attempts; no diagnostic retry
  // is promoted to acceptance.
  process.env.FOREMENTION_ISOLATED_APP_URL = appOrigin;
  const code = await new Promise((resolve,reject) => {
    browserChild = spawn(process.execPath,["scripts/isolated-authenticated-journey.mjs"],{
      env:{...process.env},
      stdio:"inherit",
    });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      browserChild.kill("SIGTERM");
    },25 * 60_000);
    browserChild.once("error",error => {
      clearTimeout(timeout);
      reject(Error("Chromium fixture process could not start: " + error.name));
    });
    browserChild.once("exit",(exitCode,signal) => {
      clearTimeout(timeout);
      if (timedOut) reject(Error("First Chromium fixture exceeded the 25-minute isolated deadline."));
      else if (signal) reject(Error("Chromium fixture was interrupted."));
      else resolve(exitCode);
    });
  });
  assert.equal(code,0,"The actual Chromium full customer journey must pass without test retries.");
  process.stdout.write("[compiled-browser-bridge] complete-real-Chromium-journey-passed-in-isolated-local-runtime\n");
} finally {
  if (browserChild?.exitCode === null) browserChild.kill("SIGKILL");
  if (server?.listening) {
    await new Promise(resolve=>server.close(resolve));
  }
  if (harness) await harness.close();
  await unlink(isolatedConfig);
}
