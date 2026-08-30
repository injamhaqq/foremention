import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const INDEXED_PATHS = [
  "/",
  "/product",
  "/recommendation-intelligence",
  "/recommendation-record",
  "/methodology",
  "/insights",
  "/insights/ai-visibility-measurement",
  "/insights/seo-geo-technical-checklist",
  "/glossary",
  "/partners",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/subprocessors",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-30T00:00:00.000Z");
  return INDEXED_PATHS.map((path) => ({ url: new URL(path, SITE_URL).toString(), lastModified }));
}
