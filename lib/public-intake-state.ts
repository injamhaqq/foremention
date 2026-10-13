// Chat05 / A01 — public intake truth.
//
// A redirect flag (`?submitted=1`), an HTTP 2xx status, or a well-formed id
// supplied by the browser is never proof that a public application or request
// was stored. These pure helpers decide what the public pages may say, so the
// same rules are exercised by behavioural tests and by the pages themselves.

import { isValidDesignPartnerIntakeId } from "./design-partner-intake-id.ts";

export type ContactIntakeQuery = {
  submitted?: string;
  error?: string;
  intake?: string;
};

export type ContactIntakeNotice =
  | "saved"
  | "unverified-reference"
  | "unverified-no-reference"
  | "rate-limited"
  | "failed"
  | "none";

/** The intake id the contact page may look up, or "" when the query value is not an opaque receipt id. */
export function contactIntakeLookupId(query: ContactIntakeQuery): string {
  return query.submitted === "1" && isValidDesignPartnerIntakeId(query.intake) ? query.intake : "";
}

/**
 * Which notice the contact page shows. `receiptVerified` must come from a
 * server-side lookup of the persisted application id, never from the query.
 */
export function contactIntakeNotice(query: ContactIntakeQuery, receiptVerified: boolean): ContactIntakeNotice {
  const lookupId = contactIntakeLookupId(query);
  if (lookupId && receiptVerified) return "saved";
  if (query.error === "rate-limit") return "rate-limited";
  if (query.error) return "failed";
  if (query.submitted === "1") return lookupId ? "unverified-reference" : "unverified-no-reference";
  return "none";
}

const OPAQUE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extracts the stored source-gap request id from a PostgREST `return=representation` response. */
export function sourceGapReceiptFromRows(rows: unknown): string | null {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const id = (rows[0] as { id?: unknown } | null)?.id;
  return typeof id === "string" && OPAQUE_UUID.test(id) ? id : null;
}

export type SourceGapResponseBody = {
  received?: unknown;
  reference?: unknown;
  message?: unknown;
  error?: unknown;
};

/**
 * The browser may show "Request received" only for a 2xx response that carries
 * an explicit stored receipt. A bare `{ ok: true }`, a demo/validation-only
 * answer, or a missing reference is treated as not saved.
 */
export function sourceGapClientOutcome(status: number, body: SourceGapResponseBody | null):
  | { saved: true; reference: string; message: string }
  | { saved: false; message: string } {
  const fallback = "We could not confirm that your request was saved. Please try again or email hello@foremention.com.";
  if (status >= 200 && status < 300 && body && body.received === true && typeof body.reference === "string" && OPAQUE_UUID.test(body.reference)) {
    return {
      saved: true,
      reference: body.reference,
      message: typeof body.message === "string" && body.message ? body.message : "Your request is saved.",
    };
  }
  if (status === 429) return { saved: false, message: "Too many recent requests. Please try again later or email hello@foremention.com." };
  return { saved: false, message: typeof body?.error === "string" && body.error ? body.error : fallback };
}
