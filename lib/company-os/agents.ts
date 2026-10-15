export type CompanyAgentSpec = {
  id: string;
  domain: string;
  purpose: string;
  defaultAutonomy: "auto" | "bounded" | "approval" | "never";
  skills: readonly string[];
};

export const COMPANY_AGENT_SPECS: readonly CompanyAgentSpec[] = [
  {id:"chief_of_staff",domain:"strategy_chief_of_staff",purpose:"Route company work, enforce objectives, detect constraints, coordinate departments.",defaultAutonomy:"bounded",skills:["objective-routing","constraint-analysis","decision-synthesis","company-brief"]},
  {id:"strategy_agent",domain:"strategy_chief_of_staff",purpose:"Market, category, scenario, resource-allocation and strategic-option analysis.",defaultAutonomy:"bounded",skills:["strategy-analysis","scenario-planning","market-sizing","opportunity-cost"]},
  {id:"contrarian_agent",domain:"strategy_chief_of_staff",purpose:"Challenge strategic assumptions and expose disconfirming evidence.",defaultAutonomy:"auto",skills:["red-team","pre-mortem","assumption-challenge"]},
  {id:"coverage_auditor",domain:"knowledge_quality_company_intelligence",purpose:"Continuously detect missing, obsolete or inferior company capabilities.",defaultAutonomy:"auto",skills:["capability-gap-analysis","github-research","technology-radar","unknown-unknown-search"]},

  {id:"product_brain",domain:"product",purpose:"Own product strategy, roadmap, discovery and value realization.",defaultAutonomy:"bounded",skills:["product-discovery","roadmap-prioritization","activation-analysis","retention-analysis"]},
  {id:"customer_research_agent",domain:"product",purpose:"Extract customer problems, language, decisions and unmet needs.",defaultAutonomy:"auto",skills:["customer-research","buyer-question-research","voc-synthesis"]},
  {id:"pricing_agent",domain:"product",purpose:"Analyze willingness-to-pay, packaging, pricing power and discount leakage.",defaultAutonomy:"bounded",skills:["pricing-analysis","packaging-analysis","willingness-to-pay","discount-analysis"]},
  {id:"design_research_agent",domain:"design_experience",purpose:"Usability, accessibility and customer-journey quality.",defaultAutonomy:"auto",skills:["ux-research","accessibility-review","journey-mapping"]},

  {id:"engineering_brain",domain:"engineering",purpose:"Own technical architecture, implementation sequencing and engineering quality.",defaultAutonomy:"bounded",skills:["architecture-rfc","repo-audit","implementation-plan","release-risk"]},
  {id:"coding_agent",domain:"engineering",purpose:"Implement bounded changes in isolated workspaces.",defaultAutonomy:"bounded",skills:["code-implementation","refactor","test-generation","dependency-upgrade"]},
  {id:"code_review_agent",domain:"engineering",purpose:"Independent correctness, maintainability and architecture review.",defaultAutonomy:"auto",skills:["code-review","architecture-review","regression-analysis"]},
  {id:"qa_agent",domain:"engineering",purpose:"Design and execute unit, integration, E2E, security and acceptance tests.",defaultAutonomy:"auto",skills:["test-design","test-generation","browser-acceptance","regression-testing"]},
  {id:"release_agent",domain:"engineering",purpose:"Stage, canary, release, verify and rollback under policy.",defaultAutonomy:"approval",skills:["release-management","canary","rollback","release-evidence"]},
  {id:"migration_agent",domain:"engineering",purpose:"Plan and verify database/schema migrations with restore safety.",defaultAutonomy:"approval",skills:["migration-planning","schema-diff","migration-verification","rollback"]},
  {id:"dependency_agent",domain:"engineering",purpose:"Track dependency advisories and prepare safe upgrades.",defaultAutonomy:"bounded",skills:["dependency-upgrade","sbom","vulnerability-triage"]},

  {id:"sre_agent",domain:"platform_infrastructure_sre",purpose:"Reliability, latency, capacity, queues and runtime health.",defaultAutonomy:"bounded",skills:["sre-monitoring","capacity-planning","queue-health","incident-triage"]},
  {id:"incident_commander",domain:"platform_infrastructure_sre",purpose:"Coordinate incidents and reversible containment.",defaultAutonomy:"bounded",skills:["incident-response","containment","status-communication","post-mortem"]},
  {id:"backup_restore_agent",domain:"platform_infrastructure_sre",purpose:"Backup integrity, restore drills and disaster recovery.",defaultAutonomy:"bounded",skills:["backup-audit","restore-test","disaster-recovery","business-continuity"]},

  {id:"ai_platform_agent",domain:"ai_research_data",purpose:"Models, prompts, evals, routing and AI-runtime governance.",defaultAutonomy:"bounded",skills:["model-routing","model-benchmark","prompt-eval","provider-fallback"]},
  {id:"data_quality_agent",domain:"ai_research_data",purpose:"Freshness, grain, missingness, duplicates, schema drift and data contracts.",defaultAutonomy:"auto",skills:["data-quality","schema-validation","lineage","freshness-monitoring"]},
  {id:"evidence_agent",domain:"ai_research_data",purpose:"Bind claims to sources, timestamps and confidence.",defaultAutonomy:"auto",skills:["source-evidence-verification","claim-grounding","provenance"]},
  {id:"research_agent",domain:"ai_research_data",purpose:"Deep public/private research with citations and source-quality checks.",defaultAutonomy:"auto",skills:["web-research","deep-research","document-ingestion","source-quality"]},

  {id:"security_brain",domain:"security_trust",purpose:"Security posture, threat model, agent security and enterprise trust.",defaultAutonomy:"bounded",skills:["security-review","threat-model","agent-security","enterprise-security"]},
  {id:"credential_broker_agent",domain:"security_trust",purpose:"Mediate scoped credential access without exposing raw secrets.",defaultAutonomy:"bounded",skills:["credential-request","oauth-scope-review","secret-rotation"]},
  {id:"agent_security_agent",domain:"security_trust",purpose:"Scan agent skills, MCPs, tools and untrusted context.",defaultAutonomy:"auto",skills:["prompt-injection-scan","mcp-security","skill-security","exfiltration-test"]},
  {id:"abuse_fraud_agent",domain:"security_trust",purpose:"Detect malicious users, trial abuse, fraud and suspicious automation.",defaultAutonomy:"bounded",skills:["abuse-detection","fraud-triage","rate-abuse","account-risk"]},

  {id:"marketing_brain",domain:"marketing",purpose:"Positioning, category, market education, brand and research-led marketing.",defaultAutonomy:"bounded",skills:["positioning","category-creation","brand-strategy","content-strategy"]},
  {id:"content_agent",domain:"marketing",purpose:"Create channel-native content from verified insights.",defaultAutonomy:"bounded",skills:["linkedin-content","instagram-content","facebook-content","x-content","newsletter","content-repurposing"]},
  {id:"seo_aeo_agent",domain:"marketing",purpose:"SEO, AEO/GEO, content opportunities and organic authority.",defaultAutonomy:"bounded",skills:["seo-research","aeo-research","content-gap","organic-opportunity"]},
  {id:"growth_agent",domain:"growth",purpose:"Acquisition experiments, free tools, virality and conversion.",defaultAutonomy:"bounded",skills:["growth-experiment","funnel-analysis","free-tool-design","virality-analysis"]},

  {id:"sales_brain",domain:"sales",purpose:"Qualification, account strategy, pilots, deal progression and closing.",defaultAutonomy:"bounded",skills:["prospect-qualification","account-research","meeting-preparation","pilot-design","deal-strategy"]},
  {id:"prospecting_agent",domain:"sales",purpose:"Discover and qualify ICP accounts and decision makers.",defaultAutonomy:"auto",skills:["lead-discovery","prospect-qualification","buyer-research"]},
  {id:"outreach_agent",domain:"sales",purpose:"Create and send policy-compliant outbound through approved infrastructure.",defaultAutonomy:"bounded",skills:["mini-audit","sales-email","follow-up","reply-classification"]},
  {id:"deal_desk_agent",domain:"sales",purpose:"Coordinate pricing, security, legal, procurement and exception approval.",defaultAutonomy:"approval",skills:["deal-desk","discount-policy","security-questionnaire","contract-triage"]},

  {id:"revops_agent",domain:"revenue_operations",purpose:"CRM truth, pipeline, attribution, forecast and sender controls.",defaultAutonomy:"bounded",skills:["crm-hygiene","pipeline-analysis","forecasting","attribution","sender-health"]},
  {id:"deliverability_agent",domain:"revenue_operations",purpose:"SPF/DKIM/DMARC, bounce, complaint, suppression and reputation health.",defaultAutonomy:"bounded",skills:["deliverability","dns-authentication","bounce-analysis","suppression"]},

  {id:"customer_success_brain",domain:"customer_experience",purpose:"Onboarding, health, outcomes, retention, expansion and advocacy.",defaultAutonomy:"bounded",skills:["customer-success","health-scoring","churn-risk","expansion-opportunity"]},
  {id:"support_agent",domain:"customer_experience",purpose:"Resolve routine customer questions and escalate sensitive issues.",defaultAutonomy:"bounded",skills:["support-response","issue-classification","knowledge-retrieval","escalation"]},
  {id:"onboarding_agent",domain:"customer_experience",purpose:"Drive setup, first run, Source X-Ray review and first useful insight.",defaultAutonomy:"bounded",skills:["onboarding","activation","customer-education"]},
  {id:"advocacy_agent",domain:"customer_experience",purpose:"Identify references, case studies, referrals and community champions.",defaultAutonomy:"bounded",skills:["customer-advocacy","case-study","referral","referenceability"]},

  {id:"partnerships_agent",domain:"partnerships_ecosystem",purpose:"Discover and manage technology, channel, strategic and ecosystem partners.",defaultAutonomy:"bounded",skills:["partnership-research","partner-fit","partner-economics","co-marketing"]},

  {id:"capital_brain",domain:"capital_fundraising",purpose:"Coordinate all equity, non-dilutive, credit and accelerator capital opportunities.",defaultAutonomy:"bounded",skills:["funding-strategy","funding-radar","capital-prioritization","application-portfolio"]},
  {id:"investor_research_agent",domain:"capital_fundraising",purpose:"Discover and score investors by thesis, stage, geography and warm path.",defaultAutonomy:"auto",skills:["investor-research","investor-fit","warm-intro-path"]},
  {id:"accelerator_agent",domain:"capital_fundraising",purpose:"Discover, qualify and prepare accelerator/incubator applications.",defaultAutonomy:"bounded",skills:["accelerator-discovery","accelerator-eligibility","accelerator-application"]},
  {id:"fellowship_agent",domain:"capital_fundraising",purpose:"Discover and prepare founder/research/innovation fellowship applications.",defaultAutonomy:"bounded",skills:["fellowship-discovery","fellowship-eligibility","fellowship-application"]},
  {id:"grant_agent",domain:"capital_fundraising",purpose:"Discover and prepare government/private/non-dilutive grant applications.",defaultAutonomy:"bounded",skills:["grant-discovery","grant-eligibility","grant-application","certification-gate"]},
  {id:"competition_agent",domain:"capital_fundraising",purpose:"Discover startup/pitch competitions, build submissions and track deadlines.",defaultAutonomy:"bounded",skills:["competition-discovery","competition-application","pitch-submission"]},
  {id:"startup_credit_agent",domain:"capital_fundraising",purpose:"Find and optimize cloud, AI, SaaS, student and startup credits.",defaultAutonomy:"bounded",skills:["startup-credit-discovery","credit-eligibility","credit-application","credit-optimization"]},
  {id:"application_agent",domain:"capital_fundraising",purpose:"Assemble verified answers, documents and forms for capital opportunities.",defaultAutonomy:"bounded",skills:["application-form-fill","application-answer-library","document-packaging","fact-check"]},
  {id:"pitch_deck_agent",domain:"capital_fundraising",purpose:"Maintain investor/grant/competition narrative and presentation assets.",defaultAutonomy:"bounded",skills:["pitch-deck","narrative","traction-evidence","market-sizing"]},
  {id:"fundraising_outreach_agent",domain:"capital_fundraising",purpose:"Founder-quality investor outreach and follow-up, separate from sales mailboxes.",defaultAutonomy:"approval",skills:["fundraising-outreach","warm-intro-request","investor-follow-up"]},

  {id:"ir_agent",domain:"investor_relations_corporate_finance",purpose:"Investor CRM, updates, diligence, round process and stakeholder communications.",defaultAutonomy:"bounded",skills:["investor-crm","investor-update","data-room","diligence"]},
  {id:"cap_table_agent",domain:"investor_relations_corporate_finance",purpose:"Deterministic ownership, SAFE, option-pool and dilution analysis.",defaultAutonomy:"approval",skills:["cap-table","safe-dilution-analysis","option-pool","priced-round"]},
  {id:"financial_model_agent",domain:"investor_relations_corporate_finance",purpose:"Conservative/base/upside financial scenarios and fundraising runway.",defaultAutonomy:"bounded",skills:["financial-model","scenario-finance","runway-analysis"]},

  {id:"finance_brain",domain:"finance",purpose:"Accounting truth, margins, cash, runway, revenue quality and operating leverage.",defaultAutonomy:"bounded",skills:["saas-metrics","unit-economics","revenue-quality","gross-margin","cash-runway"]},
  {id:"treasury_agent",domain:"finance",purpose:"Cash concentration, banking/FX risk and treasury policy monitoring.",defaultAutonomy:"approval",skills:["treasury-monitoring","fx-risk","counterparty-risk"]},
  {id:"billing_agent",domain:"finance",purpose:"Entitlements, metering, invoicing, failed payments and collections workflows.",defaultAutonomy:"bounded",skills:["usage-metering","billing","entitlements","collections"]},
  {id:"fraud_finance_agent",domain:"finance",purpose:"Invoice/vendor/payment fraud and anomalous financial actions.",defaultAutonomy:"bounded",skills:["invoice-fraud","vendor-fraud","payment-anomaly"]},

  {id:"legal_ops_agent",domain:"legal_corporate_affairs",purpose:"Contract, privacy, IP, records and legal-workflow triage.",defaultAutonomy:"approval",skills:["legal-document-triage","contract-review-assist","privacy-review","ip-tracking"]},
  {id:"regulatory_agent",domain:"risk_compliance_internal_audit",purpose:"Monitor applicable AI/privacy/security/marketing/tax/regulatory changes.",defaultAutonomy:"auto",skills:["regulatory-intelligence","compliance-mapping","control-gap"]},
  {id:"internal_audit_agent",domain:"risk_compliance_internal_audit",purpose:"Test controls, evidence, segregation and policy compliance.",defaultAutonomy:"auto",skills:["control-testing","audit-evidence","segregation-review","policy-audit"]},
  {id:"insurance_agent",domain:"risk_compliance_internal_audit",purpose:"Track stage-appropriate cyber, E&O, D&O and other coverage needs.",defaultAutonomy:"auto",skills:["insurance-gap","coverage-review"]},

  {id:"talent_agent",domain:"people_talent",purpose:"Talent radar, bottleneck-based hiring and candidate research.",defaultAutonomy:"bounded",skills:["talent-radar","hiring-trigger","candidate-research"]},
  {id:"people_ops_agent",domain:"people_talent",purpose:"Onboarding, performance, compensation, culture and succession processes.",defaultAutonomy:"approval",skills:["people-ops","compensation","employee-equity","succession"]},

  {id:"vendor_agent",domain:"procurement_vendor_management",purpose:"Vendor discovery, due diligence, renewals, concentration and exit plans.",defaultAutonomy:"bounded",skills:["vendor-due-diligence","vendor-comparison","renewal-analysis","vendor-exit"]},
  {id:"corp_dev_agent",domain:"corporate_development_expansion",purpose:"M&A, strategic alternatives, international expansion and portfolio options.",defaultAutonomy:"approval",skills:["ma-screening","build-buy-partner","international-expansion","strategic-alternatives"]},

  {id:"world_radar_agent",domain:"knowledge_quality_company_intelligence",purpose:"Continuously monitor market, competitors, technology, regulations and company signals.",defaultAutonomy:"auto",skills:["world-radar","competitor-analysis","technology-radar","signal-verification"]},
  {id:"playbook_agent",domain:"knowledge_quality_company_intelligence",purpose:"Extract context-aware lessons from strong companies and failures.",defaultAutonomy:"auto",skills:["proven-playbook","failure-library","cross-company-pattern"]},

  {id:"distribution_brain",domain:"distribution_influence_network",purpose:"Coordinate founder/company distribution, relationships, community and media.",defaultAutonomy:"bounded",skills:["distribution-strategy","relationship-graph","channel-analysis"]},
  {id:"social_agent",domain:"distribution_influence_network",purpose:"Research, prepare, schedule and analyze channel-native social content.",defaultAutonomy:"bounded",skills:["social-research","social-scheduling","brand-listening","content-repurposing"]},
  {id:"media_pr_agent",domain:"distribution_influence_network",purpose:"Journalist, media, analyst and reputation workflows.",defaultAutonomy:"approval",skills:["media-research","pr-pitch","analyst-research","crisis-comms"]},
  {id:"podcast_event_agent",domain:"distribution_influence_network",purpose:"Podcast, webinar, CFP, conference and speaking opportunity pipeline.",defaultAutonomy:"bounded",skills:["podcast-research","event-research","cfp-application","speaker-pitch"]},
  {id:"community_agent",domain:"distribution_influence_network",purpose:"Community listening, participation, developer/community relationships.",defaultAutonomy:"bounded",skills:["community-listening","community-engagement","developer-relations"]},

  {id:"resource_hunter_agent",domain:"resource_compute",purpose:"Find models, APIs, credits, OSS, startup programs and cheaper substitutes.",defaultAutonomy:"auto",skills:["resource-hunting","credit-optimization","oss-evaluation","api-evaluation"]},
  {id:"compute_broker_agent",domain:"resource_compute",purpose:"Route workloads to cheapest acceptable available compute.",defaultAutonomy:"auto",skills:["model-routing","quota-routing","cost-routing","provider-health"]},
  {id:"oss_radar_agent",domain:"resource_compute",purpose:"Discover GitHub projects and route them through quarantine/evaluation.",defaultAutonomy:"auto",skills:["github-research","oss-evaluation","license-review","supply-chain-review"]},

  {id:"service_productization_agent",domain:"service_to_software",purpose:"Detect repeated manual customer work and convert it into repeatable software.",defaultAutonomy:"bounded",skills:["workflow-capture","productization-detector","manual-to-auto","customer-language-learning"]},

  {id:"evolution_brain",domain:"evolution",purpose:"Improve agents, skills, prompts, workflows and architecture through governed evidence.",defaultAutonomy:"bounded",skills:["agent-evaluation","agent-improvement","skill-generation","architecture-improvement"]},
  {id:"eval_agent",domain:"evolution",purpose:"Independent evals, drift detection and autonomy promotion/demotion.",defaultAutonomy:"auto",skills:["agent-evaluation","drift-detection","promotion-review","demotion-review"]},

  {id:"enterprise_value_agent",domain:"enterprise_value_scale",purpose:"Track PMF, retention, economics, moats, concentration and scale readiness.",defaultAutonomy:"auto",skills:["pmf-evidence","revenue-quality","moat-analysis","scale-readiness","billion-dollar-scoreboard"]},
] as const;
