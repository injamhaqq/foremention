import { COMPANY_AGENT_SPECS } from "./agents.ts";
import { COMPANY_SKILL_SPECS } from "./skills.ts";
import { OPERATING_AGENT_IDS, type OperatingAgentId } from "../agent-os/contracts.ts";

export const COMPANY_DRAFT_SKILL_PACKAGES = [
  {
    id: "funding-eligibility", version: "0.1.0", stage: "draft_only",
    instructionPath: "company-skills/funding-eligibility/SKILL.md",
    handler: "prepareFundingDraft",
    assignments: [
      { agentId: "grant_agent", skillId: "grant-eligibility" },
      { agentId: "accelerator_agent", skillId: "accelerator-eligibility" },
      { agentId: "fellowship_agent", skillId: "fellowship-eligibility" },
      { agentId: "startup_credit_agent", skillId: "credit-eligibility" },
    ],
    productionExecutable: false,
  },
  {
    id: "funding-application-pack", version: "0.1.0", stage: "draft_only",
    instructionPath: "company-skills/funding-application-pack/SKILL.md",
    handler: "prepareFundingDraft",
    assignments: [
      { agentId: "application_agent", skillId: "application-answer-library" },
      { agentId: "application_agent", skillId: "document-packaging" },
      { agentId: "application_agent", skillId: "fact-check" },
    ],
    productionExecutable: false,
  },
] as const;

export type CompanyRuntimeBinding = {
  catalogueAgentId: string;
  nativeAgentId: OperatingAgentId | null;
  status: "native_identity_reference" | "draft_artifact_only" | "catalogue_only";
  productionExecutable: false;
  packageIds: string[];
};

/** A lookup/reference layer, not permission to use the existing native executor.
 * New catalogue IDs must not be sent to agent_actions without an explicit migration.
 */
export function resolveCompanyRuntimeBinding(agentId: string): CompanyRuntimeBinding | null {
  if (!COMPANY_AGENT_SPECS.some((agent) => agent.id === agentId)) return null;
  const nativeAgentId: OperatingAgentId | null = agentId === "support_agent" ? "support" : null;
  const packageIds = COMPANY_DRAFT_SKILL_PACKAGES.filter((manifest) => manifest.assignments.some((assignment) => assignment.agentId === agentId)).map((manifest) => manifest.id);
  return { catalogueAgentId: agentId, nativeAgentId, status: nativeAgentId ? "native_identity_reference" : packageIds.length ? "draft_artifact_only" : "catalogue_only", productionExecutable: false, packageIds };
}

export function validateCompanySkillPackages(): { valid: boolean; count: number; errors: string[] } {
  const errors: string[] = [];
  const skillIds = new Set(COMPANY_SKILL_SPECS.map((skill) => skill.id));
  const seen = new Set<string>();
  for (const manifest of COMPANY_DRAFT_SKILL_PACKAGES) {
    if (seen.has(manifest.id)) errors.push("duplicate_package:" + manifest.id);
    seen.add(manifest.id);
    for (const assignment of manifest.assignments) {
      const agent = COMPANY_AGENT_SPECS.find((agent) => agent.id === assignment.agentId);
      if (!agent || !skillIds.has(assignment.skillId) || !agent.skills.includes(assignment.skillId)) errors.push("invalid_assignment:" + assignment.agentId + ":" + assignment.skillId);
    }
  }
  for (const agent of COMPANY_AGENT_SPECS) {
    const binding = resolveCompanyRuntimeBinding(agent.id)!;
    if (binding.nativeAgentId && !OPERATING_AGENT_IDS.includes(binding.nativeAgentId)) errors.push("unknown_native_identity:" + binding.nativeAgentId);
  }
  return { valid: !errors.length, count: seen.size, errors };
}
