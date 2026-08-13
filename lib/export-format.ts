import { csvCell } from "@/lib/csv";

type ExportRow = Record<string, unknown>;

function csvValue(value: unknown) {
  const serializable = value !== null && typeof value === "object" ? JSON.stringify(value) : value;
  return csvCell(serializable);
}

export function rowsToCsv(rows: ExportRow[]) {
  if (!rows.length) return "";
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [columns.map(csvValue).join(","), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(","))].join("\r\n");
}
