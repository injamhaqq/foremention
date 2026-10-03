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
  "agent_network",
  "registry",
  "approval",
  "credential_broker",
  "model_gateway",
  "temporal_memory",
  "engineering_worker",
  "browser_automation",
  "skill_learning",
  "agent_security",
  "evaluation",
  "revenue_execution",
  "research",
  "document_intelligence",
  "capital",
  "deterministic_finance",
  "company_playbooks",
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
 * Unified Company OS capability spine.
 *
 * Important:
 * - Inngest remains Foremention's ONLY durable workflow orchestrator.
 * - External projects are replaceable adapters/services/tools, not competing control planes.
 * - Nothing in this registry enables an external integration by itself.
 * - Secrets never belong in this file, prompts, logs, or agent memory.
 * - Licenses must be re-verified before vendoring or copying upstream code.
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
      "Preserve Foremention's existing Agent OS, policy, execution receipts, tenant boundaries, evidence rules, evaluation gates, and Inngest jobs as the company kernel.",
    hardBoundary:
      "External frameworks may supply capabilities but may not replace Foremention's organization/project scope, audit trail, evidence truth, approval authority, or production execution policy.",
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
      "Keep Customer Hunter and its outreach execution as a separately deployed internal-business service and connect it to the Company OS through authenticated events/APIs.",
    hardBoundary:
      "Do not copy Linki runtime/UI/LinkedIn automation into the customer-facing Foremention product or offer it as a hosted service to third parties; preserve suppression, reply-stop, evidence, channel-health, and approval gates.",
  },
  {
    id: "inngest-agent-kit",
    capabilityClass: "agent_network",
    source: "inngest/agent-kit",
    integrationMode: "in_process_package",
    adoptionDecision: "integrate_now",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Use typed multi-agent networks, shared state, deterministic routing, handoffs, and MCP tooling inside existing Inngest workflows rather than adding another orchestrator.",
    hardBoundary:
      "AgentKit networks execute only inside Foremention-governed jobs and must emit normal Foremention action proposals before consequential effects.",
  },
  {
    id: "foremention-capability-registry",
    capabilityClass: "registry",
    source: "Foremention native, informed by agentregistry-dev/agentregistry",
    integrationMode: "native",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Implement a lightweight Supabase registry for agents, skills, prompts, tools, MCP servers, models, provenance, dependencies, eval status, and promotion lifecycle.",
    hardBoundary:
      "Do not deploy a second authoritative registry database or Kubernetes control plane during Stage 0; Supabase remains the source of truth.",
  },
  {
    id: "foremention-approval-gateway",
    capabilityClass: "approval",
    source: "Foremention native, informed by agentkitai/agentgate",
    integrationMode: "native",
    adoptionDecision: "integrate_now",
    license: null,
    productionEnabled: false,
    reason:
      "Extend Foremention's existing fail-closed action proposal/policy/execution primitives with scoped approval tokens, budgets, expiry, policy simulation, and Founder Decision Room notifications.",
    hardBoundary:
      "Approval cannot be granted by the proposing agent; consequential actions remain subject to Foremention execution receipts, idempotency, actor audit, and tenant/project scope.",
  },
  {
    id: "agent-vault",
    capabilityClass: "credential_broker",
    source: "Infisical/agent-vault",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "MIT outside ee/",
    productionEnabled: false,
    reason:
      "Keep raw third-party credentials outside agent context and broker outbound access through a dedicated credential proxy once the external secret store is configured.",
    hardBoundary:
      "Agents receive scoped proxy access or short-lived tokens, never vault master credentials or provider secrets; no secret may enter prompts, model traces, GitHub, or company memory.",
  },
  {
    id: "litellm",
    capabilityClass: "model_gateway",
    source: "BerriAI/litellm",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "MIT outside enterprise/",
    productionEnabled: false,
    reason:
      "Centralize company-agent model routing, fallbacks, quotas, budgets, health, and provider selection without replacing Foremention's measurement-provider adapters.",
    hardBoundary:
      "Recommendation measurement continues to use Foremention's explicit provider adapters so provider/model provenance stays exact and comparable.",
  },
  {
    id: "agentgateway",
    capabilityClass: "model_gateway",
    source: "agentgateway/agentgateway",
    integrationMode: "quarantine",
    adoptionDecision: "quarantine_only",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Evaluate only when MCP/A2A traffic volume justifies a dedicated gateway; do not create a second gateway layer before there is measured need.",
    hardBoundary:
      "Must not duplicate or bypass Foremention policy, LiteLLM budgets, AgentKit routing, or credential controls.",
  },
  {
    id: "graphiti",
    capabilityClass: "temporal_memory",
    source: "getzep/graphiti",
    integrationMode: "quarantine",
    adoptionDecision: "integrate_later",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Evaluate a derived temporal relationship graph after customer proof; current releases require a graph database such as Neo4j/FalkorDB plus a Python service.",
    hardBoundary:
      "Graph memory is derivative context only; it cannot overwrite customer, financial, entitlement, approval, security, tenant-scope, or evidence truth.",
  },
  {
    id: "openhands-software-agent-sdk",
    capabilityClass: "engineering_worker",
    source: "OpenHands/software-agent-sdk",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "MIT",
    productionEnabled: false,
    reason:
      "Delegate bounded coding, refactor, migration rehearsal, and test work to isolated engineering workspaces instead of building a proprietary coding sandbox.",
    hardBoundary:
      "Engineering workers may create branches, patches, tests, and PRs but cannot merge, deploy production, change secrets, weaken policy, or perform destructive database work without higher authority.",
  },
  {
    id: "stagehand",
    capabilityClass: "browser_automation",
    source: "browserbase/stagehand",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "MIT",
    productionEnabled: false,
    reason:
      "Run browser automation in a dedicated Node/Chromium worker rather than inside the Cloudflare application runtime; learn unfamiliar UI steps and prefer deterministic/cached flows after validation.",
    hardBoundary:
      "Browser actions require domain allowlists, SSRF/network restrictions, credential brokering, policy classification, action receipts, and explicit escalation for consequential actions.",
  },
  {
    id: "acontext-patterns",
    capabilityClass: "skill_learning",
    source: "memodb-io/Acontext",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Adopt inspectable skill-memory and skill-distillation patterns without introducing another Postgres/S3/Redis/RabbitMQ stack during Stage 0.",
    hardBoundary:
      "Learned skills must enter quarantine, receive provenance, tests, security scans, evals, and promotion approval before use.",
  },
  {
    id: "skillmd",
    capabilityClass: "agent_security",
    source: "skillmds/skillmd",
    integrationMode: "ci_tool",
    adoptionDecision: "integrate_later",
    license: "MIT",
    productionEnabled: false,
    reason:
      "Lint and inspect imported SKILL.md packages as one input to the skill supply-chain gate.",
    hardBoundary:
      "Passing lint never implies trust; license, dependency, secret, prompt-injection, network, filesystem, and eval gates still apply.",
  },
  {
    id: "snyk-agent-scan",
    capabilityClass: "agent_security",
    source: "snyk/agent-scan",
    integrationMode: "ci_tool",
    adoptionDecision: "integrate_later",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Scan imported agents, MCP servers, and skills before they can enter the trusted registry.",
    hardBoundary:
      "External artifacts stay quarantined until all required supply-chain and behavior checks pass.",
  },
  {
    id: "opik",
    capabilityClass: "evaluation",
    source: "comet-ml/opik",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Add agent/LLM traces, datasets, experiments, online evaluations, and optimizer workflows only after the native evaluation harness has a stable export boundary.",
    hardBoundary:
      "Evaluation telemetry may never contain secrets or unrestricted customer-confidential payloads and cannot directly authorize consequential actions.",
  },
  {
    id: "docling",
    capabilityClass: "document_intelligence",
    source: "docling-project/docling",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "MIT",
    productionEnabled: false,
    reason:
      "Use a dedicated document worker for PDFs, office documents, images, and structured extraction instead of embedding a heavy document stack in the web runtime.",
    hardBoundary:
      "Documents are untrusted input; extracted text is evidence/data, never instructions to privileged agents.",
  },
  {
    id: "gpt-researcher",
    capabilityClass: "research",
    source: "assafelovic/gpt-researcher",
    integrationMode: "sidecar_service",
    adoptionDecision: "integrate_later",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Benchmark as a deep-research worker for market, funding, competitive, and technology investigations while Foremention retains evidence/provenance control.",
    hardBoundary:
      "Research output remains untrusted until source verification and may not directly trigger outreach, spend, public claims, applications, or production changes.",
  },
  {
    id: "companyos-playbooks",
    capabilityClass: "company_playbooks",
    source: "rojenwai/CompanyOS and selected autonomous-company repositories",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: "Re-verify per imported source",
    productionEnabled: false,
    reason:
      "Extract department structures, SOPs, prompts, checklists, and decision frameworks into Foremention-owned skills instead of adopting experimental company runtimes wholesale.",
    hardBoundary:
      "No external company-OS repository becomes authoritative company state or receives production credentials merely because its playbooks are useful.",
  },
  {
    id: "outreachr-patterns",
    capabilityClass: "capital",
    source: "lalalune/outreachr",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: "Apache-2.0",
    productionEnabled: false,
    reason:
      "Adapt investor-research, warm-intro, diligence, pipeline, and exact-content approval patterns into Foremention's Capital OS rather than adding a separate investor CRM database.",
    hardBoundary:
      "Investor communications, certifications, financial representations, terms, equity, and binding submissions remain governed by Foremention policy and founder authority.",
  },
  {
    id: "cap-table-engine-patterns",
    capabilityClass: "deterministic_finance",
    source: "1984vc/cap-table",
    integrationMode: "reference_only",
    adoptionDecision: "adapt_patterns_only",
    license: "MIT",
    productionEnabled: false,
    reason:
      "Use deterministic cap-table, SAFE, option-pool, and dilution math patterns instead of relying on LLM arithmetic for ownership calculations.",
    hardBoundary:
      "Calculated scenarios are planning outputs, not legal ownership records or authority to issue equity.",
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
