import type { OperatingAgentId } from "@/lib/agent-os/contracts";
import { safeOperationalError } from "@/lib/collection-policy";
import { supabaseRest } from "@/lib/supabase-rest";

export const DEFAULT_REASONING_MODEL = "gpt-5.6-luna";
export const DEFAULT_REASONING_INPUT_COST_PER_MILLION_USD = 0.20;
export const DEFAULT_REASONING_OUTPUT_COST_PER_MILLION_USD = 1.20;

type ReasoningPricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

type ReservationResult = {
  id?: string;
  created?: boolean;
  reason?: string;
};

type ReasoningRunRow = {
  id: string;
  status: "running" | "complete" | "failed";
  model: string;
  output_json: unknown;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_max_cost_usd: number | string;
  actual_cost_usd: number | string | null;
  response_id: string | null;
  started_at: string;
  completed_at: string | null;
};

type OpenAIResponse = {
  id?: string;
  model?: string;
  status?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

export type StructuredReasoningSuccess<T> = {
  skipped: false;
  reasoningRunId: string;
  output: T;
  model: string;
  responseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  actualCostUsd: number | null;
  estimatedMaxCostUsd: number;
};

export type StructuredReasoningSkipped = {
  skipped: true;
  reason:
    | "disabled"
    | "openai_not_configured"
    | "pricing_not_configured"
    | "input_too_large"
    | "run_cost_cap"
    | "daily_cost_cap"
    | "already_running"
    | "previous_failure";
};

export type StructuredReasoningResult<T> = StructuredReasoningSuccess<T> | StructuredReasoningSkipped;

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalPositiveNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function reasoningEnabled() {
  return process.env.FOREMENTION_AGENT_REASONING_ENABLED === "1";
}

export function reasoningModel() {
  return String(process.env.FOREMENTION_AGENT_REASONING_MODEL || DEFAULT_REASONING_MODEL).trim();
}

export function resolveReasoningPricing(model: string): ReasoningPricing | null {
  const configuredInput = optionalPositiveNumber(process.env.FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD);
  const configuredOutput = optionalPositiveNumber(process.env.FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD);
  if (configuredInput !== null && configuredOutput !== null) {
    return { inputPerMillionUsd: configuredInput, outputPerMillionUsd: configuredOutput };
  }
  if (model === DEFAULT_REASONING_MODEL) {
    return {
      inputPerMillionUsd: DEFAULT_REASONING_INPUT_COST_PER_MILLION_USD,
      outputPerMillionUsd: DEFAULT_REASONING_OUTPUT_COST_PER_MILLION_USD,
    };
  }
  return null;
}

export function estimateReasoningCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: ReasoningPricing,
) {
  const inputCost = Math.max(0, inputTokens) * pricing.inputPerMillionUsd / 1_000_000;
  const outputCost = Math.max(0, outputTokens) * pricing.outputPerMillionUsd / 1_000_000;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

function estimatedInputTokensFromChars(chars: number) {
  // Conservative reservation for ordinary UTF-8 business text. It intentionally
  // over-reserves relative to common English tokenization instead of assuming a
  // favorable chars/token ratio.
  return Math.ceil(Math.max(0, chars) / 2);
}

function extractOutputText(raw: OpenAIResponse) {
  if (typeof raw.output_text === "string" && raw.output_text.trim()) return raw.output_text.trim();
  return (raw.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("\n")
    .trim();
}

async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadReasoningRun(id: string) {
  const rows = await supabaseRest<ReasoningRunRow[]>(
    `agent_reasoning_runs?select=id,status,model,output_json,input_tokens,output_tokens,estimated_max_cost_usd,actual_cost_usd,response_id,started_at,completed_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

async function failReasoningRun(id: string, error: unknown) {
  await supabaseRest(`agent_reasoning_runs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      status: "failed",
      error_detail: safeOperationalError(error),
      completed_at: new Date().toISOString(),
    },
  }).catch(() => undefined);
}

export async function runStructuredReasoning<T>(input: {
  organizationId: string;
  projectId: string;
  runId: string;
  agentId: OperatingAgentId;
  taskType: string;
  promptVersion: string;
  idempotencyKey: string;
  instructions: string;
  inputText: string;
  schemaName: string;
  schema: Record<string, unknown>;
  validate: (value: unknown) => T | null;
  maxOutputTokens?: number;
}): Promise<StructuredReasoningResult<T>> {
  if (!reasoningEnabled()) return { skipped: true, reason: "disabled" };
  if (!process.env.OPENAI_API_KEY) return { skipped: true, reason: "openai_not_configured" };

  const model = reasoningModel();
  const pricing = resolveReasoningPricing(model);
  if (!pricing) return { skipped: true, reason: "pricing_not_configured" };

  const maxInputChars = Math.round(positiveNumber(process.env.FOREMENTION_AGENT_REASONING_MAX_INPUT_CHARS, 18_000));
  const maxOutputTokens = Math.max(256, Math.min(4_000, Math.round(input.maxOutputTokens || 1_200)));
  if (input.inputText.length > maxInputChars) return { skipped: true, reason: "input_too_large" };

  const estimatedMaxCostUsd = estimateReasoningCostUsd(
    estimatedInputTokensFromChars(input.inputText.length + input.instructions.length),
    maxOutputTokens,
    pricing,
  );
  const maxRunCostUsd = positiveNumber(process.env.FOREMENTION_AGENT_REASONING_MAX_RUN_COST_USD, 0.01);
  if (estimatedMaxCostUsd > maxRunCostUsd) return { skipped: true, reason: "run_cost_cap" };
  const dailyCostCapUsd = positiveNumber(process.env.FOREMENTION_AGENT_REASONING_DAILY_COST_CAP_USD, 0.10);

  const inputHash = await sha256Hex(`${input.instructions}\n\n${input.inputText}`);
  const reservation = await supabaseRest<ReservationResult | null>("rpc/reserve_agent_reasoning_run", {
    method: "POST",
    serviceRole: true,
    body: {
      p_organization_id: input.organizationId,
      p_project_id: input.projectId,
      p_run_id: input.runId,
      p_agent_id: input.agentId,
      p_task_type: input.taskType,
      p_model: model,
      p_prompt_version: input.promptVersion,
      p_idempotency_key: input.idempotencyKey,
      p_input_hash: inputHash,
      p_input_chars: input.inputText.length,
      p_max_output_tokens: maxOutputTokens,
      p_estimated_max_cost_usd: estimatedMaxCostUsd,
      p_daily_cost_cap_usd: dailyCostCapUsd,
    },
  });
  if (!reservation?.id) return { skipped: true, reason: "daily_cost_cap" };

  const persisted = await loadReasoningRun(reservation.id);
  if (!persisted) throw new Error("Reserved agent reasoning run was not found.");
  if (!reservation.created) {
    if (persisted.status === "complete") {
      const output = input.validate(persisted.output_json);
      if (!output) throw new Error("Persisted agent reasoning output failed validation.");
      return {
        skipped: false,
        reasoningRunId: persisted.id,
        output,
        model: persisted.model,
        responseId: persisted.response_id,
        inputTokens: persisted.input_tokens,
        outputTokens: persisted.output_tokens,
        actualCostUsd: numberOrNull(persisted.actual_cost_usd),
        estimatedMaxCostUsd: Number(persisted.estimated_max_cost_usd),
      };
    }
    return { skipped: true, reason: persisted.status === "running" ? "already_running" : "previous_failure" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: input.instructions,
        input: input.inputText,
        max_output_tokens: maxOutputTokens,
        store: false,
        reasoning: { effort: "low" },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: input.schemaName,
            strict: true,
            schema: input.schema,
          },
        },
        safety_identifier: input.organizationId,
        prompt_cache_key: `foremention:${input.taskType}:${input.promptVersion}`,
        metadata: {
          agent_id: input.agentId,
          task_type: input.taskType.slice(0, 64),
          run_id: input.runId,
        },
      }),
    });
    const raw = await response.json() as OpenAIResponse;
    if (!response.ok) throw new Error(`OpenAI reasoning request failed with status ${response.status}.`);
    const outputText = extractOutputText(raw);
    if (!outputText) throw new Error("OpenAI reasoning response contained no structured text output.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("OpenAI reasoning response was not valid JSON.");
    }
    const output = input.validate(parsed);
    if (!output) throw new Error("OpenAI reasoning response failed Foremention schema validation.");

    const inputTokens = raw.usage?.input_tokens ?? null;
    const outputTokens = raw.usage?.output_tokens ?? null;
    const actualCostUsd = inputTokens !== null && outputTokens !== null
      ? estimateReasoningCostUsd(inputTokens, outputTokens, pricing)
      : null;
    const responseId = response.headers.get("x-request-id") || raw.id || null;

    await supabaseRest(`agent_reasoning_runs?id=eq.${encodeURIComponent(persisted.id)}`, {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        status: "complete",
        model: raw.model || model,
        response_id: responseId,
        output_json: output,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        actual_cost_usd: actualCostUsd,
        latency_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
        error_detail: null,
      },
    });

    return {
      skipped: false,
      reasoningRunId: persisted.id,
      output,
      model: raw.model || model,
      responseId,
      inputTokens,
      outputTokens,
      actualCostUsd,
      estimatedMaxCostUsd,
    };
  } catch (error) {
    await failReasoningRun(persisted.id, error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
