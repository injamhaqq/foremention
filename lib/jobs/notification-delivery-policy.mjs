/**
 * Alert destinations are app-internal paths; no supplied href can redirect a
 * workspace recipient to another origin, even through URL normalization.
 * This does not replace server-side authorization on the destination route.
 *
 * @param {string} href
 * @param {string} siteUrl
 */
export function approvedWorkspaceAlertUrl(href, siteUrl) {
  if (typeof href !== "string" || !/^\\/app(?:[/?#]|$)/.test(href) || /[\\\\\\u0000-\\u001f\\u007f]/.test(href)) {
    throw new Error("Workspace alerts must link to an internal app route.");
  }
  const site = new URL(siteUrl);
  if ((site.protocol !== "https:" && !(site.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)))
    || site.username || site.password || site.search || site.hash) {
    throw new Error("The Foremention alert origin is not approved.");
  }
  const url = new URL(href, site);
  if (url.origin !== site.origin || !(url.pathname === "/app" || url.pathname.startsWith("/app/"))) {
    throw new Error("Workspace alert destinations must remain on this application's routes.");
  }
  return url.toString();
}

/**
 * Stable provider-level idempotency across uncertain acknowledgement.
 * This is not an assertion of exactly-once delivery: the provider's
 * retention window and receipt recovery remain external gates.
 *
 * @param {string} deliveryId Postgres UUID of the immutable delivery row
 */
export function workspaceAlertIdempotencyKey(deliveryId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deliveryId)) {
    throw new Error("A persisted alert delivery ID is required.");
  }
  return `foremention-alert:${deliveryId.toLowerCase()}`;
}
