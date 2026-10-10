// The public intake receipt is a random opaque UUID, never an email, company,
// query string, or payment reference.
const INTAKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDesignPartnerIntakeId(value: unknown): value is string {
  return typeof value === "string" && INTAKE_ID.test(value);
}
