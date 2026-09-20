import type { ProviderCitation } from "./types";

type ToolCall = {
  name?: unknown;
  arguments?: unknown;
  function?: {
    name?: unknown;
    arguments?: unknown;
  };
};

type ToolCallResponse = {
  tool_calls?: ToolCall[];
  choices?: Array<{
    message?: {
      tool_calls?: ToolCall[];
    };
  }>;
};

export type GroundedFunctionSelection =
  | { ok: true; answer: string; citations: ProviderCitation[] }
  | { ok: false; error: string };

function parseToolArguments(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function selectGroundedFunctionCall(raw: ToolCallResponse, available: ProviderCitation[]): GroundedFunctionSelection {
  const calls = [
    ...(Array.isArray(raw.tool_calls) ? raw.tool_calls : []),
    ...((raw.choices || []).flatMap((choice) => Array.isArray(choice.message?.tool_calls) ? choice.message.tool_calls : [])),
  ];
  const call = calls.find((candidate) => {
    const name = typeof candidate.name === "string"
      ? candidate.name
      : typeof candidate.function?.name === "string"
        ? candidate.function.name
        : "";
    return name === "recordGroundedAnswer";
  });
  if (!call) return { ok: false, error: "The grounded model did not return the required structured evidence selection." };

  const args = parseToolArguments(call.arguments ?? call.function?.arguments);
  const answer = typeof args?.answer === "string" ? args.answer.trim() : "";
  const sourceIndexes = Array.isArray(args?.source_indexes) ? args.source_indexes : [];
  if (!answer) return { ok: false, error: "The grounded model returned no structured answer text." };
  if (!sourceIndexes.length || sourceIndexes.some((index) => !Number.isInteger(index) || Number(index) < 1 || Number(index) > available.length)) {
    return { ok: false, error: "The grounded model selected an invalid retrieved source index." };
  }

  const uniqueIndexes = Array.from(new Set(sourceIndexes.map(Number)));
  return {
    ok: true,
    answer,
    citations: uniqueIndexes.map((index) => available[index - 1]),
  };
}
