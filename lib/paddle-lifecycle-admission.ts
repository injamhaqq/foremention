/**
 * Admit Paddle subscription lifecycle changes only for an established,
 * provider-bound billing account. Checkout metadata is a correlation hint,
 * never authorization to pause or cancel another organization's access.
 *
 * Used after Paddle signature verification and before atomic ledger mutation.
 * If a webhook arrives before the completed purchase was recorded, refuse it
 * so Paddle can retry after reconciliation rather than accepting an orphan.
 */
export type PaddleBillingIdentity = {
  organization_id: string;
  external_customer_id: string | null;
  external_subscription_id: string | null;
};

const PADDLE_CUSTOMER_ID = /^ctm_[a-z0-9]{26}$/;
const PADDLE_SUBSCRIPTION_ID = /^sub_[a-z0-9]{26}$/;

export function paddleSubscriptionIdentityMatches(
  rows: readonly PaddleBillingIdentity[],
  organizationId: string,
  customerId: string | null | undefined,
  subscriptionId: string | null | undefined,
): boolean {
  return Boolean(
    PADDLE_CUSTOMER_ID.test(customerId || "")
    && PADDLE_SUBSCRIPTION_ID.test(subscriptionId || "")
    && rows.length === 1
    && rows[0].organization_id === organizationId
    && rows[0].external_customer_id === customerId
    && rows[0].external_subscription_id === subscriptionId,
  );
}
