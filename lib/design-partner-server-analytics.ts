import { isValidDesignPartnerIntakeId } from "./design-partner-intake-id.ts";

// Pin to Foremention's existing PostHog US project through server runtime
// configuration. Missing/invalid configuration must fail closed rather than
// hardcode or accidentally send conversions to the wrong analytics project.
const POSTHOG_INGEST = "https://us.i.posthog.com/i/v0/e/";

/**
 * A stable UUID protects against best-effort provider duplicate ingestion.
 * Its input is a random first-party intake UUID, not email or customer text.
 */
async function pseudonymousReceiptIdentity(intakeId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`foremention:persisted-design-partner-intake:v1:${intakeId.toLowerCase()}`),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const eventUuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${"89ab"[parseInt(hex[16], 16) % 4]}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return { eventUuid, distinctId: `persisted-intake:${hex.slice(32)}` };
}

/**
 * Best-effort, non-authoritative PostHog projection of a first-party receipt.
 * Must be invoked exclusively AFTER the server receives a newly persisted
 * design_partner_applications.id; never for duplicates, honeypots or GETs.
 * A capture failure must never roll back or hide that database receipt.
 */
export async function capturePersistedDesignPartnerSubmission(
  intakeId: string,
  send: typeof fetch = fetch,
  projectToken: string | undefined = process.env.FOREMENTION_POSTHOG_PUBLIC_PROJECT_TOKEN,
): Promise<boolean> {
  if (!isValidDesignPartnerIntakeId(intakeId) || !projectToken?.startsWith("phc_")) return false;
  try {
    const { eventUuid, distinctId } = await pseudonymousReceiptIdentity(intakeId);
    const response = await send(POSTHOG_INGEST, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
      body: JSON.stringify({
        api_key: projectToken,
        event: "design_partner_application_submitted",
        uuid: eventUuid,
        distinct_id: distinctId,
        properties: {
          $process_person_profile: false,
          $geoip_disable: true,
        },
      }),
    });
    if (!response.ok) console.warn("Persisted design-partner analytics delivery rejected.", { status: response.status });
    return response.ok;
  } catch {
    console.warn("Persisted design-partner analytics delivery unavailable.");
    return false;
  }
}
