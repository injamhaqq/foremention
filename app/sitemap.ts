import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const updated = new Date("2026-08-26T00:00:00Z");

const routes = [
  { path: "", frequency: "weekly", priority: 1 },
  { path: "/product", frequency: "monthly", priority: 0.95 },
  { path: "/recommendation-intelligence", frequency: "monthly", priority: 0.95 },
  { path: "/recommendation-record", frequency: "monthly", priority: 0.9 },
  { path: "/source-x-ray", frequency: "monthly", priority: 0.9 },
  { path: "/ai-mediated-buying", frequency: "monthly", priority: 0.85 },
  { path: "/methodology", frequency: "monthly", priority: 0.9 },
  { path: "/insights", frequency: "weekly", priority: 0.8 },
  { path: "/about", frequency: "monthly", priority: 0.6 },
  { path: "/contact", frequency: "yearly", priority: 0.5 },
  { path: "/privacy", frequency: "yearly", priority: 0.3 },
  { path: "/subprocessors", frequency: "monthly", priority: 0.3 },
  { path: "/terms", frequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: updated,
    changeFrequency: route.frequency,
    priority: route.priority,
  }));
}
