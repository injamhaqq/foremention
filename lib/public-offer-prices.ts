/**
 * Client-safe part of the public offer (no imports, no environment reads), so
 * client components such as Settings → Billing can use it. lib/public-offer.ts
 * builds the full offer from these values; tests/claims-offer-consistency
 * asserts they agree.
 */
export const CORE_MONTHLY_PRICE = "$99 / month";
export const SIGNAL_MONTHLY_PRICE = "$299 / month";
export const MONEY_BACK_DAYS = 7;

/** Short line for checkout surfaces once a visitor is already buying. */
export const CHECKOUT_TERMS_LINE =
  `Monthly prices: Core ${CORE_MONTHLY_PRICE.replace(" / month", "")}, Signal ${SIGNAL_MONTHLY_PRICE.replace(" / month", "")} (USD). ` +
  "Paddle, our merchant of record, shows the final price, billing interval and any tax before you pay. " +
  `${MONEY_BACK_DAYS}-day money-back guarantee on your company's first payment. Cancel anytime.`;
