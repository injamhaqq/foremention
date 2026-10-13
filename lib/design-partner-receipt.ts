import { supabaseRest } from "@/lib/supabase-rest";
import { isValidDesignPartnerIntakeId } from "./design-partner-intake-id.ts";

/**
 * An untrusted ?submitted=1 query parameter is not evidence of a database
 * write. Never fetch fields besides id, expose lookup errors or change rows.
 */
export async function hasPersistedDesignPartnerReceipt(intakeId: unknown): Promise<boolean> {
  if (!isValidDesignPartnerIntakeId(intakeId)) return false;
  try {
    const rows = await supabaseRest<Array<{ id: string }>>(
      `design_partner_applications?select=id&id=eq.${intakeId}&limit=1`,
      { serviceRole: true },
    );
    return Array.isArray(rows) && rows.length === 1 && rows[0]?.id?.toLowerCase() === intakeId.toLowerCase();
  } catch {
    return false;
  }
}
