/**
 * Client-side JSON reader for app API calls (#504).
 *
 * On the Workers Free plan an over-budget request is terminated by the edge
 * (Error 1102, "exceededResources") and answered with an HTML 503 page instead
 * of the route's JSON. Parsing that as JSON used to surface a raw
 * "Unexpected token '<'" message. This reader returns a plain, transient
 * message for any non-JSON or 5xx edge response; callers keep the user's
 * typed input because they only clear it after a successful response.
 */
export const TRANSIENT_EDGE_MESSAGE = "Foremention was briefly unavailable, so this change may not have been saved. Your text is still here; refresh the list to check, then submit again if it is missing.";

export async function readApiJson<T extends { error?: string }>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: response.ok ? "Unexpected response from Foremention." : TRANSIENT_EDGE_MESSAGE } as T;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return { error: TRANSIENT_EDGE_MESSAGE } as T;
  }
}
