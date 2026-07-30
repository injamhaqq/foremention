export type SourceCrawlerAccess = "open" | "partial" | "blocked" | "unknown";

export type SourceInspectionResult = {
  access: SourceCrawlerAccess;
  checkedAt: string;
  contentType: string | null;
  finalUrl: string;
  httpStatus: number | null;
  message: string;
  pageDescription?: string | null;
  pageTitle: string | null;
  redirectCount: number;
};

type Fetcher = typeof fetch;
type Resolver = (hostname: string, signal: AbortSignal) => Promise<string[]>;

type InspectionOptions = {
  fetcher?: Fetcher;
  maxBytes?: number;
  now?: () => Date;
  resolver?: Resolver;
  timeoutMs?: number;
};

const DEFAULT_MAX_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const ALLOWED_CONTENT_TYPES = new Set(["text/html", "application/xhtml+xml", "text/plain"]);

export class SourceInspectionError extends Error {
  readonly code: "unsafe_url" | "invalid_url";

  constructor(code: SourceInspectionError["code"], message: string) {
    super(message);
    this.name = "SourceInspectionError";
    this.code = code;
  }
}

function parseIpv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const bytes = parts.map(Number);
  return bytes.some((byte) => byte < 0 || byte > 255) ? null : bytes;
}

function isPrivateIpv4(hostname: string) {
  const bytes = parseIpv4(hostname);
  if (!bytes) return false;
  const [a, b, c, d] = bytes;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
    || (a === 255 && b === 255 && c === 255 && d === 255);
}

function mappedIpv4(hostname: string) {
  if (!hostname.startsWith("::ffff:")) return null;
  const tail = hostname.slice(7);
  if (parseIpv4(tail)) return tail;
  const groups = tail.split(":");
  if (groups.length !== 2 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  const high = Number.parseInt(groups[0], 16);
  const low = Number.parseInt(groups[1], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = mappedIpv4(normalized);
  if (mapped) return isPrivateIpv4(mapped);
  return normalized === "::"
    || normalized === "::1"
    || /^f[cd][0-9a-f]{2}:/.test(normalized)
    || /^fe[89a-f][0-9a-f]:/.test(normalized)
    || normalized.startsWith("ff")
    || normalized === "2001"
    || normalized.startsWith("2001:0000:")
    || normalized === "2001:db8"
    || normalized.startsWith("2001:db8:")
    || normalized.startsWith("2002:")
    || normalized.startsWith("64:ff9b:");
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  return normalized === "localhost"
    || normalized === "metadata.google.internal"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
    || normalized.endsWith(".internal")
    || normalized.endsWith(".home")
    || normalized.endsWith(".lan")
    || normalized.endsWith(".test")
    || normalized.endsWith(".invalid")
    || isPrivateIpv4(normalized)
    || (normalized.includes(":") && isPrivateIpv6(normalized));
}

export function validatePublicSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SourceInspectionError("invalid_url", "This source does not have a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new SourceInspectionError("unsafe_url", "Only public HTTP and HTTPS sources can be inspected.");
  }
  if (url.username || url.password) {
    throw new SourceInspectionError("unsafe_url", "Source URLs containing credentials cannot be inspected.");
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new SourceInspectionError("unsafe_url", "Source URLs using nonstandard ports cannot be inspected.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new SourceInspectionError("unsafe_url", "Private, local, and reserved network addresses cannot be inspected.");
  }
  url.hash = "";
  return url;
}

function isPublicResolvedAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  return !isPrivateIpv4(normalized) && !(normalized.includes(":") && isPrivateIpv6(normalized));
}

async function resolveWithCloudflare(hostname: string, signal: AbortSignal) {
  if (parseIpv4(hostname) || hostname.includes(":")) return [hostname];
  const query = async (type: "A" | "AAAA") => {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal,
    });
    if (!response.ok) throw new Error("DNS safety check failed.");
    const payload = await response.json() as { Answer?: Array<{ type?: number; data?: string }> };
    return (payload.Answer || [])
      .filter((answer) => answer.type === 1 || answer.type === 28)
      .map((answer) => String(answer.data || "").replace(/\.$/, ""))
      .filter(Boolean);
  };
  const [ipv4, ipv6] = await Promise.all([query("A"), query("AAAA")]);
  return [...ipv4, ...ipv6];
}

async function assertPublicResolution(url: URL, resolver: Resolver, signal: AbortSignal) {
  const addresses = await resolver(url.hostname.replace(/^\[|\]$/g, ""), signal);
  if (!addresses.length || addresses.some((address) => !isPublicResolvedAddress(address))) {
    throw new SourceInspectionError("unsafe_url", "The source did not resolve exclusively to public internet addresses.");
  }
}

function decodeTitle(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function extractPageTitle(body: string) {
  const match = body.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeTitle(match[1]) || null : null;
}

function extractMetaDescription(body: string) {
  const tags = body.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:name|property)\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
    if (name !== "description" && name !== "og:description") continue;
    const content = tag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
    if (content) return decodeTitle(content) || null;
  }
  return null;
}

async function readLimitedText(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > maxBytes) throw new Error("response_too_large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) throw new Error("response_too_large");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function result(input: Omit<SourceInspectionResult, "checkedAt">, now: () => Date): SourceInspectionResult {
  return { ...input, checkedAt: now().toISOString() };
}

export async function inspectSourceUrl(value: string, options: InspectionOptions = {}): Promise<SourceInspectionResult> {
  const fetcher = options.fetcher || fetch;
  const resolver = options.resolver || resolveWithCloudflare;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const now = options.now || (() => new Date());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  let current = validatePublicSourceUrl(value);
  let redirects = 0;

  try {
    while (true) {
      await assertPublicResolution(current, resolver, controller.signal);
      let response: Response;
      try {
        response = await fetcher(current, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
            "user-agent": "Foremention Source Inspector/1.0 (+https://foremention.com/methodology)",
          },
        });
      } catch {
        return result({
          access: "unknown",
          contentType: null,
          finalUrl: current.toString(),
          httpStatus: null,
          message: controller.signal.aborted ? "Inspection timed out before the page responded." : "The page could not be reached from the inspection service.",
          pageTitle: null,
          redirectCount: redirects,
        }, now);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return result({ access: "partial", contentType: null, finalUrl: current.toString(), httpStatus: response.status, message: "The page redirected without a usable destination.", pageTitle: null, redirectCount: redirects }, now);
        }
        if (redirects >= MAX_REDIRECTS) {
          return result({ access: "partial", contentType: null, finalUrl: current.toString(), httpStatus: response.status, message: "The page exceeded the safe redirect limit.", pageTitle: null, redirectCount: redirects }, now);
        }
        current = validatePublicSourceUrl(new URL(location, current).toString());
        redirects += 1;
        continue;
      }

      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || null;
      if (!response.ok) {
        const explicitlyBlocked = [401, 403, 407, 429].includes(response.status);
        return result({
          access: explicitlyBlocked ? "blocked" : "unknown",
          contentType,
          finalUrl: current.toString(),
          httpStatus: response.status,
          message: explicitlyBlocked ? `The page refused automated inspection (HTTP ${response.status}).` : `The page returned HTTP ${response.status}; no content was reviewed.`,
          pageTitle: null,
          redirectCount: redirects,
        }, now);
      }
      if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
        return result({ access: "partial", contentType, finalUrl: current.toString(), httpStatus: response.status, message: "The page responded, but its content type is not safe for text inspection.", pageTitle: null, redirectCount: redirects }, now);
      }

      try {
        const body = await readLimitedText(response, maxBytes);
        return result({
          access: response.status === 206 ? "partial" : "open",
          contentType,
          finalUrl: current.toString(),
          httpStatus: response.status,
          message: response.status === 206 ? "The page returned partial content; metadata may be incomplete." : "The page was reachable and its bounded text metadata was inspected.",
          pageDescription: contentType === "text/plain" ? null : extractMetaDescription(body),
          pageTitle: contentType === "text/plain" ? null : extractPageTitle(body),
          redirectCount: redirects,
        }, now);
      } catch (error) {
        if (error instanceof Error && error.message === "response_too_large") {
          return result({ access: "partial", contentType, finalUrl: current.toString(), httpStatus: response.status, message: "The page was reachable, but exceeded the safe inspection size limit.", pageTitle: null, redirectCount: redirects }, now);
        }
        return result({ access: "unknown", contentType, finalUrl: current.toString(), httpStatus: response.status, message: "The page response could not be inspected safely.", pageTitle: null, redirectCount: redirects }, now);
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}
