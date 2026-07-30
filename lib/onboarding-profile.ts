type WebsiteProfileInput = {
  websiteUrl: string;
  pageTitle: string | null;
  pageDescription?: string | null;
};

export type OnboardingDraft = {
  companyName: string;
  domain: string;
  market: string;
  category: string;
  categoryDescription: string;
  competitors: string[];
  goal: string;
  constraint: string;
  prompts: string[];
};

type CategoryTemplate = {
  match: RegExp;
  category: string;
  description: string;
  competitors: string[];
  audience: string;
};

const templates: CategoryTemplate[] = [
  {
    match: /\b(recommendation intelligence|ai visibility|answer engine|generative engine|geo software|ai search)\b/i,
    category: "AI visibility monitoring and recommendation intelligence software for B2B SaaS",
    description: "Software that shows B2B SaaS teams how they and their competitors appear in AI-generated recommendations, which sources are cited, what changes over time, and which evidence gaps deserve action.",
    competitors: ["Profound", "Scrunch AI", "Peec AI", "OtterlyAI", "AthenaHQ", "Goodie AI"],
    audience: "a growing B2B SaaS team",
  },
  {
    match: /\b(customer relationship management|crm)\b/i,
    category: "CRM software for B2B teams",
    description: "Software that helps B2B teams manage customer relationships, sales pipelines, communication, and revenue workflows.",
    competitors: ["HubSpot", "Salesforce", "Pipedrive", "Zoho CRM"],
    audience: "a growing B2B sales team",
  },
  {
    match: /\b(hr software|human resources|people operations|payroll)\b/i,
    category: "HR and people operations software",
    description: "Software that helps employers manage people operations, payroll, compliance, workforce records, and employee workflows.",
    competitors: ["Rippling", "Deel", "HiBob", "BambooHR"],
    audience: "a growing people operations team",
  },
  {
    match: /\b(marketing automation|email marketing|campaign automation)\b/i,
    category: "Marketing automation software for B2B teams",
    description: "Software that helps B2B teams plan, automate, measure, and improve customer acquisition and lifecycle campaigns.",
    competitors: ["HubSpot", "Marketo", "ActiveCampaign", "Brevo"],
    audience: "a growing B2B marketing team",
  },
  {
    match: /\b(sales intelligence|prospecting|lead generation)\b/i,
    category: "Sales intelligence software for B2B teams",
    description: "Software that helps B2B revenue teams identify, research, prioritize, and contact prospective customers.",
    competitors: ["Apollo", "ZoomInfo", "Cognism", "Clay"],
    audience: "a growing B2B revenue team",
  },
  {
    match: /\b(project management|work management|task management)\b/i,
    category: "Project and work management software",
    description: "Software that helps teams plan work, coordinate projects, manage tasks, and track delivery.",
    competitors: ["Asana", "Monday.com", "ClickUp", "Notion"],
    audience: "a growing operations team",
  },
  {
    match: /\b(cybersecurity|cloud security|application security|security platform)\b/i,
    category: "Cybersecurity software for modern businesses",
    description: "Software that helps organizations identify, prevent, investigate, and respond to security risks.",
    competitors: ["Wiz", "Palo Alto Networks", "CrowdStrike", "Snyk"],
    audience: "a modern security team",
  },
];

function titleCaseSlug(value: string) {
  return value
    .replace(/^www\./i, "")
    .split(".")[0]
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function companyFromTitle(title: string | null, hostname: string) {
  const hostnameBrand = titleCaseSlug(hostname);
  const parts = title?.split(/\s+(?:[|–—-])\s+/).map((part) => part.trim()).filter(Boolean) || [];
  const matchingBrand = parts.find((part) => part.toLowerCase() === hostnameBrand.toLowerCase());
  if (matchingBrand) return matchingBrand;
  const first = parts[0];
  if (first && first.length >= 2 && first.length <= 80 && !/^home$/i.test(first)) return first;
  return hostnameBrand;
}

function fallbackCategory(title: string | null) {
  const remainder = title?.split(/\s+(?:[|–—-])\s+/).slice(1).join(" ").trim();
  if (remainder && remainder.length >= 4 && remainder.length <= 120) return remainder;
  return "B2B software";
}

function genericPrompts(category: string, companyName: string, competitors: string[], audience: string) {
  const competitor = competitors[0] || "the leading alternatives";
  return [
    `Which ${category} platforms are best for ${audience}?`,
    `What should buyers evaluate when choosing ${category}?`,
    `How does ${companyName} compare with ${competitor}?`,
    `What are credible alternatives to ${competitor}?`,
    `Which ${category} products provide the strongest evidence for their claims?`,
  ];
}

export function createOnboardingDraft(input: WebsiteProfileInput): OnboardingDraft {
  const url = new URL(input.websiteUrl);
  const companyName = companyFromTitle(input.pageTitle, url.hostname);
  const evidenceText = `${input.pageTitle || ""} ${input.pageDescription || ""}`.trim();
  const template = templates.find((candidate) => candidate.match.test(evidenceText));
  const category = template?.category || fallbackCategory(input.pageTitle);
  const categoryDescription = template?.description
    || `${companyName} operates in ${category}. Review this draft so the category reflects the words real buyers use.`;
  const competitors = template?.competitors || [];
  const audience = template?.audience || "a growing business team";

  return {
    companyName,
    domain: `${url.protocol}//${url.host}`,
    market: "Global",
    category,
    categoryDescription,
    competitors,
    goal: "Find credible source gaps",
    constraint: "Use only dated AI answers, provider-returned citations, canonical public URLs, and human-reviewed page evidence. Separate observations from inferences. Never invent citations or promise rankings, traffic, leads, revenue, or guaranteed outcomes.",
    prompts: genericPrompts(category, companyName, competitors, audience),
  };
}
