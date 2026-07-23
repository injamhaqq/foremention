import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://foremention.com";
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/api/"] }], sitemap: `${base}/sitemap.xml` };
}
