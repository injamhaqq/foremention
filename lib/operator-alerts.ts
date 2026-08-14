import { sendProductAlertEmail } from "@/lib/application-email";
import { supabaseRest } from "@/lib/supabase-rest";

const BUILD_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

type OperatorAlertConfig = {
  recipient_email: string;
  enabled: boolean;
};

type OperatorAlertDelivery = {
  build_commit: string;
  status: "pending" | "sent" | "failed";
  attempt_count: number;
  requested_at: string;
  sent_at: string | null;
};

async function sha256(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadDelivery(buildCommit: string) {
  const rows = await supabaseRest<OperatorAlertDelivery[]>(
    `operator_alert_deliveries?select=build_commit,status,attempt_count,requested_at,sent_at&build_commit=eq.${buildCommit}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

async function loadRecipient() {
  const rows = await supabaseRest<OperatorAlertConfig[]>(
    "operator_alert_config?select=recipient_email,enabled&singleton=eq.true&limit=1",
    { serviceRole: true },
  );
  const config = rows[0] || null;
  if (!config?.enabled || !config.recipient_email) throw new Error("operator_alert_not_configured");
  return config.recipient_email;
}

export function operatorAlertPublicState(delivery: OperatorAlertDelivery | null) {
  return {
    status: delivery?.status || "not_requested",
    requestedAt: delivery?.requested_at || null,
    sentAt: delivery?.sent_at || null,
    note: "The operator alert probe contains no customer data and accepts no caller-supplied recipient, message, or build identifier.",
  } as const;
}

export async function getOperatorAlertDelivery(buildCommit: string) {
  if (!BUILD_COMMIT_PATTERN.test(buildCommit)) throw new Error("invalid_build_commit");
  return loadDelivery(buildCommit);
}

export async function sendOperatorAlertProbe(buildCommit: string) {
  if (!BUILD_COMMIT_PATTERN.test(buildCommit)) throw new Error("invalid_build_commit");

  const inserted = await supabaseRest<OperatorAlertDelivery[]>(
    "operator_alert_deliveries?on_conflict=build_commit",
    {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=ignore-duplicates,return=representation",
      body: { build_commit: buildCommit, status: "pending", attempt_count: 1 },
    },
  );

  let delivery = inserted[0] || await loadDelivery(buildCommit);
  if (!delivery) throw new Error("operator_alert_ledger_unavailable");
  if (delivery.status === "sent" || delivery.status === "pending" && !inserted[0]) return delivery;

  if (delivery.status === "failed") {
    if (delivery.attempt_count >= 3) return delivery;
    const retry = await supabaseRest<OperatorAlertDelivery[]>(
      `operator_alert_deliveries?build_commit=eq.${buildCommit}`,
      {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=representation",
        body: { status: "pending", attempt_count: delivery.attempt_count + 1, error_code: null },
      },
    );
    delivery = retry[0] || delivery;
  }

  try {
    const recipient = await loadRecipient();
    const result = await sendProductAlertEmail({
      to: recipient,
      subject: `Foremention production alert probe — ${buildCommit.slice(0, 7)}`,
      text: [
        "Controlled Foremention production monitoring test.",
        "",
        `Deployed build: ${buildCommit}`,
        `Observed at: ${new Date().toISOString()}`,
        "",
        "No customer data, prompts, answers, URLs, credentials, or provider output are included in this message.",
        "No action is required if this test was expected.",
      ].join("\n"),
      headers: { "X-Entity-Ref-ID": `foremention-ops-${buildCommit.slice(0, 16)}` },
    });
    const providerDeliveryHash = await sha256(result.id);
    const updated = await supabaseRest<OperatorAlertDelivery[]>(
      `operator_alert_deliveries?build_commit=eq.${buildCommit}`,
      {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_delivery_hash: providerDeliveryHash,
          error_code: null,
        },
      },
    );
    return updated[0] || await loadDelivery(buildCommit) || delivery;
  } catch (error) {
    const errorCode = error instanceof Error && /^[a-z0-9_:-]{1,80}$/.test(error.message)
      ? error.message
      : "operator_alert_delivery_failed";
    const updated = await supabaseRest<OperatorAlertDelivery[]>(
      `operator_alert_deliveries?build_commit=eq.${buildCommit}`,
      {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=representation",
        body: { status: "failed", error_code: errorCode },
      },
    ).catch(() => [] as OperatorAlertDelivery[]);
    return updated[0] || { ...delivery, status: "failed" as const };
  }
}
