/**
 * The seller behind Foremention, as named in Terms, Privacy, Refunds and the DPA.
 *
 * NEEDS INJAM: the three values below are placeholders. Only the founder can
 * supply the registered legal entity name, its registered address and the
 * governing law / courts. Replace the placeholder strings here and nowhere
 * else; every legal page reads them through this module. Do not guess them.
 *
 * Until they are replaced, pages render the placeholder text visibly in square
 * brackets so nobody mistakes it for a real entity, and
 * `legalEntityComplete()` returns false.
 *
 * All legal copy must be reviewed by a lawyer before it is relied on.
 */
const PLACEHOLDER_PREFIX = "NEEDS_INJAM:";

export const LEGAL_ENTITY_NAME = `${PLACEHOLDER_PREFIX} registered legal entity name`;
export const LEGAL_ENTITY_ADDRESS = `${PLACEHOLDER_PREFIX} registered business address`;
export const GOVERNING_LAW = `${PLACEHOLDER_PREFIX} governing law and courts`;

/** Public trading name and contact, already used across the site. */
export const TRADING_NAME = "Foremention";
export const LEGAL_CONTACT_EMAIL = "hello@foremention.com";

/** Paddle.com is the merchant of record for online orders (lib/paddle-billing.ts, /refund-policy). */
export const MERCHANT_OF_RECORD = "Paddle.com";

export function isLegalPlaceholder(value: string) {
  return value.startsWith(PLACEHOLDER_PREFIX);
}

/** Text safe to render: a real value as-is, a placeholder as a visible bracketed gap. */
export function legalValue(value: string) {
  return isLegalPlaceholder(value) ? `[${value.slice(PLACEHOLDER_PREFIX.length).trim()} to be confirmed]` : value;
}

export function legalEntityComplete() {
  return ![LEGAL_ENTITY_NAME, LEGAL_ENTITY_ADDRESS, GOVERNING_LAW].some(isLegalPlaceholder);
}

/** "Foremention is operated by <entity>, <address>." */
export function sellerSentence() {
  return `${TRADING_NAME} is operated by ${legalValue(LEGAL_ENTITY_NAME)}, ${legalValue(LEGAL_ENTITY_ADDRESS)} ("${TRADING_NAME}", "we", "us").`;
}
