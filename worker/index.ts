/** Cloudflare Worker entry point for the foremention Next.js application. */
import * as Sentry from "@sentry/cloudflare";
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { intakeRateLimitsTable, publicToolRateLimitsTable, publicVisibilityScoresTable, sourceGapRequestsIndex, sourceGapRequestsTable } from "../db/schema";
import { setCloudflareAiBinding, type CloudflareAiBinding } from "../lib/providers/cloudflare";
import { scrubSentryEvent } from "../lib/sentry-privacy";

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  AI?: CloudflareAiBinding;
  DB?: D1Database;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  GROQ_MODEL_VERSION?: string;
  GROQ_REQUEST_COST_USD?: string;
  PUBLIC_TOOL_MAX_REQUEST_COST_USD?: string;
  PUBLIC_RATE_LIMIT_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://*.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io https://*.posthog.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

function secureResponse(response: Response, url: URL) {
  const secured = new Response(response.body, response);
  // Vinext currently bootstraps its client with inline module imports, so
  // unsafe-inline is narrowly retained until the runtime supports per-request
  // nonces. External scripts, framing, objects, and cross-origin form targets
  // remain blocked by the enforced policy.
  secured.headers.set("Content-Security-Policy", contentSecurityPolicy);
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  secured.headers.set("Origin-Agent-Cluster", "?1");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (url.protocol === "https:") {
    secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (url.pathname.startsWith("/app") || url.pathname.startsWith("/api/auth")) {
    secured.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return secured;
}

async function initializeD1(db: D1Database) {
  await db.batch([
    db.prepare(sourceGapRequestsTable),
    db.prepare(sourceGapRequestsIndex),
    db.prepare(intakeRateLimitsTable),
    db.prepare(publicToolRateLimitsTable),
    db.prepare(publicVisibilityScoresTable),
  ]);
}

async function sha256(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function publicRateLimit(request: Request, env: Env, endpoint: string, limit: number, windowMs: number) {
  if (!env.DB || !env.PUBLIC_RATE_LIMIT_SECRET) return { allowed: false, configured: false };
  await initializeD1(env.DB);
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const fingerprint = await sha256(`${env.PUBLIC_RATE_LIMIT_SECRET}:${endpoint}:${address}`);
  const now = Date.now();
  const row = await env.DB.prepare("SELECT window_started_at, request_count FROM public_tool_rate_limits WHERE endpoint = ? AND fingerprint_hash = ?").bind(endpoint, fingerprint).first<{ window_started_at: number; request_count: number }>();
  if (row && now - row.window_started_at < windowMs && row.request_count >= limit) return { allowed: false, configured: true };
  if (!row || now - row.window_started_at >= windowMs) await env.DB.prepare("INSERT OR REPLACE INTO public_tool_rate_limits (endpoint, fingerprint_hash, window_started_at, request_count) VALUES (?, ?, ?, ?)").bind(endpoint, fingerprint, now, 1).run();
  else await env.DB.prepare("UPDATE public_tool_rate_limits SET request_count = request_count + 1 WHERE endpoint = ? AND fingerprint_hash = ?").bind(endpoint, fingerprint).run();
  return { allowed: true, configured: true };
}

type PublicRouteLimit = { endpoint: string; limit: number; windowMs: number };

function publicRouteLimit(pathname: string): PublicRouteLimit | null {
  if (pathname === "/score") return { endpoint: "score-page", limit: 60, windowMs: 60 * 60 * 1000 };
  if (pathname === "/prompt-check") return { endpoint: "prompt-check-page", limit: 60, windowMs: 60 * 60 * 1000 };
  if (pathname.startsWith("/report/")) return { endpoint: "report", limit: 60, windowMs: 60 * 60 * 1000 };
  if (pathname === "/grader" || pathname.startsWith("/grader/")) return { endpoint: "grader", limit: 20, windowMs: 60 * 60 * 1000 };
  if (pathname.startsWith("/audit/")) return { endpoint: "audit", limit: 20, windowMs: 60 * 60 * 1000 };
  return null;
}

async function enforcePublicRouteLimit(request: Request, env: Env, pathname: string) {
  const rule = publicRouteLimit(pathname);
  if (!rule) return null;
  const result = await publicRateLimit(request, env, rule.endpoint, rule.limit, rule.windowMs);
  // Static public pages remain readable if the optional D1 rate-limit secret has
  // not yet been configured. Cost-bearing public API calls fail closed in their
  // own handlers above, so a missing secret can never trigger provider spend.
  if (!result.configured) return null;
  if (result.allowed) return null;
  // Deliberately contains no IP address, fingerprint, prompt, brand, or other customer input.
  console.warn(JSON.stringify({ event: "public_rate_limit_hit", endpoint: rule.endpoint }));
  return Response.json({ error: "This public tool has reached its temporary request limit. Please try again later." }, { status: 429 });
}

function scoreQuestions(category: string) {
  return [
    `Which ${category} tools are best for a growing team?`,
    `What are the most credible ${category} platforms to compare?`,
    `Which ${category} product is easiest to adopt?`,
    `What ${category} software should a small B2B company shortlist?`,
    `Which ${category} vendors have strong independent evidence?`,
  ];
}

async function handleVisibilityScore(request: Request, env: Env) {
  if (!env.DB) return Response.json({ error: "The score store is unavailable." }, { status: 503 });
  await initializeD1(env.DB);
  const url = new URL(request.url);
  if (request.method === "GET") {
    const limited = await publicRateLimit(request, env, "score-share", 30, 60 * 60 * 1000);
    if (!limited.configured) return Response.json({ error: "The shared score is temporarily unavailable." }, { status: 503 });
    if (!limited.allowed) {
      console.warn(JSON.stringify({ event: "public_rate_limit_hit", endpoint: "score-share" }));
      return Response.json({ error: "This shared score has reached its temporary request limit. Please try again later." }, { status: 429 });
    }
    const id = url.searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "A valid shared score ID is required." }, { status: 400 });
    const row = await env.DB.prepare("SELECT result_json, expires_at FROM public_visibility_scores WHERE id = ?").bind(id).first<{ result_json: string; expires_at: number }>();
    if (!row || row.expires_at < Date.now()) return Response.json({ error: "This shared score is unavailable or expired." }, { status: 404 });
    return Response.json({ data: JSON.parse(row.result_json) });
  }
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const limited = await publicRateLimit(request, env, "score", 3, 24 * 60 * 60 * 1000);
  if (!limited.configured) return Response.json({ error: "The public score is not configured safely yet." }, { status: 503 });
  if (!limited.allowed) return Response.json({ error: "Daily score limit reached. Try again tomorrow." }, { status: 429 });
  if (!env.GROQ_API_KEY || !env.GROQ_MODEL) return Response.json({ error: "The live score provider is temporarily unavailable." }, { status: 503 });
  const estimatedRequestCost = Number(env.GROQ_REQUEST_COST_USD || "0"); const maxCost = Number(env.PUBLIC_TOOL_MAX_REQUEST_COST_USD || "0.04");
  if (!Number.isFinite(estimatedRequestCost) || !Number.isFinite(maxCost) || estimatedRequestCost > maxCost) return Response.json({ error: "The public score cost ceiling prevents this request." }, { status: 503 });
  const body = await request.json().catch(() => null) as { brand?: string; category?: string } | null;
  const brand = String(body?.brand || "").trim(); const category = String(body?.category || "").trim();
  if (brand.length < 2 || brand.length > 80 || category.length < 3 || category.length > 160) return Response.json({ error: "Enter a brand and a specific category." }, { status: 400 });
  const questions = scoreQuestions(category);
  const provider = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, "content-type": "application/json", "Groq-Model-Version": env.GROQ_MODEL_VERSION || "2025-07-23" }, body: JSON.stringify({ model: env.GROQ_MODEL, compound_custom: { tools: { enabled_tools: ["web_search"] } }, messages: [{ role: "system", content: "Answer each supplied buyer question independently using web search. Return valid JSON only in the form {\"answers\":[{\"question_number\":1,\"answer\":\"...\"}]}. Include exactly five answers. Do not invent companies, claims, or URLs." }, { role: "user", content: questions.map((question, index) => `${index + 1}. ${question}`).join("\n") }], max_completion_tokens: 1800 }), signal: AbortSignal.timeout(25_000) });
  const raw = await provider.json().catch(() => null) as { model?: string; choices?: Array<{ message?: { content?: string; executed_tools?: Array<{ search_results?: { results?: Array<{ url?: string }> } }> } }> } | null;
  if (!provider.ok || !raw?.choices?.[0]?.message?.content) return Response.json({ error: "The live provider did not complete the score. No result was invented." }, { status: 502 });
  let parsed: { answers?: Array<{ question_number?: number; answer?: string }> } = {};
  try { const content = raw.choices[0].message?.content || ""; const start = content.indexOf("{"); const end = content.lastIndexOf("}"); parsed = JSON.parse(content.slice(start, end + 1)); } catch { return Response.json({ error: "The provider response could not be verified as five separate answers." }, { status: 502 }); }
  const answers = (parsed.answers || []).filter((answer) => Number.isInteger(answer.question_number) && typeof answer.answer === "string").slice(0, 5);
  if (answers.length !== 5) return Response.json({ error: "The provider did not return five comparable answers." }, { status: 502 });
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const brandPattern = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
  const observations = answers.map((answer, index) => ({ question: questions[index], appeared: brandPattern.test(answer.answer || "") }));
  const citations = Array.from(new Set((raw.choices[0].message?.executed_tools || []).flatMap((tool) => tool.search_results?.results || []).map((item) => item.url).filter((value): value is string => Boolean(value)))).slice(0, 20);
  const score = observations.filter((item) => item.appeared).length * 20; const id = crypto.randomUUID(); const createdAt = new Date().toISOString();
  const result = { id, brand, category, score, appearedIn: observations.filter((item) => item.appeared).length, questions: observations, citations, provider: "Groq", model: raw.model || env.GROQ_MODEL, observedAt: createdAt, methodology: "One dated provider collection across five deterministic category questions. This is not a market-wide rank or outcome guarantee." };
  await env.DB.prepare("INSERT INTO public_visibility_scores (id, brand, category, score, model, result_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, brand, category, score, result.model, JSON.stringify(result), createdAt, Date.now() + 7 * 24 * 60 * 60 * 1000).run();
  return Response.json({ data: result }, { status: 201 });
}

async function handlePromptCoverage(request: Request, env: Env) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const limited = await publicRateLimit(request, env, "prompt-check", 5, 24 * 60 * 60 * 1000);
  if (!limited.configured) return Response.json({ error: "The public prompt check is not configured safely yet." }, { status: 503 });
  if (!limited.allowed) return Response.json({ error: "Daily prompt-check limit reached. Try again tomorrow." }, { status: 429 });
  if (!env.GROQ_API_KEY || !env.GROQ_MODEL) return Response.json({ error: "The live prompt provider is temporarily unavailable." }, { status: 503 });
  const estimatedRequestCost = Number(env.GROQ_REQUEST_COST_USD || "0"); const maxCost = Number(env.PUBLIC_TOOL_MAX_REQUEST_COST_USD || "0.04");
  if (!Number.isFinite(estimatedRequestCost) || !Number.isFinite(maxCost) || estimatedRequestCost > maxCost) return Response.json({ error: "The public tool cost ceiling prevents this request." }, { status: 503 });
  const body = await request.json().catch(() => null) as { brand?: string; question?: string } | null; const brand = String(body?.brand || "").trim(); const question = String(body?.question || "").trim();
  if (brand.length < 2 || brand.length > 80 || question.length < 8 || question.length > 500) return Response.json({ error: "Enter a brand and one complete buyer question." }, { status: 400 });
  const provider = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, "content-type": "application/json", "Groq-Model-Version": env.GROQ_MODEL_VERSION || "2025-07-23" }, body: JSON.stringify({ model: env.GROQ_MODEL, compound_custom: { tools: { enabled_tools: ["web_search"] } }, messages: [{ role: "system", content: "Use web search. Answer this buyer question directly, preserve uncertainty, and do not invent companies, claims, or URLs." }, { role: "user", content: question }], max_completion_tokens: 1000 }), signal: AbortSignal.timeout(25_000) });
  const raw = await provider.json().catch(() => null) as { model?: string; choices?: Array<{ message?: { content?: string; executed_tools?: Array<{ search_results?: { results?: Array<{ url?: string; title?: string }> } }> } }> } | null; const answer = raw?.choices?.[0]?.message?.content || "";
  if (!provider.ok || !answer) return Response.json({ error: "The live provider did not complete the check. No result was invented." }, { status: 502 });
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const appeared = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i").test(answer);
  const citations = Array.from(new Map((raw?.choices?.[0]?.message?.executed_tools || []).flatMap((tool) => tool.search_results?.results || []).filter((item) => item.url).map((item) => [item.url, { url: item.url, title: item.title || null }])).values()).slice(0, 20);
  return Response.json({ data: { brand, question, appeared, answer, citations, provider: "Groq", model: raw?.model || env.GROQ_MODEL, observedAt: new Date().toISOString(), methodology: "One dated provider answer. Presence does not establish ranking, buyer behavior, or future visibility." } });
}

async function handleSourceGapRequest(request: Request, env: Env) {
  if (!env.DB) return null;
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "Send this request as JSON." }, { status: 415 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const value = (key: string) => String(body?.[key] || "").trim();
  const required = ["email", "name", "website", "category", "competitors", "buyer_question", "consent"];
  if (!body || required.some((key) => !value(key))) {
    return Response.json({ error: "Complete every field before submitting." }, { status: 400 });
  }
  if (!emailPattern.test(value("email"))) {
    return Response.json({ error: "Enter a valid work email." }, { status: 400 });
  }
  let website: URL;
  try {
    website = new URL(value("website"));
    if (!['http:', 'https:'].includes(website.protocol)) throw new Error("protocol");
  } catch {
    return Response.json({ error: "Use a full website URL beginning with http:// or https://." }, { status: 400 });
  }

  await initializeD1(env.DB);
  const fingerprint = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const row = await env.DB.prepare("SELECT window_started_at, request_count FROM intake_rate_limits WHERE fingerprint = ?")
    .bind(fingerprint)
    .first<{ window_started_at: number; request_count: number }>();
  if (row && now - row.window_started_at < windowMs && row.request_count >= 5) {
    return Response.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  if (!row || now - row.window_started_at >= windowMs) {
    await env.DB.prepare("INSERT OR REPLACE INTO intake_rate_limits (fingerprint, window_started_at, request_count) VALUES (?, ?, ?)")
      .bind(fingerprint, now, 1)
      .run();
  } else {
    await env.DB.prepare("UPDATE intake_rate_limits SET request_count = request_count + 1 WHERE fingerprint = ?")
      .bind(fingerprint)
      .run();
  }

  const competitors = value("competitors").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO source_gap_requests
      (id, email, contact_name, website, category, competitors_json, buyer_question, consent_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), value("email").toLowerCase(), value("name"), website.toString(),
    value("category"), JSON.stringify(competitors), value("buyer_question"), createdAt, "new", createdAt,
  ).run();

  return Response.json({ ok: true, message: "Your check is saved. We’ll review the category and reply with the next step." }, { status: 202 });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setCloudflareAiBinding(env.AI);
    const url = new URL(request.url);

    const publicRateLimited = await enforcePublicRouteLimit(request, env, url.pathname);
    if (publicRateLimited) return secureResponse(publicRateLimited, url);

    if (url.pathname === "/api/leads/source-gap" && request.method === "POST") {
      const response = await handleSourceGapRequest(request, env);
      if (response) return secureResponse(response, url);
    }

    if (url.pathname === "/api/public/score" && (request.method === "GET" || request.method === "POST")) {
      return secureResponse(await handleVisibilityScore(request, env), url);
    }

    if (url.pathname === "/api/public/prompt-check" && request.method === "POST") {
      return secureResponse(await handlePromptCoverage(request, env), url);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return secureResponse(response, url);
    }

    const response = await handler.fetch(request, env, ctx);
    return secureResponse(response, url);
  },
};

// Monitoring stays inactive until SENTRY_DSN is configured as an encrypted
// host secret. This also instruments unhandled Worker errors and D1 spans.
export default Sentry.withSentry(
  (env?: Env) => env?.SENTRY_DSN ? {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || "production",
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      queryParams: false,
      httpBodies: [],
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    beforeSend: scrubSentryEvent,
  } : undefined,
  worker,
);
