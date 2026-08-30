import { buildExecutiveVisualizations, type ReportSnapshot } from "./reporting.ts";

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const htmlEscape = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

export function exportReportJson(report: ReportSnapshot) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function exportReportCsv(report: ReportSnapshot) {
  const header = [
    "report_id", "report_type", "generated_at", "source_record_id", "source_run_id",
    "measured_at", "measurement_environment_json", "questions_json", "provider_models_json",
    "evidence_coverage_pct", "comparison_eligible", "uncertainty_state", "customer_review_state",
    "summary", "actions_json", "outcomes_json", "competitors_json",
  ];
  const rows = report.sources.map((source) => [
    report.id,
    report.type,
    report.generatedAt,
    source.recordId,
    source.measurementRunId || "",
    source.measuredAt,
    source.measurementEnvironment,
    source.questions,
    source.providerModels,
    source.evidenceState.coveragePct,
    source.comparisonEligibility.eligible,
    source.uncertainty.state,
    source.customerReview.state,
    source.summary,
    source.actions,
    source.outcomes,
    source.competitors,
  ]);
  return [header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}

const renderTable = (title: string, description: string, columns: string[], rows: Array<Array<string | number>>) => `<section class="report-section">
  <h2>${htmlEscape(title)}</h2>
  <p>${htmlEscape(description)}</p>
  <div class="table-wrap"><table>
    <caption>${htmlEscape(title)} — tabular data</caption>
    <thead><tr>${columns.map((column) => `<th scope="col">${htmlEscape(column)}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${htmlEscape(cell)}</th>` : `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">No validated data available.</td></tr>`}</tbody>
  </table></div>
</section>`;

export function exportReportHtml(report: ReportSnapshot) {
  const visuals = buildExecutiveVisualizations(report);
  const providerContext = report.truth.providerModels.map((item) => `${item.provider}${item.model ? ` / ${item.model}` : ""}`).join(", ") || "Not recorded";
  const questionRows = report.truth.questions.map((question) => [question.id, question.text]);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow,noarchive" />
<title>${htmlEscape(report.title)} — Foremention</title>
<style>
  :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fff; }
  * { box-sizing: border-box; }
  body { margin: 0; line-height: 1.5; }
  main { max-width: 1040px; margin: 0 auto; padding: 40px 28px 64px; }
  header { border-bottom: 2px solid currentColor; padding-bottom: 24px; margin-bottom: 32px; }
  h1 { font-size: 2rem; line-height: 1.15; margin: 6px 0 12px; }
  h2 { font-size: 1.2rem; margin: 0 0 6px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: .75rem; font-weight: 700; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit,minmax(190px,1fr)); gap: 12px; margin: 20px 0 0; }
  .meta div { border: 1px solid #bbb; padding: 10px 12px; }
  .meta strong { display: block; font-size: .76rem; text-transform: uppercase; letter-spacing: .04em; }
  .boundary { border: 2px solid currentColor; padding: 14px 16px; margin: 24px 0; }
  .report-section { break-inside: avoid; margin: 28px 0; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; }
  caption { text-align: left; font-weight: 700; padding: 0 0 8px; }
  th, td { border: 1px solid #bbb; padding: 8px; text-align: left; vertical-align: top; }
  th { font-weight: 700; }
  footer { border-top: 1px solid #bbb; margin-top: 36px; padding-top: 16px; font-size: .82rem; }
  @media print {
    @page { size: A4; margin: 14mm; }
    main { max-width: none; padding: 0; }
    a { color: inherit; text-decoration: none; }
    .table-wrap { overflow: visible; }
    tr, img, .boundary { break-inside: avoid; }
  }
</style>
</head>
<body>
<main data-report-id="${htmlEscape(report.id)}" data-schema-version="${report.schemaVersion}">
  <header>
    <span class="eyebrow">${htmlEscape(report.type.replaceAll("_", " "))}</span>
    <h1>${htmlEscape(report.title)}</h1>
    <p>${htmlEscape(report.executiveSummary)}</p>
    <div class="meta">
      <div><strong>Generated</strong>${htmlEscape(report.generatedAt)}</div>
      <div><strong>Data as of</strong>${htmlEscape(report.dataAsOf)}</div>
      <div><strong>Source Records</strong>${report.sourceRecordIds.length}</div>
      <div><strong>Provider / model</strong>${htmlEscape(providerContext)}</div>
    </div>
  </header>
  <aside class="boundary" aria-label="Interpretation boundary"><strong>Interpretation boundary</strong><p>${htmlEscape(report.causalityBoundary)}</p></aside>
  ${renderTable("Buyer questions", "Exact buyer-question text retained in this report snapshot.", ["Question ID", "Question"], questionRows)}
  ${visuals.map((visual) => renderTable(visual.title, visual.description, visual.table.columns, visual.table.rows)).join("\n")}
  <footer>
    <p><strong>Audit trace:</strong> Report ${htmlEscape(report.id)} · Recommendation Records ${htmlEscape(report.sourceRecordIds.join(", ") || "none")} · Measurement runs ${htmlEscape(report.sourceRunIds.join(", ") || "none")}</p>
    <p>Evidence state, comparison eligibility, uncertainty and customer review state are preserved in the JSON/CSV audit exports associated with this snapshot.</p>
  </footer>
</main>
</body>
</html>`;
}

const ascii = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E\n]/g, "?");
const pdfEscape = (value: string) => ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
const wrap = (value: string, width = 88) => {
  const words = ascii(value).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
};

function pdfPageLines(report: ReportSnapshot) {
  const lines = [
    "FOREMENTION REPORT",
    `${report.title} (${report.type})`,
    `Report ID: ${report.id}`,
    `Generated: ${report.generatedAt}`,
    `Data as of: ${report.dataAsOf}`,
    `Source Recommendation Records: ${report.sourceRecordIds.join(", ") || "none"}`,
    `Source measurement runs: ${report.sourceRunIds.join(", ") || "none"}`,
    "",
    "EXECUTIVE SUMMARY",
    report.executiveSummary,
    "",
    "INTERPRETATION BOUNDARY",
    report.causalityBoundary,
    "",
    "BUYER QUESTIONS",
    ...report.truth.questions.map((question) => `- ${question.text}`),
    "",
    "PROVIDER / MODEL CONTEXT",
    ...report.truth.providerModels.map((item) => `- ${item.provider}${item.model ? ` / ${item.model}` : ""}`),
    "",
    "SOURCE RECORDS",
    ...report.sources.flatMap((source) => [
      `${source.title} | ${source.measuredAt}`,
      `Evidence coverage: ${source.evidenceState.coveragePct}% (${source.evidenceState.citedClaimCount}/${source.evidenceState.claimCount} cited; ${source.evidenceState.unsupportedClaimCount} unsupported)`,
      `Comparison eligible: ${source.comparisonEligibility.eligible ? "yes" : "no"} - ${source.comparisonEligibility.reason}`,
      `Uncertainty: ${source.uncertainty.state}${source.uncertainty.notes.length ? ` - ${source.uncertainty.notes.join("; ")}` : ""}`,
      `Customer review: ${source.customerReview.state}${source.customerReview.reviewedAt ? ` at ${source.customerReview.reviewedAt}` : ""}`,
      `Summary: ${source.summary}`,
      "",
    ]),
  ];
  return lines.flatMap((line) => line ? wrap(line) : [""]);
}

export function exportReportPdf(report: ReportSnapshot) {
  const lines = pdfPageLines(report);
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 46) pages.push(lines.slice(index, index + 46));
  if (!pages.length) pages.push(["FOREMENTION REPORT", `Report ID: ${report.id}`]);

  const objects: string[] = [];
  const add = (content: string) => { objects.push(content); return objects.length; };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const commands = ["BT", "/F1 10 Tf", "48 790 Td", "13 TL"];
    pageLines.forEach((line, index) => {
      if (index > 0) commands.push("T*");
      commands.push(`(${pdfEscape(line)}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let output = "%PDF-1.4\n%Foremention\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(output, "latin1");
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(output, "latin1"));
}

export function exportReportEmail(report: ReportSnapshot) {
  const evidence = report.sources.reduce((sum, source) => sum + source.evidenceState.citedClaimCount, 0);
  const claims = report.sources.reduce((sum, source) => sum + source.evidenceState.claimCount, 0);
  const text = [
    report.title,
    report.executiveSummary,
    "",
    `Data as of: ${report.dataAsOf}`,
    `Evidence coverage: ${claims ? `${evidence}/${claims} claims with returned citation evidence` : "No claim denominator available"}`,
    `Source Recommendation Records: ${report.sourceRecordIds.length}`,
    "",
    "Interpretation boundary:",
    report.causalityBoundary,
    "",
    `Audit reference: ${report.id}`,
  ].join("\n");
  return {
    subject: `${report.title} — Foremention`,
    text,
    html: `<h1>${htmlEscape(report.title)}</h1><p>${htmlEscape(report.executiveSummary)}</p><p><strong>Data as of:</strong> ${htmlEscape(report.dataAsOf)}</p><p><strong>Interpretation boundary:</strong> ${htmlEscape(report.causalityBoundary)}</p><p><small>Audit reference: ${htmlEscape(report.id)}</small></p>`,
  };
}

export function exportReportPresentation(report: ReportSnapshot) {
  const visuals = buildExecutiveVisualizations(report);
  return {
    schemaVersion: "foremention.presentation_ready.v1" as const,
    reportId: report.id,
    sourceRecordIds: report.sourceRecordIds,
    sourceRunIds: report.sourceRunIds,
    generatedAt: report.generatedAt,
    slides: [
      { title: report.title, purpose: "Executive framing", bullets: [report.executiveSummary, `Data as of ${report.dataAsOf}`], sourceRecordIds: report.sourceRecordIds },
      { title: "Evidence and measurement context", purpose: "Truth boundary", bullets: [`${report.truth.questions.length} exact buyer questions`, `${report.truth.providerModels.length} provider/model contexts`, report.causalityBoundary], sourceRecordIds: report.sourceRecordIds },
      ...visuals.filter((visual) => visual.table.rows.length > 0).map((visual) => ({ title: visual.title, purpose: visual.kind, bullets: [visual.description], table: visual.table, sourceRecordIds: report.sourceRecordIds })),
      { title: "Audit trail", purpose: "Traceability", bullets: [`Report ${report.id}`, `Recommendation Records: ${report.sourceRecordIds.join(", ") || "none"}`, `Measurement runs: ${report.sourceRunIds.join(", ") || "none"}`], sourceRecordIds: report.sourceRecordIds },
    ],
  };
}
