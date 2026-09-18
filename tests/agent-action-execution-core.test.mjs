import assert from "node:assert/strict";
import test from "node:test";
import {
  customerSuccessExecutionKey,
  supportReplyExecutionKey,
  validateCustomerSuccessExecutionAction,
  validateSupportReplyExecutionAction,
} from "../lib/agent-os/execution-core.ts";

const action = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "approved",
  agentId: "customer-success",
  actionType: "customer_success_message_draft",
  effectClass: "external_communication",
  riskLevel: "medium",
  requiresApproval: true,
  decidedAt: "2026-09-18T00:00:00.000Z",
  payload: {
    recipientUserId: "22222222-2222-4222-8222-222222222222",
    recipientEmail: "owner@example.com",
    messageSubject: "Your next Foremention step",
    messageBody: "Please review the next step in your workspace.",
    activationHref: "/app/source-map",
  },
};

test("customer success execution accepts only the exact approved action contract", () => {
  assert.deepEqual(validateCustomerSuccessExecutionAction(action), {
    recipientUserId: "22222222-2222-4222-8222-222222222222",
    recipientEmail: "owner@example.com",
    messageSubject: "Your next Foremention step",
    messageBody: "Please review the next step in your workspace.",
    activationHref: "/app/source-map",
  });
  assert.equal(validateCustomerSuccessExecutionAction({ ...action, status: "pending_approval" }), null);
  assert.equal(validateCustomerSuccessExecutionAction({ ...action, agentId: "sales" }), null);
  assert.equal(validateCustomerSuccessExecutionAction({ ...action, actionType: "anything_else" }), null);
  assert.equal(validateCustomerSuccessExecutionAction({ ...action, effectClass: "internal_write" }), null);
});

test("customer success execution rejects mutable or unsafe recipient/link payloads", () => {
  assert.equal(validateCustomerSuccessExecutionAction({
    ...action,
    payload: { ...action.payload, recipientEmail: "not-an-email" },
  }), null);
  assert.equal(validateCustomerSuccessExecutionAction({
    ...action,
    payload: { ...action.payload, activationHref: "https://evil.example/path" },
  }), null);
  assert.equal(validateCustomerSuccessExecutionAction({
    ...action,
    payload: { ...action.payload, recipientUserId: "not-a-uuid" },
  }), null);
});

test("execution key is deterministic for provider idempotency", () => {
  assert.equal(
    customerSuccessExecutionKey(action.id),
    "agent-action/customer-success-email/11111111-1111-4111-8111-111111111111/v1",
  );
  assert.throws(() => customerSuccessExecutionKey("bad-id"), /ACTION_ID_INVALID/);
});


const supportAction = {
  ...action,
  agentId: "support",
  actionType: "support_reply_draft",
  payload: {
    ticketId: "33333333-3333-4333-8333-333333333333",
    recipientUserId: "22222222-2222-4222-8222-222222222222",
    recipientEmail: "member@example.com",
    messageSubject: "Re: collection issue",
    messageBody: "We received your support request and are reviewing the recorded workspace state.",
  },
};

test("support execution accepts only the exact approved support reply contract", () => {
  assert.deepEqual(validateSupportReplyExecutionAction(supportAction), {
    ticketId: "33333333-3333-4333-8333-333333333333",
    recipientUserId: "22222222-2222-4222-8222-222222222222",
    recipientEmail: "member@example.com",
    messageSubject: "Re: collection issue",
    messageBody: "We received your support request and are reviewing the recorded workspace state.",
  });
  assert.equal(validateSupportReplyExecutionAction({ ...supportAction, status: "pending_approval" }), null);
  assert.equal(validateSupportReplyExecutionAction({ ...supportAction, agentId: "customer-success" }), null);
  assert.equal(validateSupportReplyExecutionAction({ ...supportAction, actionType: "support_diagnostic_snapshot" }), null);
  assert.equal(validateSupportReplyExecutionAction({
    ...supportAction,
    payload: { ...supportAction.payload, ticketId: "bad-ticket" },
  }), null);
});

test("support execution key is deterministic and isolated from customer success", () => {
  assert.equal(
    supportReplyExecutionKey(supportAction.id),
    "agent-action/support-reply-email/11111111-1111-4111-8111-111111111111/v1",
  );
  assert.notEqual(supportReplyExecutionKey(supportAction.id), customerSuccessExecutionKey(action.id));
});
