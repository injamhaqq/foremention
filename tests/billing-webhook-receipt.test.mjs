import test from "node:test";
import assert from "node:assert/strict";
import { isProcessedBillingReceipt } from "../lib/billing-webhook-receipt.ts";

const expected = {
  provider: "paddle",
  eventId: "evt_" + "e".repeat(26),
  organizationId: "11111111-1111-4111-8111-111111111111",
};
const receipt = {
  provider: expected.provider,
  event_id: expected.eventId,
  organization_id: expected.organizationId,
  processed_at: "2026-10-16T00:00:01.000Z",
};

test("exactly one matching, processed receipt is the only safe duplicate", () => {
  assert.equal(isProcessedBillingReceipt([receipt], expected), true);
});
test("an unprocessed receipt must not be acknowledged as a completed duplicate", () => {
  assert.equal(isProcessedBillingReceipt([{ ...receipt, processed_at: null }], expected), false);
});
test("a missing or ambiguous prior receipt cannot be acknowledged", () => {
  assert.equal(isProcessedBillingReceipt([], expected), false);
  assert.equal(isProcessedBillingReceipt([receipt, receipt], expected), false);
});
test("tenant mismatch must never confirm processing", () => {
  const wrong = { ...receipt, organization_id: "99999999-9999-4999-8999-999999999999" };
  assert.equal(isProcessedBillingReceipt([wrong], expected), false);
});
test("event ID and billing provider must match the same receipt", () => {
  assert.equal(isProcessedBillingReceipt([{ ...receipt, event_id: "evt_" + "f".repeat(26) }], expected), false);
  assert.equal(isProcessedBillingReceipt([{ ...receipt, provider: "creem" }], expected), false);
});
test("invalid processed timestamps never prove completed processing", () => {
  for (const value of ["", "invalid", "not a time"]) {
    assert.equal(isProcessedBillingReceipt([{ ...receipt, processed_at: value }], expected), false);
  }
});
test("do not confuse receipt presence with another organization's applied state", () => {
  assert.equal(isProcessedBillingReceipt([{ ...receipt, organization_id: expected.organizationId }], {
    ...expected, organizationId: "99999999-9999-4999-8999-999999999999",
  }), false);
});
