import {
  ProviderRequestError,
  type AnswerProviderAdapter,
  type ProviderAnswer,
  type ProviderPrompt,
  type ProviderUsage,
} from "@/lib/providers/types";

type CloudflareMessage = {
  role: "system" | "user";
  content: string;
};

export interface CloudflareAiBinding {
  run(model: string, input: {
    messages: CloudflareMessage[];
    max_tokens?: number;
    temperature?: number;
    stream?: false;
  }): Promise<unknown>;
}

type CloudflareTextResponse = {
  response?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string };
  }>;
};

const runtime = globalThis as typeof globalThis & {
  __FOREMENTION_CLOUDFLARE_AI__?: CloudflareAiBinding;
};

export function setCloudflareAiBinding(binding?: CloudflareAiBinding) {
  runtime.__FOREMENTION_CLOUDFLARE_AI__ = binding;
}

export function cloudflareAiConfigured() {
  return Boolean(runtime.__FOREMENTION_CLOUDFLARE_AI__ && process.env.CLOUDFLARE_MODEL);
}

function contentFrom(raw: CloudflareTextResponse) {
  return raw.response?.trim() || raw.choices?.[0]?.message?.content?.trim() || "";
}

function usageFrom(raw: CloudflareTextResponse): ProviderUsage | undefined {
  if (!raw.usage) return undefined;
  return {
    inputTokens: raw.usage.prompt_tokens,
    outputTokens: raw.usage.completion_tokens,
    totalTokens: raw.usage.total_tokens,
  };
}

async function runWithAbort<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return operation;
  if (signal.aborted) throw new DOMException("The provider request timed out.", "AbortError");

  let rejectAbort: ((reason: DOMException) => void) | null = null;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => rejectAbort?.(new DOMException("The provider request timed out.", "AbortError"));
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export const cloudflareAdapter: AnswerProviderAdapter = {
  id: "cloudflare",
  configured: cloudflareAiConfigured,
  async run(prompt: ProviderPrompt, options): Promise<ProviderAnswer> {
    const binding = runtime.__FOREMENTION_CLOUDFLARE_AI__;
    const model = process.env.CLOUDFLARE_MODEL;
    if (!binding || !model) {
      throw new ProviderRequestError("Cloudflare Workers AI", 503, "The Worker AI binding or explicit model is unavailable.");
    }

    const started = Date.now();
    let raw: CloudflareTextResponse;
    try {
      raw = await runWithAbort(
        binding.run(model, {
          messages: [
            {
              role: "system",
              content: "Answer the buyer question directly and concisely. You do not have live web research in this collection. Do not invent citations, URLs, companies, product claims, or current facts. State uncertainty when the answer requires evidence you do not have.",
            },
            { role: "user", content: prompt.text },
          ],
          max_tokens: options.maxOutputTokens,
          temperature: 0.2,
          stream: false,
        }) as Promise<CloudflareTextResponse>,
        options.signal,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      const detail = error instanceof Error ? error.message : "The model request failed.";
      throw new ProviderRequestError("Cloudflare Workers AI", 502, detail);
    }

    const answer = contentFrom(raw);
    if (!answer) throw new ProviderRequestError("Cloudflare Workers AI", 502, "The model returned no answer text.");
    const usage = usageFrom(raw);
    const finishReason = raw.choices?.[0]?.finish_reason;

    return {
      provider: "cloudflare",
      model,
      promptId: prompt.promptId,
      answer,
      citations: [],
      raw: { model, grounded: false, citationCount: 0, finishReason, usage },
      collectedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage,
      finishReason,
    };
  },
};
