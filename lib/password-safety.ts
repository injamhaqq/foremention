import { HashRangeUnavailable, loadHashRange } from "@/lib/hash-range-client";

export { HashRangeUnavailable };

export type PasswordSafetyResult = {
  compromised: boolean;
  breachCount: number;
};

async function sha1Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
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
