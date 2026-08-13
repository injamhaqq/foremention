import { HashRangeUnavailable, loadHashRange } from "@/lib/hash-range-client";
import { supabaseRest } from "@/lib/supabase-rest";

export { HashRangeUnavailable };

export type PasswordSafetyResult = {
  compromised: boolean;
  breachCount: number;
};

async function digestHex(algorithm: "SHA-1" | "SHA-256", value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha1Hex(value: string) {
  return (await digestHex("SHA-1", value)).toUpperCase();
}

export async function checkPasswordSafety(
  password: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<PasswordSafetyResult> {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const range = await loadHashRange(prefix, options);
  for (const line of range.split(/\r?\n/)) {
    const [candidate = "", rawCount = ""] = line.trim().split(":", 2);
    if (candidate.toUpperCase() !== suffix) continue;
    const breachCount = Number.parseInt(rawCount, 10);
    return {
      compromised: Number.isFinite(breachCount) && breachCount > 0,
      breachCount: Number.isFinite(breachCount) ? Math.max(0, breachCount) : 0,
    };
  }
  return { compromised: false, breachCount: 0 };
}

/**
 * Create a one-time, email-bound signup proof after password safety succeeds.
 * Only SHA-256 hashes are persisted. The raw random token is returned to the
 * caller so it can be included once in the Supabase signup user metadata and
 * atomically consumed by the Before User Created hook.
 */
export async function issueSignupSecurityAttestation(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("A signup email is required.");
  const token = crypto.randomUUID();
  const [tokenHash, emailHash] = await Promise.all([
    digestHex("SHA-256", token),
    digestHex("SHA-256", normalizedEmail),
  ]);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await supabaseRest("rpc/issue_signup_security_attestation", {
    method: "POST",
    serviceRole: true,
    body: {
      p_token_hash: tokenHash,
      p_email_hash: emailHash,
      p_expires_at: expiresAt,
    },
  });
  return token;
}
