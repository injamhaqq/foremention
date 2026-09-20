import { freeOnlyProviderMode, providerAllowedForLiveCollection } from "./free-provider-mode.ts";
import type { ProviderId } from "@/lib/providers/types";

const ALLOWED_PROVIDERS = new Set<ProviderId>([
  "groq",
  "perplexity",
  "gemini",
  "openai",
  "openrouter",
  "anthropic",
  "cloudflare",
  "zenmux",
  "omnirouters",
]);
const DEFAULT_PROVIDER_ORDER: ProviderId[] = ["cloudflare", "gemini", "groq", "perplexity", "openai", "openrouter"];
const MAX_QUESTIONS = 5;
const MIN_QUESTIONS = 3;
const MAX_PROVIDERS = 2;

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeDomain(value: unknown) {
  const raw = cleanText(value, 300);
  if (!raw) throw new Error("A domain is required.");
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const hostname = url.hostname.toLocaleLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    if (!hostname || hostname.length > 253 || !hostname.includes(".")) throw new Error("invalid");
    return hostname;
  } catch {
    throw new Error("Enter a valid company domain.");
  }
}

function parseProviders(value: unknown): ProviderId[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("Providers must be an array.");
  const providers = Array.from(new Set(value.map((item) => cleanText(item, 40) as ProviderId).filter(Boolean)));
  if (providers.length > MAX_PROVIDERS) throw new Error(`Use at most ${MAX_PROVIDERS} providers for a mini-audit.`);
  for (const provider of providers) {
    if (!ALLOWED_PROVIDERS.has(provider)) throw new Error(`Unsupported provider: ${provider}`);
  }
  return providers;
}

export type OutreachMiniAuditInput = {
  brand: string;
  domain: string;
  questions: string[];
  competitors: string[];
  providers: ProviderId[];
  locale?: string;
};

export type OutreachMiniAuditCitation = {
  url: string;
  title?: string;
};

export type OutreachMiniAuditObservation = {
  provider: ProviderId;
  model?: string;
  status: "ok" | "error";
  answer?: string;
  citations: OutreachMiniAuditCitation[];
  brandMentioned?: boolean;
  domainCited?: boolean;
  competitorMentions?: string[];
  collectedAt?: string;
  errorCode?: string;
};

export type OutreachMiniAuditResult = {
  brand: string;
  domain: string;
  collectedAt: string;
  questions: Array<{
    question: string;
    observations: OutreachMiniAuditObservation[];
  }>;
};

export function parseOutreachMiniAuditInput(input: unknown): OutreachMiniAuditInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Mini-audit input must be an object.");
  const record = input as Record<string, unknown>;
  const brand = cleanText(record.brand, 160);
  if (brand.length < 2) throw new Error("A brand name is required.");
  const domain = normalizeDomain(record.domain);
  if (!Array.isArray(record.questions)) throw new Error("Questions are required.");
  if (record.questions.length > MAX_QUESTIONS) throw new Error("A mini-audit accepts a maximum of five questions.");
  const questions = Array.from(new Set(record.questions.map((item) => cleanText(item, 500)).filter(Boolean)));
  if (questions.length < MIN_QUESTIONS) throw new Error("Provide at least three buyer questions.");
  if (questions.length > MAX_QUESTIONS) throw new Error("A mini-audit accepts a maximum of five questions.");
  const competitors = Array.isArray(record.competitors)
    ? Array.from(new Set(record.competitors.map((item) => cleanText(item, 160)).filter(Boolean))).slice(0, 5)
    : [];
  const providers = parseProviders(record.providers);
  if (freeOnlyProviderMode() && providers.some((provider) => provider !== "mock" && !providerAllowedForLiveCollection(provider))) {
    throw new Error("Foremention free-only mode permits only grounded Cloudflare Workers AI with Bing Search RSS for outreach mini-audits.");
  }
  const locale = cleanText(record.locale, 40) || undefined;
  return { brand, domain, questions, competitors, providers, locale };
}

function answerMentions(answer: string, candidate: string) {
  const normalizedAnswer = answer.toLocaleLowerCase();
  const normalizedCandidate = candidate.trim().toLocaleLowerCase();
  if (!normalizedCandidate) return false;
  return normalizedAnswer.includes(normalizedCandidate);
}

function citationMatchesDomain(urlValue: string, domain: string) {
  try {
    const hostname = new URL(urlValue).hostname.toLocaleLowerCase().replace(/^www\./, "");
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string") {
    return String((error as { code: string }).code).slice(0, 80);
  }
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  return "provider_error";
}

async function configuredProviders(input: OutreachMiniAuditInput) {
  const { getProvider } = await import("@/lib/providers/index");
  const requested = input.providers.length
    ? input.providers
    : (process.env.OUTREACH_MINI_AUDIT_PROVIDERS || "")
      .split(",")
      .map((value) => value.trim() as ProviderId)
      .filter((value) => ALLOWED_PROVIDERS.has(value));
  const candidates = (requested.length ? requested : DEFAULT_PROVIDER_ORDER)
    .filter((providerId) => providerId === "mock" || providerAllowedForLiveCollection(providerId))
    .slice(0, MAX_PROVIDERS);
  const result: Array<ReturnType<typeof getProvider>> = [];
  for (const providerId of candidates) {
    try {
      result.push(getProvider(providerId));
    } catch {
      // A private outreach audit should degrade gracefully when one provider is not configured.
    }
  }
  if (!result.length) throw new Error("No outreach mini-audit provider is configured.");
  return result;
}

export async function runOutreachMiniAudit(inputValue: unknown): Promise<OutreachMiniAuditResult> {
  const input = parseOutreachMiniAuditInput(inputValue);
  const providers = await configuredProviders(input);
  const collectedAt = new Date().toISOString();
  const questions = [] as OutreachMiniAuditResult["questions"];

  for (let questionIndex = 0; questionIndex < input.questions.length; questionIndex += 1) {
    const question = input.questions[questionIndex];
    const observations = await Promise.all(providers.map(async (provider): Promise<OutreachMiniAuditObservation> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const answer = await provider.run({
          promptId: `outreach-${questionIndex + 1}`,
          text: question,
          locale: input.locale,
        }, {
          signal: controller.signal,
          maxOutputTokens: 900,
        });
        const citations = answer.citations.slice(0, 12).map((citation) => ({
          url: citation.url,
          ...(citation.title ? { title: citation.title } : {}),
        }));
        return {
          provider: answer.provider,
          model: answer.model,
          status: "ok",
          answer: answer.answer.slice(0, 12_000),
          citations,
          brandMentioned: answerMentions(answer.answer, input.brand),
          domainCited: citations.some((citation) => citationMatchesDomain(citation.url, input.domain)),
          competitorMentions: input.competitors.filter((competitor) => answerMentions(answer.answer, competitor)),
          collectedAt: answer.collectedAt,
        };
      } catch (error) {
        return {
          provider: provider.id,
          status: "error",
          citations: [],
          errorCode: errorCode(error),
        };
      } finally {
        clearTimeout(timeout);
      }
    }));
    questions.push({ question, observations });
  }

  return { brand: input.brand, domain: input.domain, collectedAt, questions };
}
