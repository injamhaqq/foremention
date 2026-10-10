/**
 * Analytics transport is not the authority for a saved design-partner intake.
 *
 * This event is reserved for an approved server-side receipt emitted only after
 * the first-party database confirms a newly persisted application. An anonymous
 * browser can alter URLs, DOM state and capture payloads; none proves a write.
 *
 * Keeping this rule separate from the shared event sanitizer prevents client
 * telemetry from silently redefining an authoritative commercial milestone.
 */
const SERVER_VERIFIED_EVENTS = new Set([
  "design_partner_application_submitted",
]);

export function isServerVerifiedProductEvent(event: string): boolean {
  return SERVER_VERIFIED_EVENTS.has(event);
}
