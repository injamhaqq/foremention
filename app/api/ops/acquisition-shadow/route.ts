import { env } from "cloudflare:workers";
import { verifyGitHubActionsOidcToken } from "@/lib/acquisition-github-oidc";
import {
  acquisitionShadowRequestKey,
  createOrLoadAcquisitionShadowRequest,
  loadAcquisitionShadowRequest,
  markAcquisitionShadowDispatched,
  publicAcquisitionShadowRequest,
} from "@/lib/acquisition-shadow-request";
import { inngest } from "@/lib/jobs/inngest";
import { isMissingRelationError } from "@/lib/supabase-rest";

type RuntimeBindings = {
  FOREMENTION_BUILD_COMMIT?: string;
  INNGEST_EVENT_KEY?: string;
};

const BUILD_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const NO_STORE = { "Cache-Control": "no-store" };
const TERMINAL_STATUSES = new Set(["disabled", "provider_unavailable", "schema_unavailable", "shadow_drafted", "failed"]);

function runtimeBindings() {
  return env as unknown as RuntimeBindings;
}

function currentBuildCommit() {
  const buildCommit = String(runtimeBindings().FOREMENTION_BUILD_COMMIT || "").trim().toLowerCase();
  if (!BUILD_COMMIT_PATTERN.test(buildCommit)) throw new Error("ACQUISITION_SHADOW_BUILD_UNAVAILABLE");
  return buildCommit;
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || "";
}

async function verifiedIdentity(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("ACQUISITION_OIDC_TOKEN_MISSING");
  return verifyGitHubActionsOidcToken(token);
}

function responseFor(row: NonNullable<Awaited<ReturnType<typeof loadAcquisitionShadowRequest>>>) {
  const body = publicAcquisitionShadowRequest(row);
  return Response.json(body, {
    status: TERMINAL_STATUSES.has(row.status) ? 200 : 202,
    headers: NO_STORE,
  });
}

function unauthorized() {
  return Response.json({ error: "Repository identity could not be verified." }, { status: 401, headers: NO_STORE });
}

function unavailable(error: unknown) {
  if (isMissingRelationError(error)) {
    return Response.json({ error: "Acquisition shadow request storage is not available on this release." }, { status: 503, headers: NO_STORE });
  }
  return Response.json({ error: "Acquisition shadow execution is temporarily unavailable." }, { status: 503, headers: NO_STORE });
}

async function context(request: Request) {
  const identity = await verifiedIdentity(request);
  const buildCommit = currentBuildCommit();
  if (identity.releaseSha !== buildCommit) {
    return { response: Response.json({ error: "Exact production release is not ready.", buildCommit }, { status: 409, headers: NO_STORE }) };
  }
  return { identity, buildCommit };
}

export async function GET(request: Request) {
  let resolved: Awaited<ReturnType<typeof context>>;
  try {
    resolved = await context(request);
  } catch {
    return unauthorized();
  }
  if ("response" in resolved) return resolved.response;

  try {
    const requestKey = acquisitionShadowRequestKey(resolved.identity);
    const row = await loadAcquisitionShadowRequest(requestKey);
    if (!row) return Response.json({ error: "Acquisition shadow request was not found." }, { status: 404, headers: NO_STORE });
    return responseFor(row);
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  if (!runtimeBindings().INNGEST_EVENT_KEY) {
    return Response.json({ error: "Inngest event dispatch is not configured." }, { status: 503, headers: NO_STORE });
  }

  let resolved: Awaited<ReturnType<typeof context>>;
  try {
    resolved = await context(request);
  } catch {
    return unauthorized();
  }
  if ("response" in resolved) return resolved.response;

  try {
    let row = await createOrLoadAcquisitionShadowRequest(resolved.identity);
    if (row.status !== "requested" || row.inngest_event_id) return responseFor(row);

    const requestKey = row.request_key;
    const sent = await inngest.send({
      id: `acquisition-shadow-${requestKey}`,
      name: "foremention/acquisition.shadow.requested",
      data: { requestKey, releaseSha: resolved.buildCommit },
    });
    row = await markAcquisitionShadowDispatched(requestKey, sent.ids[0] || null) || row;
    return responseFor(row);
  } catch (error) {
    return unavailable(error);
  }
}
