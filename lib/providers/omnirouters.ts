import { createOpenAiCompatibleGateway } from "@/lib/providers/openai-compatible-gateway";

export const omniRoutersAdapter = createOpenAiCompatibleGateway({
  id: "omnirouters",
  label: "OmniRouters",
  endpoint: "https://omnirouters.com/v1/chat/completions",
  apiKeyEnv: "OMNIROUTERS_API_KEY",
  modelEnv: "OMNIROUTERS_MODEL",
  maxTokensField: "max_tokens",
});
