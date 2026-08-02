import { supabaseRest } from "@/lib/supabase-rest";

export type PublicVisibilityReport = { available: boolean; domain: string; organization?: string; observedAt?: string; runs?: number; providerCoverage?: number; latestBrandPresence?: number; totalAnswers?: number; totalCitations?: number; sourceCount?: number; methodology: string };

export function canonicalReportDomain(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(cleaned)) return null;
  return cleaned;
}

function domainOf(value: string | null) { try { const url = new URL(value?.startsWith("http") ? value : `https://${value}`); return url.hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } }

export async function loadPublicVisibilityReport(input: string): Promise<PublicVisibilityReport> {
  const domain = canonicalReportDomain(input); const methodology = "Public reports use only human-reviewed completed runs belonging to the organization whose canonical website matches this domain. No result is estimated from another customer.";
  if (!domain || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { available: false, domain: domain || input, methodology };
  const organizations = await supabaseRest<Array<{ id: string; name: string; website: string | null }>>("organizations?select=id,name,website&public_report_enabled=eq.true&limit=1000", { serviceRole: true });
  const organization = organizations.find((row) => domainOf(row.website) === domain); if (!organization) return { available: false, domain, methodology };
  const [runs, sources] = await Promise.all([
    supabaseRest<Array<{ provider_ids: string[]; brand_presence_pct: number | string; answer_count: number; citation_count: number; completed_at: string | null }>>(`runs?select=provider_ids,brand_presence_pct,answer_count,citation_count,completed_at&organization_id=eq.${organization.id}&status=eq.complete&order=completed_at.desc&limit=52`, { serviceRole: true }),
    supabaseRest<Array<{ id: string }>>(`sources?select=id&organization_id=eq.${organization.id}&limit=5000`, { serviceRole: true }),
  ]);
  if (!runs.length) return { available: false, domain, organization: organization.name, methodology };
  return { available: true, domain, organization: organization.name, observedAt: runs[0].completed_at || undefined, runs: runs.length, providerCoverage: new Set(runs.flatMap((run) => run.provider_ids || [])).size, latestBrandPresence: Number(runs[0].brand_presence_pct || 0), totalAnswers: runs.reduce((sum, run) => sum + Number(run.answer_count || 0), 0), totalCitations: runs.reduce((sum, run) => sum + Number(run.citation_count || 0), 0), sourceCount: sources.length, methodology };
}
