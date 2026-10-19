// Fix track "ux" (2026-10-19): the one in-app support address. It reuses the
// verified public contact channel already used across the product (footer,
// security policy, checkout and account-help copy); no new address is invented.
import { ACCOUNT_HELP_EMAIL } from "./workspace-setup-state.ts";

export const SUPPORT_EMAIL: string = ACCOUNT_HELP_EMAIL;

export function supportMailtoHref(subject = "Foremention support") {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
