import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import {
  assessPublicVisibilityAggregate,
  MAX_PUBLIC_REPORT_ANSWERS,
  MAX_PUBLIC_REPORT_RUNS,
  selectPublicReportRuns,
} from "@/lib/public-visibility-integrity.mjs";
import { supabaseRest } from "@/lib/supabase-rest";

export type PublicVisibilityReport = { available: boolean; domain: string; organization?: string; observedAt?: string; runs?: number; providerCoverage?: number; latestBrandPresence?: number; totalAnswers?: number; totalCitations?: number; sourceCount?: number; withheldReason?: string; methodology: string };

type PublicRunRow = { id: string; status: string; provider_ids: string[]; brand_presence_pct: number | string | null; answer_count: number; citation_count: number; completed_at: string | null };
type PublicAnswerRow = { id: string; run_id: string; prompt_key: string; provider: string; review_status: string; brand_present: boolean | null; citations_json: Array<{ url?: string }> | null };

export function canonicalReportDomain(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(cleaned)) return null;
  return cleaned;
}

function domainOf(value: string | null) { try { const url = new URL(value?.startsWith("http") ? value : `https://${value}`); return url.hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } }

const INCOMPLETE_EVIDENCE = "Public figures are withheld because the complete, fully human-verified answer set behind every included run could not be independently proven and reconciled with its recorded summary.";

/**
 * Public opt-in aggregates are derived only from the complete, independently
 * read and fully verified answer sets of the selected completed runs (#386).
 * Any truncation, mismatch, duplicate slot, or contradicted run counter
 * withholds the entire aggregate rather than publishing a partial figure.
 */
export async function loadPublicVisibilityReport(input: string): Promise<PublicVisibilityReport> {
  const domain = canonicalReportDomain(input); const methodology = "Public reports use only complete, fully human-verified answer sets from completed runs belonging to the organization whose canonical website matches this domain. Every figure is recomputed from those answers and withheld if any included run cannot be independently reconciled. Cited URLs are those returned by providers in verified answers; a returned URL does not prove that the source supported or caused a recommendation. No result is estimated from another customer.";
  if (!domain || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { available: false, domain: domain || input, methodology };
  const organizations = await supabaseRest<Array<{ id: string; name: string; website: string | null }>>("organizations?select=id,name,website&public_report_enabled=eq.true&limit=1000", { serviceRole: true });
  const organization = organizations.find((row) => domainOf(row.website) === domain); if (!organization) return { available: false, domain, methodology };
  const runs = await supabaseRest<PublicRunRow[]>(`runs?select=id,status,provider_ids,brand_presence_pct,answer_count,citation_count,completed_at&organization_id=eq.${organization.id}&status=eq.complete&order=completed_at.desc&limit=${MAX_PUBLIC_REPORT_RUNS}`, { serviceRole: true });
  if (!runs.length) return { available: false, domain, organization: organization.name, methodology };

  const selection = selectPublicReportRuns(runs);
  if (!selection.ok) return { available: false, domain, organization: organization.name, withheldReason: INCOMPLETE_EVIDENCE, methodology };
  const selectedRuns = selection.runs as PublicRunRow[];
  const answers = await supabaseRest<PublicAnswerRow[]>(
    `run_answers?select=id,run_id,prompt_key,provider,review_status,brand_present,citations_json&organization_id=eq.${organization.id}&run_id=in.(${selectedRuns.map((run) => run.id).join(",")})&review_status=eq.verified&order=collected_at.asc&limit=${MAX_PUBLIC_REPORT_ANSWERS}`,
    { serviceRole: true },
  );
  const assessment = assessPublicVisibilityAggregate(selectedRuns, answers, canonicalizeEvidenceUrl);
  if (!assessment.ok || !assessment.aggregate) return { available: false, domain, organization: organization.name, withheldReason: INCOMPLETE_EVIDENCE, methodology };
  const aggregate = assessment.aggregate;
  return { available: true, domain, organization: organization.name, observedAt: selectedRuns[0].completed_at || undefined, runs: aggregate.runs, providerCoverage: aggregate.providerCoverage, latestBrandPresence: aggregate.latestBrandPresence ?? undefined, totalAnswers: aggregate.totalAnswers, totalCitations: aggregate.totalCitations, sourceCount: aggregate.citedUrlCount, methodology };
}
