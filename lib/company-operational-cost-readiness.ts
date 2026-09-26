import { supabaseRest } from "@/lib/supabase-rest";

export type CompanyOperationalCostReadiness = {
  period_start: string;
  observed_through: string;
  event_count: number;
  provider_reported_event_count: number;
  estimated_or_unknown_event_count: number;
  recorded_ai_cost_usd: string | number | null;
  recorded_external_ai_cost_usd: string | number | null;
  allocation_count: number;
  period_allocated_infrastructure_usd: string | number | null;
  period_external_allocated_infrastructure_usd: string | number | null;
  external_reviewed_decisions: number;
  terminal_attempts_missing_a_cost_ledger_entry: number;
  unclassified_organizations: number;
  recorded_external_ai_cost_per_reviewed_decision_usd: string | number | null;
  verified_total_cost_per_reviewed_decision_usd: string | number | null;
};

/** Company operator use only. Never expose this service-role aggregate in tenant APIs. */
export async function loadCompanyOperationalCostReadiness(): Promise<CompanyOperationalCostReadiness | null> {
  const rows = await supabaseRest<CompanyOperationalCostReadiness[]>(
    "company_operational_cost_readiness?select=*&limit=1",
    { serviceRole: true },
  );
  return rows[0] || null;
}
