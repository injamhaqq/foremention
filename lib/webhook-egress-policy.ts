import { validatePublicSourceUrl } from "./source-inspection.ts";

/**
 * Operator-controlled outbound destinations for workspace webhooks.
 * An unset, malformed, or partly malformed allowlist fails closed.
 * Do not treat DNS validation alone as protection from rebinding.
 */
export function approvedWorkspaceWebhookOrigins(raw = process.env.WORKSPACE_WEBHOOK_ALLOWED_ORIGINS || ""): ReadonlySet<string> {
  if (!raw.trim()) return new Set();
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.some((part) => !part || part.includes("*"))) return new Set();
  const origins = new Set<string>();
  try {
    for (const part of parts) {
      const url = validatePublicSourceUrl(part);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
        return new Set();
      }
      origins.add(url.origin);
    }
  } catch {
    return new Set();
  }
  return origins;
}

export function workspaceWebhookDeliveryEnabled() {
  return approvedWorkspaceWebhookOrigins().size > 0;
}

export function assertApprovedWorkspaceWebhookDestination(value: string): string {
  const url = validatePublicSourceUrl(value.trim());
  if (url.protocol !== "https:" || !approvedWorkspaceWebhookOrigins().has(url.origin)) {
    throw new Error("Workspace webhook destination is not enabled for this deployment.");
  }
  return url.toString();
}
