/**
 * A unique webhook event ID is not proof of completed processing.
 *
 * After an ON CONFLICT DO NOTHING insert, PostgREST returns no inserted row
 * both for a processed duplicate and for a pending receipt left by an
 * interrupted handler. Only a matching processed receipt may receive 2xx.
 * All other outcomes must remain retryable, without granting access twice.
 */
export type ExistingBillingReceipt = {
  provider: string;
  event_id: string;
  organization_id: string;
  processed_at: string | null;
};

export function isProcessedBillingReceipt(
  rows: readonly ExistingBillingReceipt[],
  expected: { provider: string; eventId: string; organizationId: string },
): boolean {
  if (rows.length !== 1) return false;
  const receipt = rows[0];
  return receipt.provider === expected.provider
    && receipt.event_id === expected.eventId
    && receipt.organization_id === expected.organizationId
    && typeof receipt.processed_at === "string"
    && Number.isFinite(new Date(receipt.processed_at).getTime());
}
