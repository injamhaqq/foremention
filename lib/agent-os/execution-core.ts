const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CustomerSuccessExecutionPayload = {
  recipientUserId: string;
  recipientEmail: string;
  messageSubject: string;
  messageBody: string;
  activationHref: string;
};

export function customerSuccessExecutionKey(actionId: string) {
  if (!UUID_PATTERN.test(actionId)) throw new Error("AGENT_EXECUTION_ACTION_ID_INVALID");
  return `agent-action/customer-success-email/${actionId.toLowerCase()}/v1`;
}

export function validateCustomerSuccessExecutionAction(input: {
  id: string;
  status: string;
  agentId: string;
  actionType: string;
  effectClass: string;
  riskLevel: string;
  requiresApproval: boolean;
  decidedAt: string | null;
  payload: Record<string, unknown>;
}): CustomerSuccessExecutionPayload | null {
  if (
    !UUID_PATTERN.test(input.id)
    || input.status !== "approved"
    || input.agentId !== "customer-success"
    || input.actionType !== "customer_success_message_draft"
    || input.effectClass !== "external_communication"
    || input.riskLevel !== "medium"
    || input.requiresApproval !== true
    || !input.decidedAt
  ) return null;

  const recipientUserId = typeof input.payload.recipientUserId === "string"
    ? input.payload.recipientUserId.trim().toLowerCase()
    : "";
  const recipientEmail = typeof input.payload.recipientEmail === "string"
    ? input.payload.recipientEmail.trim().toLowerCase()
    : "";
  const messageSubject = typeof input.payload.messageSubject === "string"
    ? input.payload.messageSubject.replace(/[\r\n]+/g, " ").trim()
    : "";
  const messageBody = typeof input.payload.messageBody === "string"
    ? input.payload.messageBody.trim()
    : "";
  const activationHref = typeof input.payload.activationHref === "string"
    ? input.payload.activationHref.trim()
    : "";

  if (
    !UUID_PATTERN.test(recipientUserId)
    || !EMAIL_PATTERN.test(recipientEmail)
    || !messageSubject
    || messageSubject.length > 120
    || !messageBody
    || messageBody.length > 1400
    || !activationHref.startsWith("/app")
    || activationHref.includes("\\")
    || activationHref.includes("\r")
    || activationHref.includes("\n")
  ) return null;

  return {
    recipientUserId,
    recipientEmail,
    messageSubject,
    messageBody,
    activationHref,
  };
}


export type SupportReplyExecutionPayload = {
  ticketId: string;
  recipientUserId: string;
  recipientEmail: string;
  messageSubject: string;
  messageBody: string;
};

export function supportReplyExecutionKey(actionId: string) {
  if (!UUID_PATTERN.test(actionId)) throw new Error("AGENT_EXECUTION_ACTION_ID_INVALID");
  return `agent-action/support-reply-email/${actionId.toLowerCase()}/v1`;
}

export function validateSupportReplyExecutionAction(input: {
  id: string;
  status: string;
  agentId: string;
  actionType: string;
  effectClass: string;
  riskLevel: string;
  requiresApproval: boolean;
  decidedAt: string | null;
  payload: Record<string, unknown>;
}): SupportReplyExecutionPayload | null {
  if (
    !UUID_PATTERN.test(input.id)
    || input.status !== "approved"
    || input.agentId !== "support"
    || input.actionType !== "support_reply_draft"
    || input.effectClass !== "external_communication"
    || input.riskLevel !== "medium"
    || input.requiresApproval !== true
    || !input.decidedAt
  ) return null;

  const ticketId = typeof input.payload.ticketId === "string"
    ? input.payload.ticketId.trim().toLowerCase()
    : "";
  const recipientUserId = typeof input.payload.recipientUserId === "string"
    ? input.payload.recipientUserId.trim().toLowerCase()
    : "";
  const recipientEmail = typeof input.payload.recipientEmail === "string"
    ? input.payload.recipientEmail.trim().toLowerCase()
    : "";
  const messageSubject = typeof input.payload.messageSubject === "string"
    ? input.payload.messageSubject.replace(/[\r\n]+/g, " ").trim()
    : "";
  const messageBody = typeof input.payload.messageBody === "string"
    ? input.payload.messageBody.trim()
    : "";

  if (
    !UUID_PATTERN.test(ticketId)
    || !UUID_PATTERN.test(recipientUserId)
    || !EMAIL_PATTERN.test(recipientEmail)
    || !messageSubject
    || messageSubject.length > 120
    || !messageBody
    || messageBody.length > 1800
  ) return null;

  return {
    ticketId,
    recipientUserId,
    recipientEmail,
    messageSubject,
    messageBody,
  };
}
