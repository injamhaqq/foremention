import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const updated = new Date("2026-08-14T00:00:00Z");

const routes = [
  { path: "", frequency: "weekly", priority: 1 },
  { path: "/product", frequency: "monthly", priority: 0.9 },
  { path: "/source-map", frequency: "weekly", priority: 0.9 },
  { path: "/pricing", frequency: "monthly", priority: 0.8 },
  { path: "/roi", frequency: "monthly", priority: 0.7 },
  { path: "/methodology", frequency: "monthly", priority: 0.8 },
  { path: "/honesty", frequency: "monthly", priority: 0.7 },
  { path: "/teardowns", frequency: "monthly", priority: 0.7 },
  { path: "/about", frequency: "monthly", priority: 0.6 },
  { path: "/contact", frequency: "yearly", priority: 0.5 },
  { path: "/source-gap", frequency: "monthly", priority: 0.7 },
  { path: "/privacy", frequency: "yearly", priority: 0.3 },
  { path: "/subprocessors", frequency: "monthly", priority: 0.3 },
  { path: "/terms", frequency: "yearly", priority: 0.3 },
  { path: "/monitoring-vs-execution", frequency: "monthly", priority: 0.8 },
  { path: "/compare/monitoring-tools", frequency: "monthly", priority: 0.7 },
  { path: "/compare/geo-agencies", frequency: "monthly", priority: 0.7 },
  { path: "/compare/pr-agencies", frequency: "monthly", priority: 0.6 },
  { path: "/insights", frequency: "weekly", priority: 0.8 },
  { path: "/insights/ai-visibility-measurement", frequency: "monthly", priority: 0.9 },
  { path: "/insights/seo-geo-technical-checklist", frequency: "monthly", priority: 0.9 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: updated,
    changeFrequency: route.frequency,
    priority: route.priority,
  }));
}
