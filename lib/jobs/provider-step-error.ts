import { NonRetriableError } from "inngest";
import { ProviderRequestError } from "../providers/types.ts";

export function toInngestProviderStepError(error: unknown): unknown {
  if (error instanceof ProviderRequestError && !error.retryable) {
    return new NonRetriableError(error.message, { cause: error });
  }
  return error;
}
