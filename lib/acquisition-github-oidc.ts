const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_JWKS = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;
export const ACQUISITION_SHADOW_OIDC_AUDIENCE = "foremention-acquisition-shadow";
const EXPECTED_REPOSITORY = "injamhaqq/foremention";
const EXPECTED_REPOSITORY_ID = "1310253121";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW = "Acquisition Shadow Run";
const EXPECTED_WORKFLOW_REF = `${EXPECTED_REPOSITORY}/.github/workflows/acquisition-shadow-run.yml@${EXPECTED_REF}`;
const CLOCK_SKEW_SECONDS = 30;

type JwtHeader = { alg?: unknown; kid?: unknown; typ?: unknown };
type Claims = Record<string, unknown>;
type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

export type VerifiedAcquisitionShadowIdentity = {
  releaseSha: string;
  githubRunId: string;
  githubRunAttempt: number;
  eventName: "push" | "workflow_dispatch";
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  const bytes = decodeBase64Url(value);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function audienceIncludes(value: unknown, expected: string) {
  if (typeof value === "string") return value === expected;
  return Array.isArray(value) && value.some((item) => item === expected);
}

function numericClaim(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function validateGitHubActionsOidcClaims(
  claims: Claims,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedAcquisitionShadowIdentity {
  if (claims.iss !== GITHUB_OIDC_ISSUER) throw new Error("ACQUISITION_OIDC_ISSUER_INVALID");
  if (!audienceIncludes(claims.aud, ACQUISITION_SHADOW_OIDC_AUDIENCE)) throw new Error("ACQUISITION_OIDC_AUDIENCE_INVALID");

  const exp = numericClaim(claims.exp);
  const nbf = numericClaim(claims.nbf);
  const iat = numericClaim(claims.iat);
  if (exp === null || exp < nowSeconds - CLOCK_SKEW_SECONDS) throw new Error("ACQUISITION_OIDC_EXPIRED");
  if (nbf !== null && nbf > nowSeconds + CLOCK_SKEW_SECONDS) throw new Error("ACQUISITION_OIDC_NOT_YET_VALID");
  if (iat !== null && iat > nowSeconds + CLOCK_SKEW_SECONDS) throw new Error("ACQUISITION_OIDC_ISSUED_IN_FUTURE");

  if (claims.repository !== EXPECTED_REPOSITORY) throw new Error("ACQUISITION_OIDC_REPOSITORY_INVALID");
  if (String(claims.repository_id ?? "") !== EXPECTED_REPOSITORY_ID) throw new Error("ACQUISITION_OIDC_REPOSITORY_ID_INVALID");
  if (claims.ref !== EXPECTED_REF || claims.ref_type !== "branch") throw new Error("ACQUISITION_OIDC_REF_INVALID");
  if (claims.workflow !== EXPECTED_WORKFLOW || claims.workflow_ref !== EXPECTED_WORKFLOW_REF) {
    throw new Error("ACQUISITION_OIDC_WORKFLOW_INVALID");
  }
  if (claims.runner_environment !== "github-hosted") throw new Error("ACQUISITION_OIDC_RUNNER_INVALID");

  const eventName = claims.event_name;
  if (eventName !== "push" && eventName !== "workflow_dispatch") throw new Error("ACQUISITION_OIDC_EVENT_INVALID");

  const releaseSha = typeof claims.sha === "string" ? claims.sha.toLowerCase() : "";
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error("ACQUISITION_OIDC_SHA_INVALID");
  const workflowSha = typeof claims.workflow_sha === "string" ? claims.workflow_sha.toLowerCase() : "";
  if (workflowSha !== releaseSha) throw new Error("ACQUISITION_OIDC_WORKFLOW_SHA_INVALID");

  const githubRunId = typeof claims.run_id === "string" ? claims.run_id : String(claims.run_id ?? "");
  if (!/^\d+$/.test(githubRunId)) throw new Error("ACQUISITION_OIDC_RUN_ID_INVALID");
  const githubRunAttempt = numericClaim(claims.run_attempt);
  if (githubRunAttempt === null || !Number.isInteger(githubRunAttempt) || githubRunAttempt < 1 || githubRunAttempt > 1000) {
    throw new Error("ACQUISITION_OIDC_RUN_ATTEMPT_INVALID");
  }

  return { releaseSha, githubRunId, githubRunAttempt, eventName };
}

async function signingKey(kid: string) {
  const response = await fetch(GITHUB_OIDC_JWKS, {
    headers: { accept: "application/json", "user-agent": "Foremention-Acquisition-OIDC/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ACQUISITION_OIDC_JWKS_HTTP_${response.status}`);
  const payload = await response.json() as { keys?: Jwk[] };
  const key = payload.keys?.find((candidate) => candidate.kid === kid && candidate.kty === "RSA");
  if (!key) throw new Error("ACQUISITION_OIDC_SIGNING_KEY_NOT_FOUND");
  return key;
}

export async function verifyGitHubActionsOidcToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("ACQUISITION_OIDC_TOKEN_MALFORMED");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<JwtHeader>(encodedHeader);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new Error("ACQUISITION_OIDC_HEADER_INVALID");
  }

  const jwk = await signingKey(header.kid);
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!verified) throw new Error("ACQUISITION_OIDC_SIGNATURE_INVALID");

  return validateGitHubActionsOidcClaims(decodeJson<Claims>(encodedPayload));
}
