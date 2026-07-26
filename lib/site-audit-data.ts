export type SiteAuditStatus = "resolved" | "passed" | "connect";

export type SiteAuditRecord = {
  id: string;
  surface: string;
  status: SiteAuditStatus;
  observed: string;
  evidence: string;
  resolution: string;
  evidenceUrl: string;
};

export const siteAuditSnapshot = {
  collectedAt: "2026-07-27",
  auditedOrigin: "https://foremention.com",
  before: {
    sitemapUrls: 13,
    successfulPages: 13,
    canonicalPages: 0,
    productionSitemapUrls: 0,
  },
  after: {
    sitemapUrls: 19,
    canonicalPages: 19,
    usefulGuides: 2,
  },
};

export const siteAuditRecords: SiteAuditRecord[] = [
  {
    id: "audit-01",
    surface: "robots.txt",
    status: "resolved",
    observed:
      "The live file returned a Sitemap directive pointing to http://localhost:3000/sitemap.xml.",
    evidence: "Direct HTTP collection from /robots.txt on July 27, 2026.",
    resolution:
      "The sitemap directive now uses the production origin and public search crawlers remain allowed while /app/ and /api/ stay blocked.",
    evidenceUrl: "/robots.txt",
  },
  {
    id: "audit-02",
    surface: "sitemap.xml",
    status: "resolved",
    observed:
      "All 13 sitemap entries used localhost instead of the public foremention.com origin.",
    evidence: "13 of 13 <loc> values failed the production-origin check.",
    resolution:
      "Every sitemap URL now uses foremention.com, stale fictional sample content is excluded, and useful comparison and insight pages are included.",
    evidenceUrl: "/sitemap.xml",
  },
  {
    id: "audit-03",
    surface: "Canonical URLs",
    status: "resolved",
    observed:
      "Zero of the 13 audited public pages exposed a rel=canonical element.",
    evidence: "Rendered-head inspection across every URL in the live sitemap.",
    resolution:
      "Each indexable public page now declares its own absolute production canonical URL.",
    evidenceUrl: "/",
  },
  {
    id: "audit-04",
    surface: "Public Source Map",
    status: "resolved",
    observed:
      "The previous public explorer used invented domains and observations to demonstrate the interface.",
    evidence: "The earlier /source-map page loaded records from the fictional Northstar HR demo dataset.",
    resolution:
      "The public page now shows this dated Foremention website audit. Fictional product data remains confined to the clearly labelled demo workspace.",
    evidenceUrl: "/source-map",
  },
  {
    id: "audit-05",
    surface: "Index hygiene",
    status: "resolved",
    observed:
      "A fictional sample report was indexable and included in the sitemap.",
    evidence: "/sample-report returned 200 and appeared in the published sitemap.",
    resolution:
      "The sample remains available for transparent product demonstration, but it is now noindex and excluded from the sitemap.",
    evidenceUrl: "/sample-report",
  },
  {
    id: "audit-06",
    surface: "Search intent coverage",
    status: "resolved",
    observed:
      "The site had no Insights hub and no substantial guide dedicated to AI visibility measurement or a combined SEO/GEO technical standard.",
    evidence: "No /insights URLs existed in the 13-page crawl.",
    resolution:
      "An Insights hub and two original, source-linked guides now cover the buyer questions the product is designed to answer.",
    evidenceUrl: "/insights",
  },
  {
    id: "audit-07",
    surface: "Page delivery",
    status: "passed",
    observed:
      "All 13 submitted public pages returned HTTP 200 over HTTPS, with no broken internal page links detected in the audited set.",
    evidence: "Direct status and internal-link checks from the production origin.",
    resolution:
      "Retain automated route tests and repeat the live crawl before each production release.",
    evidenceUrl: "/methodology",
  },
  {
    id: "audit-08",
    surface: "Mobile structure",
    status: "passed",
    observed:
      "The audited marketing and product pages had no horizontal overflow at desktop or 390-pixel mobile width.",
    evidence: "Rendered browser checks on the production layout.",
    resolution:
      "Maintain the current responsive shell, semantic headings, skip link, and reduced-motion behavior.",
    evidenceUrl: "/product",
  },
  {
    id: "audit-09",
    surface: "Search measurement",
    status: "connect",
    observed:
      "No active Google Tag Manager or Google Analytics identifier was detected in the public page source.",
    evidence: "Script and metadata inspection of the production homepage.",
    resolution:
      "Measurement remains intentionally inactive until a user-owned Tag Manager or Analytics ID and a consent approach are configured. Search Console and Bing Webmaster verification are also required.",
    evidenceUrl: "/privacy",
  },
  {
    id: "audit-10",
    surface: "Off-site authority",
    status: "connect",
    observed:
      "A first-party website crawl cannot verify backlinks, search impressions, index coverage, or third-party AI citations.",
    evidence: "These signals exist outside the Foremention site and require provider-owned reports.",
    resolution:
      "Connect Search Console, Bing Webmaster Tools, analytics, and verified answer-provider collection before presenting those numbers.",
    evidenceUrl: "/honesty",
  },
];
