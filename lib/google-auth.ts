const AUTH_NEXT_BASE = new URL("https://foremention.invalid");

export function googleAuthEnabled() {
  return process.env.FOREMENTION_GOOGLE_AUTH_ENABLED === "1";
}

export function safeAuthNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) return "/app";

  try {
    const parsed = new URL(value, AUTH_NEXT_BASE);
    if (parsed.origin !== AUTH_NEXT_BASE.origin) return "/app";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 300);
  } catch {
    return "/app";
  }
}
