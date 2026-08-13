const spreadsheetFormulaPrefix = /^\s*[=+\-@]/;
const spreadsheetControlPrefix = /^[\t\r\n]/;

/**
 * Encode one value as a quoted CSV cell while preventing spreadsheet formula
 * execution from untrusted text fields. Numeric/boolean values are preserved
 * as ordinary quoted literals; only string input can be formula-neutralized.
 */
export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const neutralized = typeof value === "string"
    && (spreadsheetFormulaPrefix.test(raw) || spreadsheetControlPrefix.test(raw))
    ? `'${raw}`
    : raw;
  return `"${neutralized.replaceAll('"', '""')}"`;
}
