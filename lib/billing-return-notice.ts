/**
 * Chat03 (A02): copy for the post-checkout return. A redirect query such as
 * ?billing=success is client-controlled and NEVER evidence of payment; paid
 * access is shown only when the server-side entitlement says so.
 */
/** Paid access is never inferred from a redirect query (Chat03, A02). */
export function billingReturnNotice(search: string, status: { packageKey: string; entitlementStatus: string; state: string }) {
  const returned = new URLSearchParams(search).get("billing");
  const paid = status.packageKey !== "private_beta" && status.entitlementStatus === "active" && status.state === "active";
  if (returned === "success" && !paid) {
    return "Checkout returned. Payment confirmation is pending: paid access starts only after Paddle's signed payment confirmation is verified by Foremention, which can take a few minutes.";
  }
  if (returned === "success" && paid) return "Payment confirmed by a verified billing event.";
  if (returned === "cancelled") return "Checkout was not completed. No paid access was granted.";
  if (returned === "unavailable") return "Online checkout is temporarily unavailable. No payment was taken. Email hello@foremention.com and we will set up your subscription.";
  if (returned === "retry") return "Checkout could not be opened. No payment was taken. Try again in about 10 minutes, or email hello@foremention.com.";
  if (returned === "pending") return "An earlier checkout is still open. Finish it, or try again later once it expires. No payment was taken.";
  if (returned === "processing") return "Your earlier checkout was paid and is being confirmed. Paid access appears in a few minutes.";
  return null;
}
