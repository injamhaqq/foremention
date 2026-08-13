import { PASSWORD_SAFETY_RANGE_ENDPOINT } from "@/lib/security-endpoints";

export class HashRangeUnavailable extends Error {
  constructor() {
    super("Password safety range lookup unavailable");
    this.name = "HashRangeUnavailable";
  }
}

export async function loadHashRange(
  prefix: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
) {
  if (!/^[0-9A-F]{5}$/.test(prefix)) throw new HashRangeUnavailable();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 4_000);
  try {
    const response = await (options.fetchImpl || fetch)(`${PASSWORD_SAFETY_RANGE_ENDPOINT}${prefix}`, {
      method: "GET",
      headers: {
        accept: "text/plain",
        "add-padding": "true",
        "user-agent": "Foremention password safety",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new HashRangeUnavailable();
    return await response.text();
  } catch (error) {
    if (error instanceof HashRangeUnavailable) throw error;
    throw new HashRangeUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
