export const COMPANY_OS_INTEGRATION_MODES = [
  "native",
  "in_process_package",
  "sidecar_service",
  "ci_tool",
  "reference_only",
  "quarantine",
] as const;

export type CompanyOsIntegrationMode =
  (typeof COMPANY_OS_INTEGRATION_MODES)[number];

export const COMPANY_OS_CAPABILITY_CLASSES = [
  "orchestration",
  "lifecycle_patterns",
  "registry",
  "approval",
  "credential_broker",
  "model_gateway",
  "evaluation",
  "browser_automation",
  "research",
  "connector_automation",
  "mcp_gateway",
  "observability",
  "authorization",
  "usage_metering",
  "temporal_memory",
  "engineering_worker",
  "agent_security",
  "document_intelligence",
  "capital",
  "supply_chain",
  "graph_ui",
  "website_visuals",
  "revenue_execution",
  "company_playbooks",
  "deterministic_finance",
] as const;

export type CompanyOsCapabilityClass =
  (typeof COMPANY_OS_CAPABILITY_CLASSES)[number];

export const COMPANY_OS_ADOPTION_DECISIONS = [
  "keep_native",
  "integrate_now",
  "integrate_later",
  "adapt_patterns_only",
  "quarantine_only",
] as const;

export type CompanyOsAdoptionDecision =
  (typeof COMPANY_OS_ADOPTION_DECISIONS)[number];

export type CompanyOsCapability = {
  id: string;
  capabilityClass: CompanyOsCapabilityClass;
  source: string;
  integrationMode: CompanyOsIntegrationMode;
  adoptionDecision: CompanyOsAdoptionDecision;
  license: string | null;
  productionEnabled: boolean;
  reason: string;
  hardBoundary: string;
};

/**
 * Current Company OS capability register.
 *
 * The 2026-10-05 Enterprise Company Automation OS blueprint supersedes the older
 * 2026-10-02 integration preferences where they conflict.
 *
 * Invariants:
 * - Foremention remains the company kernel and Supabase remains authoritative truth.
 * - Inngest remains the only durable workflow orchestrator.
 * - A registry entry never enables an upstream runtime by itself.
 * - Every source import still requires exact revision, path-level license review,
 *   dependency/supply-chain review, contracts, tests, upgrade ownership and exit plan.
 * - External gateways, workers, graphs and observability systems cannot become
 *   business authority, tenant scope, evidence truth, billing truth or release authority.
 */
export const COMPANY_OS_CAPABILITIES: readonly CompanyOsCapability[] = [
  {
    id: "foremention-agent-os",
    capabilityClass: "orchestration",
    source: "injamhaqq/foremention",
    integrationMode: "native",
    adoptionDecision: "keep_native",
    license: null,
    productionEnabled: true,
    reason:
      "Preserve Foremention's native controller, Governor, evidence/receipt model, tenant/project scope, Supabase truth and Inngest durable workflows as the company kernel.",
    hardBoundary:
      "No imported framework may replace organization/project scope, policy admission, approval authority, evidence truth, billing truth, audit receipts or production release authority.",
  },
  {
    id: "paperclip-patterns",
    capabilityClass: "lifecycle_patterns",
    source: "paperclipai/paperclip",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: null,
    productionEnabled: false,
    reason:
      "Adapt useful lease, heartbeat, lifecycle, attention-queue and budget mechanics into Foremention-native task contracts and recovery semantics.",
    hardBoundary:
      "Paperclip is not a second scheduler, database or company control plane; exact imported material and license must be reviewed before source reuse.",
  },
  {
    id: "foremention-capability-registry",
    capabilityClass: "registry",
    source: "Foremention native",
    integrationMode: "native",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Maintain approved versions and provenance for agents, skills, prompts, capabilities, models, MCP/connectors and evaluations inside the authoritative Foremention data model.",
    hardBoundary:
      "Registry metadata cannot grant permissions; runtime identity, scope, policy and current authority are validated separately at execution time.",
  },
  {
    id: "foremention-approval-gateway",
    capabilityClass: "approval",
    source: "Foremention native",
    integrationMode: "native",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Extend existing action proposals, grants, approvals, budgets and receipts into the Founder Decision Room without adding another approval database.",
    hardBoundary:
      "A proposing worker cannot approve its own consequential action, and initial task admission cannot authorize arbitrary future side effects.",
  },
  {
    id: "companyos-playbooks",
    capabilityClass: "company_playbooks",
    source: "rojenwai/CompanyOS",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: null,
    productionEnabled: false,
    reason:
      "Use department, role and SOP material as content inputs for one Foremention-owned handbook and executable skill catalogue.",
    hardBoundary:
      "Content templates do not become deployed agents, permissions or company truth; exact imported files require license review and deduplication.",
  },
  {
    id: "company-in-a-box-playbooks",
    capabilityClass: "company_playbooks",
    source: "fom-dev/company-in-a-box",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: null,
    productionEnabled: false,
    reason:
      "Adapt useful role contracts and operating playbooks where they fill a verified Foremention procedure gap.",
    hardBoundary:
      "Do not wholesale-copy the runtime or duplicate procedures already owned by Foremention; imported content requires exact revision and license review.",
  },
  {
    id: "portkey-gateway",
    capabilityClass: "model_gateway",
    source: "Portkey-AI/gateway",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Use as the selected internal company-agent model routing and fallback adapter when a gateway is needed.",
    hardBoundary:
      "Portkey routes model traffic only; it cannot grant business authority, hide provider/model identity for Recommendation measurements, bypass budget admission or overwrite Foremention receipts.",
  },
  {
    id: "promptfoo",
    capabilityClass: "evaluation",
    source: "promptfoo/promptfoo",
    integrationMode: "ci_tool",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Use the existing pinned zero-cost CI integration for deterministic prompt/provider/evidence regression and adversarial AI evaluation, and extend it alongside affected workflows.",
    hardBoundary:
      "Evaluation success is evidence for tested behavior only; Promptfoo never authorizes production actions and must not receive unrestricted customer-confidential material or secrets.",
  },
  {
    id: "stagehand",
    capabilityClass: "browser_automation",
    source: "browserbase/stagehand",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Use AI-assisted interaction for supported application portals inside an isolated Node/Chromium browser worker.",
    hardBoundary:
      "Stagehand stays outside the Cloudflare request runtime and requires allowed destinations, scoped session custody, action proposals, idempotency/reconciliation and human handoff for MFA/CAPTCHA or unsupported attestations.",
  },
  {
    id: "playwright",
    capabilityClass: "browser_automation",
    source: "microsoft/playwright",
    integrationMode: "in_process_package",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Use deterministic browser execution and readback verification in the isolated browser worker, including explicit interoperability with the selected Stagehand version.",
    hardBoundary:
      "Browser execution cannot bypass portal access controls, current authority, duplicate protection or final confirmation/receipt checks.",
  },
  {
    id: "crawlee",
    capabilityClass: "research",
    source: "apify/crawlee",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Use for bounded crawling/extraction and crawl queues when native source inspection is insufficient for an approved research task.",
    hardBoundary:
      "Crawlee queues remain subordinate to Company OS tasks, source/network policy and spend limits; public web content is untrusted data and never instructions.",
  },
  {
    id: "activepieces",
    capabilityClass: "connector_automation",
    source: "activepieces/activepieces",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_now",
    license: "Core/enterprise boundary requires exact-path review",
    productionEnabled: false,
    reason:
      "Use selected SaaS connectors as a sidecar or narrow adapters only where existing native connectors do not satisfy a real workflow.",
    hardBoundary:
      "Do not import enterprise-only areas or let connector transport authentication replace Foremention action authorization, project scope, credential custody or receipts.",
  },
  {
    id: "microsoft-mcp-gateway",
    capabilityClass: "mcp_gateway",
    source: "microsoft/mcp-gateway",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Retain as the selected later MCP routing/server-lifecycle option only when fleet size and Kubernetes-oriented hosting justify it.",
    hardBoundary:
      "Do not introduce Kubernetes or another gateway merely to host optional tools; Foremention capability authorization remains authoritative.",
  },
  {
    id: "langfuse",
    capabilityClass: "observability",
    source: "langfuse/langfuse",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_now",
    license: "Core/commercial boundary requires exact-path review",
    productionEnabled: false,
    reason:
      "Use as the selected AI trace/evaluation/cost-latency diagnostics backend, distinct from application errors and product analytics.",
    hardBoundary:
      "Langfuse diagnostics are not business receipts or authority; redact sensitive material and do not duplicate raw private profile/customer documents merely for observability.",
  },
  {
    id: "openfga",
    capabilityClass: "authorization",
    source: "openfga/openfga",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Keep as a later relationship-authorization option if native policy complexity becomes a measured limitation.",
    hardBoundary:
      "Supabase RLS and native action authorization remain in force; OpenFGA cannot become a bypass around tenant/project boundaries.",
  },
  {
    id: "openmeter",
    capabilityClass: "usage_metering",
    source: "openmeterio/openmeter",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Keep as a later usage aggregation/metering service when native spend reservations and billing reconciliation need a dedicated meter.",
    hardBoundary:
      "Native budget admission and verified billing/entitlement ledgers remain authoritative; metering events alone do not grant access or establish revenue.",
  },
  {
    id: "graphiti",
    capabilityClass: "temporal_memory",
    source: "getzep/graphiti",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Use only after a demonstrated temporal/relationship retrieval requirement; derived memory must be rebuildable from authoritative records.",
    hardBoundary:
      "Graph memory cannot overwrite customer, financial, entitlement, evidence, approval, permission or project truth, and deletion/freshness restrictions must propagate.",
  },
  {
    id: "candur-patterns",
    capabilityClass: "capital",
    source: "candur-ai/candur",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: null,
    productionEnabled: false,
    reason:
      "Adapt selected funding discovery/application concepts into native Capital OS contracts where they improve the verified workflow.",
    hardBoundary:
      "No imported fit score becomes an acceptance probability, and no candidate source overrides official program criteria/current-cycle verification.",
  },
  {
    id: "agent-vault-candidate",
    capabilityClass: "credential_broker",
    source: "Infisical/agent-vault",
    integrationMode: "quarantine",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Evaluate as a scoped credential-broker implementation after validating exact fit, maintenance, deployment and license boundaries.",
    hardBoundary:
      "Workers receive scoped operations or short-lived sessions, never vault master credentials/provider secrets in prompts, logs, traces, Git or company memory.",
  },
  {
    id: "openhands-software-agent-sdk",
    capabilityClass: "engineering_worker",
    source: "OpenHands/software-agent-sdk",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Use for bounded coding work only when existing engineering worker coverage is insufficient.",
    hardBoundary:
      "Engineering workers receive scoped snapshots/workspaces and may return patches/evidence but cannot merge, deploy production, mutate secrets, weaken policy or perform destructive database work without current authority.",
  },
  {
    id: "cosign",
    capabilityClass: "supply_chain",
    source: "sigstore/cosign",
    integrationMode: "ci_tool",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Extend existing artifact signing and verification where a concrete release-evidence gap remains.",
    hardBoundary:
      "A signature proves an identity/integrity relationship only; it does not establish that software is secure, approved or healthy in production.",
  },
  {
    id: "in-toto",
    capabilityClass: "supply_chain",
    source: "in-toto/in-toto",
    integrationMode: "ci_tool",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Extend build provenance and supply-chain evidence where current attestation coverage has a measured gap.",
    hardBoundary:
      "Provenance evidence complements, but never replaces, exact-SHA tests, trusted builder identity, deployment verification and production health checks.",
  },
  {
    id: "grantkit-patterns",
    capabilityClass: "capital",
    source: "GrantKit/grantkit",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: null,
    productionEnabled: false,
    reason:
      "Adapt program-specific application validation patterns into a versioned Capital OS checker where coverage is explicit.",
    hardBoundary:
      "Validation rules must name supported programs/versions and cannot certify unsupported portals, legal attestations or current eligibility.",
  },
  {
    id: "grantforge-patterns",
    capabilityClass: "capital",
    source: "ddanntheman/GrantForge",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: null,
    productionEnabled: false,
    reason:
      "Adapt useful funding intake, drafting and review procedures into executable native contracts.",
    hardBoundary:
      "Procedures cannot invent founder/company facts, skip official-source verification, or authorize external submission.",
  },
  {
    id: "docling",
    capabilityClass: "document_intelligence",
    source: "docling-project/docling",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Use a scoped document worker for PDFs/office/image extraction when native text handling is insufficient.",
    hardBoundary:
      "Documents are untrusted input; preserve page/source provenance and never treat extracted instructions as permission for privileged actions.",
  },
  {
    id: "xyflow",
    capabilityClass: "graph_ui",
    source: "xyflow/xyflow",
    integrationMode: "in_process_package",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Use for scoped operational/evidence graph views with bounded subgraphs and a list alternative.",
    hardBoundary:
      "The rendered graph is a view of controlled records; dragging nodes cannot edit authorization, execution state or authoritative relationships without normal validated APIs.",
  },
  {
    id: "react-three-fiber",
    capabilityClass: "website_visuals",
    source: "pmndrs/react-three-fiber",
    integrationMode: "in_process_package",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Use only where the public Foremention website benefits from a measured React-based Three.js scene.",
    hardBoundary:
      "Visual enhancement must degrade accessibly when WebGL/reduced-motion constraints apply and cannot block the primary conversion/product explanation path.",
  },
  {
    id: "three-js",
    capabilityClass: "website_visuals",
    source: "mrdoob/three.js",
    integrationMode: "in_process_package",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Retain as the underlying 3D rendering option for approved public website visuals.",
    hardBoundary:
      "Do not trade accessibility, performance, mobile comprehension or customer proof for decorative 3D complexity.",
  },
  {
    id: "motion",
    capabilityClass: "website_visuals",
    source: "motiondivision/motion",
    integrationMode: "in_process_package",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "Use for interface motion only where it improves comprehension and respects reduced-motion preferences.",
    hardBoundary:
      "Motion is presentation only and may not hide state, evidence, warnings, approvals or essential navigation.",
  },
  {
    id: "foremention-outreach",
    capabilityClass: "revenue_execution",
    source: "injamhaqq/foremention-outreach",
    integrationMode: "sidecar_service",
    adoptionDecision: "keep_native",
    license: "Linki Sustainable Use License",
    productionEnabled: false,
    reason:
      "Keep the existing internal Customer Hunter/outreach system as a separately deployed business sidecar connected through authenticated events/APIs.",
    hardBoundary:
      "Do not embed Linki runtime/UI/LinkedIn automation into the customer-facing Foremention product or offer it as a hosted service to third parties; keep suppression, reply-stop, evidence and sender-health controls.",
  },
  {
    id: "litellm-superseded",
    capabilityClass: "model_gateway",
    source: "BerriAI/litellm",
    integrationMode: "quarantine",
    adoptionDecision: "quarantine_only",
    license: null,
    productionEnabled: false,
    reason:
      "The 2026-10-05 blueprint selects Portkey for the current internal model-gateway slot; retain LiteLLM only as a future alternative if that decision is revisited with evidence.",
    hardBoundary:
      "Do not run two overlapping model gateways or route Recommendation measurements through an abstraction that obscures provider/model provenance.",
  },
  {
    id: "opik-superseded",
    capabilityClass: "observability",
    source: "comet-ml/opik",
    integrationMode: "quarantine",
    adoptionDecision: "quarantine_only",
    license: null,
    productionEnabled: false,
    reason:
      "The 2026-10-05 blueprint selects Langfuse for the current AI-observability slot; retain Opik only as an evaluated alternative.",
    hardBoundary:
      "Do not add a second equivalent tracing backend without a measured unmet requirement, data-processing review and explicit exit plan.",
  },
  {
    id: "agentkit-deferred",
    capabilityClass: "orchestration",
    source: "inngest/agent-kit",
    integrationMode: "quarantine",
    adoptionDecision: "integrate_later",
    license: null,
    productionEnabled: false,
    reason:
      "The current blueprint does not require AgentKit for the first integration wave; native Inngest/task contracts remain sufficient until a concrete multi-agent coordination gap is demonstrated.",
    hardBoundary:
      "If later admitted, AgentKit must remain inside Foremention-governed Inngest work and cannot become a second scheduler or authority system.",
  },
] as const;

export function validateCompanyOsCapabilitySpine(
  capabilities: readonly CompanyOsCapability[] = COMPANY_OS_CAPABILITIES,
) {
  const ids = new Set<string>();

  for (const capability of capabilities) {
    if (!capability.id.trim()) throw new Error("COMPANY_OS_CAPABILITY_ID_REQUIRED");
    if (ids.has(capability.id)) throw new Error("COMPANY_OS_CAPABILITY_ID_DUPLICATE");
    ids.add(capability.id);

    if (!capability.source.trim()) throw new Error("COMPANY_OS_CAPABILITY_SOURCE_REQUIRED");
    if (!capability.reason.trim()) throw new Error("COMPANY_OS_CAPABILITY_REASON_REQUIRED");
    if (!capability.hardBoundary.trim()) {
      throw new Error("COMPANY_OS_CAPABILITY_BOUNDARY_REQUIRED");
    }

    if (
      capability.productionEnabled
      && capability.integrationMode !== "native"
    ) {
      throw new Error("COMPANY_OS_EXTERNAL_CAPABILITY_MUST_START_DISABLED");
    }
  }

  return { valid: true as const, count: capabilities.length };
}
