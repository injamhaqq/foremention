#!/usr/bin/env node
/**
 * Operator-invoked, READ ONLY phase-zero preflight for a genuinely isolated
 * remote stage. It never authenticates, writes records, changes DNS or deploys.
 * Staging URL / project identifiers are operator declarations: this alone
 * cannot prove the remote Worker's actual database binding is isolated.
 */
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { verifyBoundedReleaseHealth } from './bounded-release-health.mjs';

const shaPattern = /^[0-9a-f]{40}$/;
const projectPattern = /^[a-z0-9]{20}$/;
const protectedPaths = ['/app', '/app/outcomes', '/app/outcomes/print'];
const loginRedirectStatuses = new Set([301, 302, 303, 307, 308]);

export function validateIsolatedStageConfig(input) {
  const fields = ['baseUrl', 'approvedHost', 'expectedSha', 'productionSha', 'stageProjectRef', 'productionProjectRef'];
  if (!input || typeof input !== 'object' || fields.some((key) => typeof input[key] !== 'string' || !input[key].trim())) {
    throw new Error('All approved stage and production comparison fields are required.');
  }
  let url;
  try { url = new URL(input.baseUrl); } catch { throw new Error('Stage URL must be a fully qualified HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Stage must be a clean HTTPS origin with no credentials, port, path, query or fragment.');
  }
  const host = url.hostname.toLowerCase();
  const allowedHost = input.approvedHost.trim().toLowerCase();
  if (host !== allowedHost || isIP(host) || host === 'localhost' || host.endsWith('.localhost')
    || host === 'foremention.com' || host === 'www.foremention.com'
    || !(host.endsWith('.foremention.com') || host.endsWith('.workers.dev'))) {
    throw new Error('Stage host must exactly match a separately approved nonproduction Foremention staging host.');
  }
  const sha = input.expectedSha.toLowerCase();
  const prodSha = input.productionSha.toLowerCase();
  if (!shaPattern.test(sha) || !shaPattern.test(prodSha) || sha === prodSha) {
    throw new Error('An exact staging SHA different from the verified production SHA is required.');
  }
  if (!projectPattern.test(input.stageProjectRef) || !projectPattern.test(input.productionProjectRef)
    || input.stageProjectRef === input.productionProjectRef) {
    throw new Error('Distinct 20-character production and staging project declarations are required.');
  }
  return Object.freeze({baseUrl: url.origin, host, expectedSha: sha});
}

async function limitedFetch({url, method}) {
  return fetch(url, {
    method,
    headers: {accept: 'application/json, text/html;q=0.9', 'cache-control': 'no-store', 'user-agent': 'Foremention-Isolated-Stage-ReadOnly/1.0'},
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
  });
}

const safeStatus = (res) => Number.isInteger(res?.status) ? res.status : 0;

/**
 * All network calls are GET, redirected responses are never automatically
 * followed, and no cookies or Authorization headers are supplied. The private
 * second-cycle UI/API/browser acceptance required by #334 is separate.
 */
export async function runIsolatedStagePreflight(input, {request = limitedFetch, pause = () => Promise.resolve()} = {}) {
  const stage = validateIsolatedStageConfig(input);
  const requestPath = (path) => request({url: stage.baseUrl + path, method: 'GET'});
  const health = await verifyBoundedReleaseHealth({
    expectedBuildCommit: stage.expectedSha,
    request: async () => {
      try {
        const response = await requestPath('/api/health?isolated_stage_probe=1');
        const len = Number(response.headers?.get('content-length') || 0);
        if (len > 8192) return {status: 0};
        const data = await response.json().catch(() => null);
        // Explicit field allowlist; never include provider error bodies or
        // session content in receipt/error logs.
        return {status: safeStatus(response), buildCommit: data?.buildCommit,
          d1: data?.d1, supabase: data?.supabase};
      } catch { return {status: 0}; }
    },
    maxAttempts: 3,
    pause,
  });
  if (!health.ok) return {ok: false, stageHost: stage.host, expectedSha: stage.expectedSha,
    reason: 'stage_health_' + health.reason, health: health.receipts, routeChecks: []};
  // Later recovery does not erase a first-attempt transport failure. #334
  // requires a reliable deployed path, not merely eventual availability.
  if (health.receipts.length !== 1) return {ok:false,stageHost:stage.host,expectedSha:stage.expectedSha,
    reason:'degraded_first_attempt',health:health.receipts,routeChecks:[]};
  // An HTTP 200 and matching build string alone do not prove the real D1
  // and Auth dependencies are connected to this stage. Require the real
  // health contract to report both checks independently reachable.
  if (health.receipts.some((receipt) => receipt.d1 !== 'reachable' || receipt.supabase !== 'reachable'))
    return {ok:false,stageHost:stage.host,expectedSha:stage.expectedSha,
      reason:'stage_dependencies_unverified',health:health.receipts,routeChecks:[]};

  const routeChecks = [];
  let root;
  try { root = await requestPath('/'); } catch { return {ok:false,stageHost:stage.host,expectedSha:stage.expectedSha,
    reason:'public_root_unavailable', health: health.receipts, routeChecks}; }
  const html = String(root.headers?.get('content-type') || '').toLowerCase().includes('text/html');
  routeChecks.push({path:'/', status: safeStatus(root), ok: root.status === 200 && html});
  if (!routeChecks.at(-1).ok) return {ok:false,stageHost:stage.host,expectedSha:stage.expectedSha,
    reason:'public_root_invalid',health:health.receipts,routeChecks};

  for (const path of protectedPaths) {
    let response;
    try { response = await requestPath(path); }
    catch { return {ok:false,stageHost:stage.host,expectedSha:stage.expectedSha,
      reason:'protected_route_unavailable',health:health.receipts,routeChecks}; }
    let redirectValid=false;
    try {
      const redirect = new URL(response.headers?.get('location') || '', stage.baseUrl);
      redirectValid = loginRedirectStatuses.has(response.status)
        && redirect.origin === stage.baseUrl && redirect.pathname === '/login'
        && redirect.searchParams.get('next') === (path === '/app/outcomes/print' ? '/app/outcomes' : path);
    } catch { /* no user-supplied redirect/location copied into logs */ }
    routeChecks.push({path, status: safeStatus(response), ok:redirectValid});
    if (!redirectValid) return {ok:false,stageHost:stage.host,expectedSha:stage.expectedSha,
      reason:'anonymous_boundary_not_verified',health:health.receipts,routeChecks};
  }
  return {ok:true,stageHost:stage.host,expectedSha:stage.expectedSha,
    reason:null,health:health.receipts,routeChecks,
    limitation:'Read-only remote preflight only; actual DB binding, authorized forms, RLS, exact comparison and rollback remain independently unverified.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = {
    baseUrl:process.env.FOREMENTION_STAGE_BASE_URL || '',
    approvedHost:process.env.FOREMENTION_STAGE_APPROVED_HOST || '',
    expectedSha:process.env.FOREMENTION_STAGE_EXPECTED_SHA || '',
    productionSha:process.env.FOREMENTION_VERIFIED_PRODUCTION_SHA || '',
    stageProjectRef:process.env.FOREMENTION_STAGE_PROJECT_REF || '',
    productionProjectRef:process.env.FOREMENTION_PRODUCTION_PROJECT_REF || '',
  };
  runIsolatedStagePreflight(input).then((result) => {
    process.stdout.write(JSON.stringify(result,null,2) + '\n');
    if (!result.ok) process.exitCode=1;
  }).catch(() => {
    // Invalid input could contain secrets. Never echo raw supplied data.
    process.stderr.write('Isolated-stage preflight failed input validation or a read-only request.\n');
    process.exitCode=1;
  });
}
