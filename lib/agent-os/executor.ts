import { loadAgentAction } from "@/lib/agent-os/actions";
import {
  customerSuccessExecutionKey,
  supportReplyExecutionKey,
  validateCustomerSuccessExecutionAction,
  validateSupportReplyExecutionAction,
} from "@/lib/agent-os/execution-core";
import {
  ApplicationEmailSendUncertainError,
  sendProductAlertEmail,
} from "@/lib/application-email";
import { createEmailUnsubscribeToken } from "@/lib/email-unsubscribe";
import { supabaseRest } from "@/lib/supabase-rest";

type ClaimResult = {
  id?: string;
  created?: boolean;
  status?: string;
  reason?: string;
};

type FinishResult = {
  id?: string;
  status?: string;
  actionStatus?: string;
  changed?: boolean;
};

type MembershipRow = {
  user_id: string;
  member_email: string | null;
  role: string;
};

type PreferenceRow = {
  email_enabled: boolean;
  unsubscribed_at: string | null;
};

type SupportTicketRow = {
  id: string;
  requester_id: string;
  requester_email: string;
  status: string;
};

async function finishExecution(input: {
  actionId: string;
  status: "succeeded" | "failed" | "blocked" | "uncertain";
  provider?: string | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  result?: Record<string, unknown>;
}) {
  return supabaseRest<FinishResult | null>("rpc/finish_agent_action_execution", {
    method: "POST",
    serviceRole: true,
    body: {
      p_action_id: input.actionId,
      p_status: input.status,
      p_provider: input.provider || null,
      p_provider_message_id: input.providerMessageId || null,
      p_error_code: input.errorCode || null,
      p_result_json: input.result || {},
    },
  });
}

async function auditExecution(input: {
  organizationId: string;
  actorId: string;
  actionId: string;
  status: string;
  code?: string | null;
}) {
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: `agent_action.execution_${input.status}`,
      entity_type: "agent_action",
      entity_id: input.actionId,
      before_state: { status: "executing" },
      after_state: {
        execution_status: input.status,
        error_code: input.code || null,
      },
    },
  }).catch(() => undefined);
}

async function blockExecution(input: {
  actionId: string;
  organizationId: string;
  actorId: string;
  code: string;
}) {
  await finishExecution({
    actionId: input.actionId,
    status: "blocked",
    errorCode: input.code,
    result: { externalEffect: false },
  });
  await auditExecution({
    organizationId: input.organizationId,
    actorId: input.actorId,
    actionId: input.actionId,
    status: "blocked",
    code: input.code,
  });
  return { status: "blocked" as const, code: input.code, duplicate: false };
}

export async function executeApprovedAgentAction(actionId: string, actorId: string) {
  const action = await loadAgentAction(actionId);
  if (!action) throw new Error("AGENT_EXECUTION_ACTION_NOT_FOUND");
  if (!action.organizationId) throw new Error("AGENT_EXECUTION_ORGANIZATION_REQUIRED");
  const organizationId = action.organizationId;

  if (action.execution) {
    return {
      status: action.execution.status,
      code: action.execution.errorCode,
      providerMessageId: action.execution.providerMessageId,
      duplicate: true,
    };
  }

  const actionInput = { ...action, payload: action.payload || {} };
  const customerSuccessPayload = validateCustomerSuccessExecutionAction(actionInput);
  const supportPayload = validateSupportReplyExecutionAction(actionInput);
  if (!customerSuccessPayload && !supportPayload) {
    throw new Error("AGENT_EXECUTION_ACTION_NOT_EXECUTABLE");
  }
  const supportReply = Boolean(supportPayload);
  const approvedPayload = supportPayload || customerSuccessPayload!;
  const executionKey = supportPayload
    ? supportReplyExecutionKey(action.id)
    : customerSuccessExecutionKey(action.id);

  const claim = await supabaseRest<ClaimResult | null>("rpc/claim_agent_action_execution", {
    method: "POST",
    serviceRole: true,
    body: {
      p_action_id: action.id,
      p_execution_key: executionKey,
    },
  });
  if (!claim?.created) {
    const refreshed = await loadAgentAction(action.id);
    return {
      status: refreshed?.execution?.status || claim?.status || "blocked",
      code: refreshed?.execution?.errorCode || claim?.reason || "already_claimed",
      providerMessageId: refreshed?.execution?.providerMessageId || null,
      duplicate: true,
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const unsubscribeSecret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return blockExecution({
      actionId: action.id,
      organizationId,
      actorId,
      code: "application_email_not_configured",
    });
  }
  if (!supportReply && !siteUrl) {
    return blockExecution({
      actionId: action.id,
      organizationId,
      actorId,
      code: "site_url_not_configured",
    });
  }
  if (!supportReply && (!unsubscribeSecret || unsubscribeSecret.length < 32)) {
    return blockExecution({
      actionId: action.id,
      organizationId,
      actorId,
      code: "unsubscribe_not_configured",
    });
  }

  if (supportPayload) {
    let ticket: SupportTicketRow | undefined;
    try {
      const rows = await supabaseRest<SupportTicketRow[]>(
        `support_tickets?select=id,requester_id,requester_email,status&id=eq.${encodeURIComponent(supportPayload.ticketId)}&organization_id=eq.${encodeURIComponent(organizationId)}&limit=1`,
        { serviceRole: true },
      );
      ticket = rows[0];
    } catch {
      await finishExecution({
        actionId: action.id,
        status: "failed",
        errorCode: "support_ticket_preflight_failed",
        result: { externalEffect: false },
      }).catch(() => undefined);
      throw new Error("AGENT_EXECUTION_SUPPORT_TICKET_PREFLIGHT_FAILED");
    }

    if (
      !ticket
      || ticket.status !== "reply_pending"
      || ticket.requester_id !== supportPayload.recipientUserId
      || ticket.requester_email.trim().toLowerCase() !== supportPayload.recipientEmail
    ) {
      return blockExecution({
        actionId: action.id,
        organizationId,
        actorId,
        code: "support_ticket_changed",
      });
    }
  }

  let membership: MembershipRow | undefined;
  try {
    const rows = await supabaseRest<MembershipRow[]>(
      `organization_members?select=user_id,member_email,role&organization_id=eq.${encodeURIComponent(organizationId)}&user_id=eq.${encodeURIComponent(approvedPayload.recipientUserId)}&limit=1`,
      { serviceRole: true },
    );
    membership = rows[0];
  } catch {
    await finishExecution({
      actionId: action.id,
      status: "failed",
      errorCode: "recipient_preflight_failed",
      result: { externalEffect: false },
    }).catch(() => undefined);
    throw new Error("AGENT_EXECUTION_RECIPIENT_PREFLIGHT_FAILED");
  }

  if (!membership) {
    return blockExecution({
      actionId: action.id,
      organizationId,
      actorId,
      code: supportReply ? "recipient_not_member" : "recipient_not_owner",
    });
  }
  if (!supportReply && membership.role !== "owner") {
    return blockExecution({
      actionId: action.id,
      organizationId,
      actorId,
      code: "recipient_not_owner",
    });
  }

  const currentEmail = membership.member_email?.trim().toLowerCase() || "";
  if (!currentEmail || currentEmail !== approvedPayload.recipientEmail) {
    return blockExecution({
      actionId: action.id,
      organizationId,
      actorId,
      code: "recipient_changed",
    });
  }

  let text: string;
  let headers: Record<string, string> | undefined;

  if (customerSuccessPayload) {
    let preferences: PreferenceRow[];
    try {
      preferences = await supabaseRest<PreferenceRow[]>(
        `notification_preferences?select=email_enabled,unsubscribed_at&organization_id=eq.${encodeURIComponent(organizationId)}&user_id=eq.${encodeURIComponent(customerSuccessPayload.recipientUserId)}&limit=1`,
        { serviceRole: true },
      );
    } catch {
      await finishExecution({
        actionId: action.id,
        status: "failed",
        errorCode: "preference_preflight_failed",
        result: { externalEffect: false },
      }).catch(() => undefined);
      throw new Error("AGENT_EXECUTION_PREFERENCE_PREFLIGHT_FAILED");
    }
    const preference = preferences[0];
    if (!preference?.email_enabled) {
      return blockExecution({
        actionId: action.id,
        organizationId,
        actorId,
        code: "email_opt_in_required",
      });
    }
    if (preference.unsubscribed_at) {
      return blockExecution({
        actionId: action.id,
        organizationId,
        actorId,
        code: "recipient_unsubscribed",
      });
    }

    let workspaceUrl: string;
    let unsubscribeUrl: string;
    try {
      workspaceUrl = new URL(customerSuccessPayload.activationHref, siteUrl!).toString();
      const token = await createEmailUnsubscribeToken(
        organizationId,
        customerSuccessPayload.recipientUserId,
        unsubscribeSecret!,
      );
      unsubscribeUrl = new URL(
        `/unsubscribe?token=${encodeURIComponent(token)}`,
        siteUrl!,
      ).toString();
    } catch {
      await finishExecution({
        actionId: action.id,
        status: "failed",
        errorCode: "customer_success_link_failed",
        result: { externalEffect: false },
      }).catch(() => undefined);
      throw new Error("AGENT_EXECUTION_CUSTOMER_SUCCESS_LINK_FAILED");
    }

    text = [
      customerSuccessPayload.messageBody,
      "",
      `Open Foremention: ${workspaceUrl}`,
      "",
      `Unsubscribe from product alerts: ${unsubscribeUrl}`,
    ].join("\n");
    headers = {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  } else {
    const supportUrl = siteUrl
      ? new URL(`/app/support?ticket=${supportPayload!.ticketId}`, siteUrl).toString()
      : null;
    text = [
      supportPayload!.messageBody,
      ...(supportUrl ? ["", `View your support request: ${supportUrl}`] : []),
    ].join("\n");
  }

  let providerMessageId: string;
  try {
    const result = await sendProductAlertEmail({
      to: approvedPayload.recipientEmail,
      subject: approvedPayload.messageSubject,
      text,
      idempotencyKey: executionKey,
      ...(headers ? { headers } : {}),
    });
    providerMessageId = result.id;
  } catch (error) {
    if (error instanceof ApplicationEmailSendUncertainError) {
      await finishExecution({
        actionId: action.id,
        status: "uncertain",
        provider: "resend",
        errorCode: "provider_outcome_uncertain",
        result: {
          externalEffect: "unknown",
          retryAllowed: false,
          ...(supportPayload ? { supportTicketId: supportPayload.ticketId } : {}),
        },
      }).catch(() => undefined);
      await auditExecution({
        organizationId,
        actorId,
        actionId: action.id,
        status: "uncertain",
        code: "provider_outcome_uncertain",
      });
      return {
        status: "uncertain" as const,
        code: "provider_outcome_uncertain",
        duplicate: false,
      };
    }

    await finishExecution({
      actionId: action.id,
      status: "failed",
      provider: "resend",
      errorCode: "provider_rejected",
      result: {
        externalEffect: false,
        ...(supportPayload ? { supportTicketId: supportPayload.ticketId } : {}),
      },
    }).catch(() => undefined);
    await auditExecution({
      organizationId,
      actorId,
      actionId: action.id,
      status: "failed",
      code: "provider_rejected",
    });
    throw new Error("AGENT_EXECUTION_PROVIDER_REJECTED");
  }

  try {
    await finishExecution({
      actionId: action.id,
      status: "succeeded",
      provider: "resend",
      providerMessageId,
      result: {
        externalEffect: true,
        channel: "email",
        ...(supportPayload ? { supportTicketId: supportPayload.ticketId } : {}),
      },
    });
  } catch {
    throw new Error("AGENT_EXECUTION_RECEIPT_PERSISTENCE_FAILED");
  }

  let supportTicketStatusRecorded: boolean | null = null;
  if (supportPayload) {
    const respondedAt = new Date().toISOString();
    const rows = await supabaseRest<Array<{ id: string }>>(
      `support_tickets?id=eq.${encodeURIComponent(supportPayload.ticketId)}&organization_id=eq.${encodeURIComponent(organizationId)}&status=eq.reply_pending`,
      {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          status: "responded",
          responded_at: respondedAt,
        },
      },
    ).catch(() => []);
    supportTicketStatusRecorded = Boolean(rows[0]);
  }

  await auditExecution({
    organizationId,
    actorId,
    actionId: action.id,
    status: "succeeded",
  });
  return {
    status: "succeeded" as const,
    providerMessageId,
    duplicate: false,
    ...(supportPayload ? { supportTicketStatusRecorded } : {}),
  };
}
