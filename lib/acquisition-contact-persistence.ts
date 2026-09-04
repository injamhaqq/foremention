import type { AcquisitionContactCandidate } from "./acquisition-contact-resolution.ts";
import { SupabaseRequestError, supabaseRest } from "./supabase-rest.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stableHash32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normalizeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) return null;
  return new Date(timestamp).toISOString();
}

export function acquisitionContactKey(accountId: string, email: string) {
  if (!UUID_PATTERN.test(accountId)) throw new Error("ACQUISITION_CONTACT_ACCOUNT_INVALID");
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(normalizedEmail)) throw new Error("ACQUISITION_CONTACT_EMAIL_INVALID");
  const material = `${accountId.toLowerCase()}|${normalizedEmail}`;
  return `acq-contact-${stableHash32(material, 2166136261)}${stableHash32(material, 2246822519)}`;
}

export function buildAcquisitionContactRecord(accountId: string, candidate: AcquisitionContactCandidate) {
  const acquisition_contact_key = acquisitionContactKey(accountId, candidate.email);
  const sourceUrl = normalizeHttpsUrl(candidate.sourceUrl);
  if (!sourceUrl) throw new Error("ACQUISITION_CONTACT_SOURCE_INVALID");
  const verifiedAt = normalizeTimestamp(candidate.retrievedAt);
  if (!verifiedAt) throw new Error("ACQUISITION_CONTACT_VERIFIED_AT_INVALID");
  const fullName = candidate.fullName.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 160);
  const jobTitle = candidate.jobTitle.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 160);
  if (!fullName || !jobTitle) throw new Error("ACQUISITION_CONTACT_IDENTITY_INVALID");

  return {
    account_id: accountId,
    full_name: fullName,
    email: candidate.email.trim().toLowerCase(),
    job_title: jobTitle,
    buyer_role: candidate.buyerRole,
    is_primary: true,
    source: "autopilot_public_business_source",
    relationship_state: "cold",
    contact_route_status: "verified",
    contact_source_url: sourceUrl,
    contact_verified_at: verifiedAt,
    acquisition_contact_key,
  } as const;
}

type ContactIdentity = {
  id: string;
  account_id: string;
  acquisition_contact_key: string | null;
};

async function findByAcquisitionKey(accountId: string, key: string) {
  const rows = await supabaseRest<ContactIdentity[]>(
    `commercial_contacts?select=id,account_id,acquisition_contact_key&account_id=eq.${encodeURIComponent(accountId)}&acquisition_contact_key=eq.${encodeURIComponent(key)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

async function findExistingEmail(accountId: string, email: string) {
  const rows = await supabaseRest<ContactIdentity[]>(
    `commercial_contacts?select=id,account_id,acquisition_contact_key&account_id=eq.${encodeURIComponent(accountId)}&email=ilike.${encodeURIComponent(email)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] ?? null;
}

export async function persistResolvedAcquisitionContact(accountId: string, candidate: AcquisitionContactCandidate) {
  const record = buildAcquisitionContactRecord(accountId, candidate);
  const keyed = await findByAcquisitionKey(accountId, record.acquisition_contact_key);
  if (keyed) return { contactId: keyed.id, acquisitionContactKey: record.acquisition_contact_key, created: false };

  const legacy = await findExistingEmail(accountId, record.email);
  if (legacy) {
    const rows = await supabaseRest<ContactIdentity[]>(
      `commercial_contacts?id=eq.${encodeURIComponent(legacy.id)}&account_id=eq.${encodeURIComponent(accountId)}&select=id,account_id,acquisition_contact_key`,
      {
        method: "PATCH",
        serviceRole: true,
        body: record,
        prefer: "return=representation",
      },
    );
    if (!rows[0]) throw new Error("ACQUISITION_CONTACT_EXISTING_UPDATE_FAILED");
    return { contactId: rows[0].id, acquisitionContactKey: record.acquisition_contact_key, created: false };
  }

  try {
    const rows = await supabaseRest<ContactIdentity[]>(
      "commercial_contacts?select=id,account_id,acquisition_contact_key",
      {
        method: "POST",
        serviceRole: true,
        body: record,
        prefer: "return=representation",
      },
    );
    if (rows[0]) return { contactId: rows[0].id, acquisitionContactKey: record.acquisition_contact_key, created: true };
  } catch (error) {
    if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
  }

  const raced = await findByAcquisitionKey(accountId, record.acquisition_contact_key);
  if (!raced) throw new Error("ACQUISITION_CONTACT_CONFLICT_UNRESOLVED");
  return { contactId: raced.id, acquisitionContactKey: record.acquisition_contact_key, created: false };
}
