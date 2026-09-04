const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configuredOperatorEmails() {
  const raw = process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => EMAIL_PATTERN.test(value)),
  );
}

export function isCompanyOperatorEmail(email: unknown) {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) return false;
  return configuredOperatorEmails().has(normalized);
}
