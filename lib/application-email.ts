export type ApplicationEmailStatus = {
  available: boolean;
  label: "Configured" | "Not connected";
  reason: string;
};

export function getApplicationEmailStatus(): ApplicationEmailStatus {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  return {
    available: configured,
    label: configured ? "Configured" : "Not connected",
    reason: configured
      ? "The Resend application-alert adapter is configured. Delivery remains unverified until a production test succeeds. Authentication email stays separate."
      : "Authentication email is separate. Application alerts require a Resend API key, a verified sender, and a completed production delivery test.",
  };
}

export type ProductAlertEmail = {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};

export class ApplicationEmailSendUncertainError extends Error {
  constructor(message = "Application email delivery outcome is uncertain.") {
    super(message);
    this.name = "ApplicationEmailSendUncertainError";
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Server-only product-alert helper. Do not import this into authentication
 * routes: Supabase/Zoho owns confirmation and password-recovery delivery.
 */
export async function sendProductAlertEmail(input: ProductAlertEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Application email delivery is not configured.");
  const to = input.to.trim().toLowerCase();
  if (!emailPattern.test(to)) throw new Error("A valid product-alert recipient is required.");
  const subject = input.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 160);
  const text = input.text.trim().slice(0, 20_000);
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!subject || !text) throw new Error("Product-alert subject and text are required.");
  if (idempotencyKey && (idempotencyKey.length > 256 || /[\r\n]/.test(idempotencyKey))) {
    throw new Error("Application email idempotency key is invalid.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [to], subject, text, ...(input.headers ? { headers: input.headers } : {}) }),
    });
  } catch {
    throw new ApplicationEmailSendUncertainError();
  }
  if (!response.ok) {
    throw new Error(`Application email provider rejected the request (status ${response.status}).`);
  }
  let result: { id?: string };
  try {
    result = await response.json() as { id?: string };
  } catch {
    throw new ApplicationEmailSendUncertainError("Application email provider accepted the request but returned an unreadable receipt.");
  }
  if (!result.id) {
    throw new ApplicationEmailSendUncertainError("Application email provider accepted the request but returned no delivery identifier.");
  }
  return { id: result.id };
}

export async function sendWelcomeEmail(to: string, siteUrl: string) {
  const workspaceUrl = new URL("/app", siteUrl).toString();
  return sendProductAlertEmail({
    to,
    subject: "Welcome to Foremention",
    text: [
      "Welcome to Foremention.",
      "",
      "Foremention maps how your company appears in AI recommendations, preserves the exact answers and returned citations, and turns reviewed evidence into a Source Map and prioritized next actions.",
      "",
      "After confirming your account, complete the guided setup with your website, category, competitors, and buyer questions. Your first connected-provider audit will run in the background and will never be replaced with invented evidence.",
      "",
      `Return to your workspace: ${workspaceUrl}`,
    ].join("\n"),
  });
}
