export function googleAuthEnabled() {
  return process.env.FOREMENTION_GOOGLE_AUTH_ENABLED === "1";
}

export function safeAuthNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value.slice(0, 300);
}
