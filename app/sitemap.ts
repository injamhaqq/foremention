import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://foremention.com";
  return ["", "/product", "/source-map", "/sample-report", "/pricing", "/methodology", "/honesty", "/teardowns", "/about", "/contact", "/source-gap", "/privacy", "/terms"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" || path === "/teardowns" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.7 }));
}
