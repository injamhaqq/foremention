import { runAcquisitionDiscovery } from "@/lib/acquisition-discovery";
import { scrapeGraphAcquisitionProvider } from "@/lib/acquisition-discovery-scrapegraph";
import { logOperationalEvent } from "@/lib/structured-logger";
import { inngest } from "@/lib/jobs/inngest";

const SHADOW_DISCOVERY_QUERY =
  "English-language growth-stage B2B SaaS companies with roughly 50-500 employees and visible SEO, organic growth, GEO, AI-search, content, or recommendation-discovery motion";

export const discoverAcquisitionTargets = inngest.createFunction(
  {
    id: "discover-acquisition-targets-shadow",
    retries: 1,
    triggers: { cron: "0 6 * * *" },
  },
  async ({ step }) => {
    const provider = scrapeGraphAcquisitionProvider();
    if (!provider) {
      logOperationalEvent("acquisition_discovery_provider_unavailable", {
        status: "blocked",
        errorCode: "MISSING_SGAI_API_KEY",
      });
      return { status: "provider_unavailable", candidateCount: 0, persisted: false };
    }

    try {
      const result = await step.run("discover-public-icp-candidates", () =>
        runAcquisitionDiscovery(provider, {
          query: SHADOW_DISCOVERY_QUERY,
          maxCandidates: 10,
          maxCredits: 50,
        }),
      );

      logOperationalEvent("acquisition_discovery_shadow_complete", {
        status: "success",
        provider: result.providerId,
      });

      // #223 owns the durable acquisition research/account persistence boundary.
      // Until that schema release is merged and exact-production verified, this
      // scheduled slice intentionally performs no commercial/lifecycle writes.
      return {
        status: "shadow_only",
        candidateCount: result.candidates.length,
        creditsUsed: result.creditsUsed,
        persisted: false,
      };
    } catch (error) {
      const errorCode = error instanceof Error ? error.message.slice(0, 120) : "ACQUISITION_DISCOVERY_UNKNOWN_ERROR";
      logOperationalEvent("acquisition_discovery_shadow_failed", {
        status: "failed",
        provider: provider.id,
        errorCode,
      });
      throw error;
    }
  },
);
