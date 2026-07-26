/** Cloudflare Worker entry point for the foremention Next.js application. */
import * as Sentry from "@sentry/cloudflare";
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { intakeRateLimitsTable, sourceGapRequestsIndex, sourceGapRequestsTable } from "../db/schema";

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
  DB?: D1Database;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
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

async function initializeD1(db: D1Database) {
  await db.batch([
    db.prepare(sourceGapRequestsTable),
    db.prepare(sourceGapRequestsIndex),
    db.prepare(intakeRateLimitsTable),
  ]);
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
    const url = new URL(request.url);

    if (url.pathname === "/api/leads/source-gap" && request.method === "POST") {
      const response = await handleSourceGapRequest(request, env);
      if (response) return response;
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
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
  } : undefined,
  worker,
);
