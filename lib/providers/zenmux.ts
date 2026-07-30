import { createOpenAiCompatibleGateway } from "@/lib/providers/openai-compatible-gateway";

export const zenMuxAdapter = createOpenAiCompatibleGateway({
  id: "zenmux",
  label: "ZenMux",
  endpoint: "https://zenmux.ai/api/v1/chat/completions",
  apiKeyEnv: "ZENMUX_API_KEY",
  modelEnv: "ZENMUX_MODEL",
  maxTokensField: "max_completion_tokens",
});
