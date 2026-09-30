import { supabaseRest } from "@/lib/supabase-rest";
import { assessPublicReportEvidence, PUBLIC_REPORT_ANSWER_READ_LIMIT } from "./public-visibility-evidence.mjs";

export type PublicVisibilityReport = { available: boolean; domain: string; organization?: string; observedAt?: string; runs?: number; providerCoverage?: number; latestBrandPresence?: number; totalAnswers?: number; totalCitations?: number; sourceCount?: number; methodology: string };

export function canonicalReportDomain(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(cleaned)) return null;
  return cleaned;
}

function domainOf(value: string | null) {
  try {
    const url = new URL(value?.startsWith("http") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return ""; }
}

type PublicRunRow = {
  id: string; status: string; provider_ids: string[]; brand_presence_pct: number | string;
  answer_count: number; citation_count: number; completed_at: string | null;
};
type PublicAnswerRow = {
  id: string; run_id: string; prompt_key: string; provider: string;
  review_status: string; brand_present: boolean | null;
  citations_json: Array<{ url: string }> | null;
};

export async function loadPublicVisibilityReport(input: string): Promise<PublicVisibilityReport> {
  const domain = canonicalReportDomain(input);
  const methodology = "Public reports require explicit organization opt-in and independently complete, human-verified answer sets for each included completed run. Recorded source URLs and review status do not independently prove citation relevance, factual accuracy, market coverage or causation.";
  if (!domain || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { available: false, domain: domain || input, methodology };
  const organizations = await supabaseRest<Array<{ id: string; name: string; website: string | null }>>(
    "organizations?select=id,name,website&public_report_enabled=eq.true&limit=1000",
    { serviceRole: true },
  );
  const organization = organizations.find((row) => domainOf(row.website) === domain);
  if (!organization) return { available: false, domain, methodology };

  const runs = await supabaseRest<PublicRunRow[]>(
    `runs?select=id,status,provider_ids,brand_presence_pct,answer_count,citation_count,completed_at&organization_id=eq.${organization.id}&status=eq.complete&order=completed_at.desc&limit=52`,
    { serviceRole: true },
  );
  if (!runs.length) return { available: false, domain, organization: organization.name, methodology };
  // Check independent recorded denominators BEFORE even fetching answer text or
  // allocating the anonymous public report's bounded answer read.
  const expected = runs.reduce((total, run) => total + Number(run.answer_count || 0), 0);
  if (!Number.isSafeInteger(expected) || expected < 1 || expected >= PUBLIC_REPORT_ANSWER_READ_LIMIT) {
    return { available: false, domain, organization: organization.name, methodology };
  }

  const ids = runs.map((run) => run.id);
  // Data is read server-only under the explicit opted-in organization. Do not
  // include answer text, prompts or private source contents in public output.
  const answers = await supabaseRest<PublicAnswerRow[]>(
    `run_answers?select=id,run_id,prompt_key,provider,review_status,brand_present,citations_json&organization_id=eq.${organization.id}&run_id=in.(${ids.map(encodeURIComponent).join(",")})&order=collected_at.asc&limit=${PUBLIC_REPORT_ANSWER_READ_LIMIT}`,
    { serviceRole: true },
  );
  const assessment = assessPublicReportEvidence(runs, answers);
  if (!assessment.ok) {
    // An incomplete or inconsistent public batch is not silently reduced to a
    // matching subset and no unsafe aggregate is published.
    return { available: false, domain, organization: organization.name, methodology };
  }

  const sources = await supabaseRest<Array<{ id: string }>>(
    `sources?select=id&organization_id=eq.${organization.id}&limit=5001`,
    { serviceRole: true },
  );
  return {
    available: true,
    domain,
    organization: organization.name,
    observedAt: runs[0].completed_at || undefined,
    runs: runs.length,
    providerCoverage: assessment.providerCoverage,
    latestBrandPresence: assessment.latestBrandPresence,
    totalAnswers: assessment.totalAnswers,
    totalCitations: assessment.totalCitations,
    // A full source-table count describes organization records, not the exact
    // 52 included runs. Withhold it if the bounded read saturates.
    sourceCount: sources.length <= 5000 ? sources.length : undefined,
    methodology,
  };
}
