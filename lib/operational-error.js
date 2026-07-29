const SECRET_VALUE_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\b(?:sk|sb_secret|signkey|eventkey|whsec)[-_A-Za-z0-9.]{12,}\b/g,
];

export function redactOperationalText(value, maxLength = 500) {
  let text = typeof value === "string" ? value : "Unknown operational failure.";
  text = text
    .replace(/([?&](?:api[_-]?key|key|token|secret|password)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/((?:api[_ -]?key|token|secret|password)[-_a-z0-9]*\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]");
  for (const pattern of SECRET_VALUE_PATTERNS) text = text.replace(pattern, "[redacted]");
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
