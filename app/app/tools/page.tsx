import Link from "next/link";
import { Arrow } from "@/components/brand";

const toolGroups = [
  {
    eyebrow: "Observe",
    title: "Collect and inspect evidence",
    description: "Start with buyer questions, preserve Recommendation Records, and inspect the sources behind what AI systems returned.",
    tools: [
      ["/app", "Overview", "See what needs attention and continue the next best step."],
      ["/app/prompts", "Questions", "Review the buyer questions Foremention is allowed to measure."],
      ["/app/runs", "Recommendation Records", "Open persisted answer collections and their exact evidence boundary."],
      ["/app/source-map", "Sources", "Review cited pages and the evidence attached to each source."],
      ["/app/evidence", "Evidence Vault", "Inspect stored evidence without creating replacement claims."],
      ["/app/alerts", "Alerts", "See persisted changes that need a human review."],
    ],
  },
  {
    eyebrow: "Decide",
    title: "Turn evidence into a decision",
    description: "Compare valid observations, inspect competitors, and decide what your company can actually change.",
    tools: [
      ["/app/opportunities", "Opportunities", "Review evidence-gated opportunities before acting."],
      ["/app/competitors", "Competitors", "Confirm tracked competitors instead of silently promoting mentions."],
      ["/app/analytics", "Comparisons", "Compare only compatible measurements."],
      ["/app/decision-lab", "Decision Lab", "Work through decision-relevant evidence and uncertainty."],
      ["/app/intelligence", "Intelligence Loop", "Review the deeper weekly intelligence workflow."],
    ],
  },
  {
    eyebrow: "Act and learn",
    title: "Own the follow-through",
    description: "Record approved work, resolve open loops, and measure what happened later without inventing causality.",
    tools: [
      ["/app/placements", "Actions", "Track approved actions with owners and verification boundaries."],
      ["/app/resolutions", "Resolution Center", "Close or monitor unresolved evidence and workflow items."],
      ["/app/outcomes", "Outcome Ledger", "Record observed business outcomes after action."],
      ["/app/passport", "Vendor Passport", "Inspect the evidence-backed vendor summary."],
    ],
  },
  {
    eyebrow: "Operate",
    title: "Run the workspace",
    description: "Manage people, integrations, agents, support, and workspace configuration.",
    tools: [
      ["/app/agents", "Agent Control Plane", "Inspect agent status and approved execution boundaries."],
      ["/app/team", "Team", "Manage workspace membership and access."],
      ["/app/settings#integrations", "Integrations", "Configure supported workspace connections."],
      ["/app/settings", "Settings", "Manage providers, schedules, billing controls, and workspace configuration."],
      ["/app/search", "Search", "Find workspace records and evidence quickly."],
      ["/app/support", "Support", "Open product support and operating guidance."],
    ],
  },
] as const;

export default function ToolsPage() {
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Workspace directory</span>
        <h1>Everything in Foremention, in one place.</h1>
        <p>Use the core sidebar for the normal workflow. Use this directory whenever you need a supporting capability, administration area, or deeper analysis tool.</p>
      </div>
      <Link className="button button--ink" href="/app">Back to Overview <Arrow /></Link>
    </div>

    <div className="dashboard-grid">
      {toolGroups.map((group) => <section className="panel" key={group.title}>
        <span className="eyebrow">{group.eyebrow}</span>
        <h2>{group.title}</h2>
        <p>{group.description}</p>
        <div className="compact-sources">
          {group.tools.map(([href, label, detail]) => <Link href={href} key={href}>
            <span><strong>{label}</strong></span>
            <small>{detail}</small>
          </Link>)}
        </div>
      </section>)}
    </div>
  </main>;
}
