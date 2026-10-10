import { createOpenAiCompatibleGateway } from "@/lib/providers/openai-compatible-gateway";

export const omniRouteAdapter = createOpenAiCompatibleGateway({
  id: "omniroute",
  label: "OmniRoute",
  baseUrlEnv: "OMNIROUTE_BASE_URL",
  apiKeyEnv: "OMNIROUTE_API_KEY",
  modelEnv: "OMNIROUTE_MODEL",
  maxTokensField: "max_tokens",
});
