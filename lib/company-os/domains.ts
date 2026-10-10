export const COMPANY_OS_DOMAIN_IDS = [
  "founder_governance",
  "strategy_chief_of_staff",
  "business_operations",
  "product",
  "design_experience",
  "engineering",
  "platform_infrastructure_sre",
  "ai_research_data",
  "security_trust",
  "marketing",
  "growth",
  "sales",
  "revenue_operations",
  "customer_experience",
  "partnerships_ecosystem",
  "capital_fundraising",
  "investor_relations_corporate_finance",
  "finance",
  "legal_corporate_affairs",
  "risk_compliance_internal_audit",
  "people_talent",
  "enterprise_technology_internal_it",
  "procurement_vendor_management",
  "corporate_development_expansion",
  "knowledge_quality_company_intelligence",
  "distribution_influence_network",
  "resource_compute",
  "service_to_software",
  "evolution",
  "enterprise_value_scale",
] as const;

export type CompanyOsDomainId = (typeof COMPANY_OS_DOMAIN_IDS)[number];

export type CompanyOsDomain = {
  id: CompanyOsDomainId;
  permanent: boolean;
  initiallyActive: boolean;
  purpose: string;
  coreCapabilities: readonly string[];
};

export const COMPANY_OS_DOMAINS: readonly CompanyOsDomain[] = [
  {
    id: "founder_governance",
    permanent: true,
    initiallyActive: true,
    purpose: "Mission, constitution, reserved matters, approvals, board/owner governance, founder continuity and attention allocation.",
    coreCapabilities: ["constitution","decision_room","reserved_matters","board_governance","founder_continuity","attention_governor"],
  },
  {
    id: "strategy_chief_of_staff",
    permanent: true,
    initiallyActive: true,
    purpose: "Objective graph, strategy, assumptions, scenarios, constraint detection, prioritization and company-wide coordination.",
    coreCapabilities: ["objective_graph","strategy_engine","assumption_registry","scenario_planning","constraint_intelligence","opportunity_cost"],
  },
  {
    id: "business_operations",
    permanent: true,
    initiallyActive: true,
    purpose: "Cross-functional operating cadence, task ledger, SOPs, commitments, escalations and company reviews.",
    coreCapabilities: ["task_ledger","operating_cadence","commitment_ledger","escalations","daily_brief","weekly_monthly_quarterly_reviews"],
  },
  {
    id: "product",
    permanent: true,
    initiallyActive: true,
    purpose: "Customer problem discovery, roadmap, portfolio, product truth, activation, retention and monetizable product outcomes.",
    coreCapabilities: ["product_discovery","roadmap","portfolio","activation","retention","product_truth","pricing_packaging"],
  },
  {
    id: "design_experience",
    permanent: true,
    initiallyActive: false,
    purpose: "UX research, interaction design, accessibility, design systems and customer experience quality.",
    coreCapabilities: ["ux_research","design_system","accessibility","journey_design","usability_quality"],
  },
  {
    id: "engineering",
    permanent: true,
    initiallyActive: true,
    purpose: "Architecture, implementation, testing, migrations, CI/CD, release governance and technical debt.",
    coreCapabilities: ["rfc_adr","coding_workers","code_review","testing","ci_cd","migrations","release_management","rollback","technical_debt"],
  },
  {
    id: "platform_infrastructure_sre",
    permanent: true,
    initiallyActive: true,
    purpose: "Runtime reliability, capacity, queues, tracing, incident response, backup, restore and disaster recovery.",
    coreCapabilities: ["sre","capacity_planning","observability","incident_command","backup_restore","disaster_recovery","business_continuity"],
  },
  {
    id: "ai_research_data",
    permanent: true,
    initiallyActive: true,
    purpose: "Model routing, evaluations, research, data quality, memory, evidence, causal learning and AI governance.",
    coreCapabilities: ["model_router","model_registry","prompt_registry","evals","data_quality","evidence_graph","memory","causal_learning","ai_governance"],
  },
  {
    id: "security_trust",
    permanent: true,
    initiallyActive: true,
    purpose: "Identity, secrets, least privilege, AI-agent security, abuse protection, supply-chain security and trust operations.",
    coreCapabilities: ["identity","credential_broker","policy_as_code","agent_security","supply_chain","abuse_fraud","trust_center","security_reviews"],
  },
  {
    id: "marketing",
    permanent: true,
    initiallyActive: true,
    purpose: "Positioning, category creation, brand, content, research-led marketing and market education.",
    coreCapabilities: ["positioning","category_creation","brand","content_factory","research_as_distribution","market_education"],
  },
  {
    id: "growth",
    permanent: true,
    initiallyActive: true,
    purpose: "Acquisition experiments, PLG/free tools, conversion, virality and channel economics.",
    coreCapabilities: ["growth_experiments","plg","free_tools","conversion","virality","channel_economics"],
  },
  {
    id: "sales",
    permanent: true,
    initiallyActive: true,
    purpose: "Account discovery, qualification, outreach, meetings, pilots, commercial negotiation and closing.",
    coreCapabilities: ["account_discovery","qualification","outreach","meeting_prep","pilots","deal_desk","closing"],
  },
  {
    id: "revenue_operations",
    permanent: true,
    initiallyActive: true,
    purpose: "CRM, pipeline, attribution, sales capacity, forecasting, sender control and commercial policy.",
    coreCapabilities: ["crm","pipeline","attribution","forecasting","sales_capacity","sender_control","commercial_policy"],
  },
  {
    id: "customer_experience",
    permanent: true,
    initiallyActive: true,
    purpose: "Onboarding, support, success, health, retention, expansion, promises and advocacy.",
    coreCapabilities: ["onboarding","support","customer_success","health","retention","expansion","promise_ledger","advocacy"],
  },
  {
    id: "partnerships_ecosystem",
    permanent: true,
    initiallyActive: false,
    purpose: "Technology, channel, strategic, developer and co-marketing partnerships plus ecosystem economics.",
    coreCapabilities: ["partner_discovery","partner_crm","partner_economics","channel_conflict","co_marketing","developer_ecosystem"],
  },
  {
    id: "capital_fundraising",
    permanent: true,
    initiallyActive: true,
    purpose: "Investors, accelerators, fellowships, grants, competitions, startup credits and non-dilutive capital.",
    coreCapabilities: ["funding_radar","investor_research","accelerators","fellowships","grants","competitions","startup_credits","application_factory"],
  },
  {
    id: "investor_relations_corporate_finance",
    permanent: true,
    initiallyActive: false,
    purpose: "Investor CRM, fundraising process, data room, cap table, dilution, term-sheet support and strategic finance.",
    coreCapabilities: ["investor_crm","data_room","cap_table","dilution","term_sheet_analysis","financial_model","round_strategy"],
  },
  {
    id: "finance",
    permanent: true,
    initiallyActive: true,
    purpose: "Accounting truth, revenue quality, margins, cash, runway, treasury, collections and operating leverage.",
    coreCapabilities: ["financial_ledger","monthly_close","revenue_quality","gross_margin","unit_economics","cash_runway","treasury","collections","fraud_controls"],
  },
  {
    id: "legal_corporate_affairs",
    permanent: true,
    initiallyActive: false,
    purpose: "Entity governance, contracts, IP, privacy, records, corporate communications and legal workflow.",
    coreCapabilities: ["entity_governance","contracts","ip","privacy","records_management","corporate_communications","legal_holds"],
  },
  {
    id: "risk_compliance_internal_audit",
    permanent: true,
    initiallyActive: true,
    purpose: "Enterprise risk, controls, audit evidence, regulatory intelligence, insurance and compliance readiness.",
    coreCapabilities: ["risk_registry","internal_controls","control_testing","regulatory_intelligence","insurance","vendor_risk","audit_evidence"],
  },
  {
    id: "people_talent",
    permanent: true,
    initiallyActive: false,
    purpose: "Talent radar, hiring triggers, compensation/equity, management systems, culture, succession and alumni network.",
    coreCapabilities: ["talent_radar","hiring_triggers","compensation","employee_equity","performance","culture","succession","alumni_network"],
  },
  {
    id: "enterprise_technology_internal_it",
    permanent: true,
    initiallyActive: false,
    purpose: "Identity lifecycle, devices, internal SaaS, endpoint security and internal technology operations.",
    coreCapabilities: ["internal_identity","device_management","saas_inventory","endpoint_security","access_reviews"],
  },
  {
    id: "procurement_vendor_management",
    permanent: true,
    initiallyActive: false,
    purpose: "Vendor discovery, procurement, contracts, concentration, renewal and exit readiness.",
    coreCapabilities: ["vendor_discovery","procurement","vendor_due_diligence","renewals","vendor_concentration","vendor_exit_tests"],
  },
  {
    id: "corporate_development_expansion",
    permanent: true,
    initiallyActive: false,
    purpose: "M&A, strategic alternatives, international expansion, localization and portfolio capital allocation.",
    coreCapabilities: ["ma","integration_playbook","strategic_alternatives","internationalization","localization","portfolio_allocation"],
  },
  {
    id: "knowledge_quality_company_intelligence",
    permanent: true,
    initiallyActive: true,
    purpose: "World radar, competitor twins, technology radar, proven playbooks, failure library, knowledge quality and unknown-unknown discovery.",
    coreCapabilities: ["world_radar","competitor_twins","technology_radar","playbook_lab","failure_library","knowledge_quality","coverage_auditor","unknown_unknown_engine"],
  },
  {
    id: "distribution_influence_network",
    permanent: true,
    initiallyActive: true,
    purpose: "Founder/corporate social, listening, community, media, analysts, creators, podcasts, events and relationship capital.",
    coreCapabilities: ["founder_brand","corporate_social","social_listening","social_selling","community","media_pr","analyst_relations","creator_relations","podcasts","events","relationship_graph"],
  },
  {
    id: "resource_compute",
    permanent: true,
    initiallyActive: true,
    purpose: "Model/API/provider marketplace, startup credits, free tiers, OSS discovery, compute routing and cost arbitrage.",
    coreCapabilities: ["resource_hunter","credit_treasury","compute_broker","model_marketplace","oss_radar","build_buy_integrate_decisions"],
  },
  {
    id: "service_to_software",
    permanent: true,
    initiallyActive: true,
    purpose: "Turn high-touch customer work into repeatable workflows, automation and eventually software features.",
    coreCapabilities: ["service_delivery","workflow_capture","productization_detector","manual_to_auto_ladder","customer_language_learning"],
  },
  {
    id: "evolution",
    permanent: true,
    initiallyActive: true,
    purpose: "Agent/skill creation, evaluation, promotion/demotion, architecture improvement, simplification and institutional learning.",
    coreCapabilities: ["agent_factory","skill_factory","scorecards","promotion","demotion","architecture_drift","simplification","institutional_learning"],
  },
  {
    id: "enterprise_value_scale",
    permanent: true,
    initiallyActive: true,
    purpose: "PMF evidence, retention, pricing power, margins, moats, distribution, concentration risk, scale readiness and strategic optionality.",
    coreCapabilities: ["pmf_evidence","retention","pricing_power","margin_engine","moat_engine","concentration_risk","scale_readiness","stage_governor","billion_dollar_scoreboard","optionality"],
  },
] as const;

export function validateCompanyOsDomains(domains: readonly CompanyOsDomain[] = COMPANY_OS_DOMAINS) {
  const ids = new Set<string>();
  for (const domain of domains) {
    if (ids.has(domain.id)) throw new Error("COMPANY_OS_DOMAIN_ID_DUPLICATE");
    ids.add(domain.id);
    if (!domain.purpose.trim()) throw new Error("COMPANY_OS_DOMAIN_PURPOSE_REQUIRED");
    if (!domain.coreCapabilities.length) throw new Error("COMPANY_OS_DOMAIN_CAPABILITIES_REQUIRED");
  }
  return { valid: true as const, count: domains.length };
}
