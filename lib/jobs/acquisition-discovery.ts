import { runAcquisitionDiscovery } from "@/lib/acquisition-discovery";
import { scrapeGraphAcquisitionProvider } from "@/lib/acquisition-discovery-scrapegraph";
import { persistDiscoveredAcquisitionCandidates } from "@/lib/acquisition-research-persistence";
import { logOperationalEvent } from "@/lib/structured-logger";
import { inngest } from "@/lib/jobs/inngest";
import { isMissingRelationError } from "@/lib/supabase-rest";

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
      return { status: "provider_unavailable", candidateCount: 0, persistedCount: 0 };
    }

    try {
      const result = await step.run("discover-public-icp-candidates", () =>
        runAcquisitionDiscovery(provider, {
          query: SHADOW_DISCOVERY_QUERY,
          maxCandidates: 10,
          maxCredits: 50,
        }),
      );

      const persisted = await step.run("persist-public-icp-candidates", () =>
        persistDiscoveredAcquisitionCandidates(result.candidates),
      );

      logOperationalEvent("acquisition_discovery_shadow_complete", {
        status: "success",
        provider: result.providerId,
      });

      return {
        status: "shadow_persisted",
        candidateCount: result.candidates.length,
        persistedCount: persisted.length,
        creditsUsed: result.creditsUsed,
      };
    } catch (error) {
      if (isMissingRelationError(error)) {
        logOperationalEvent("acquisition_discovery_schema_unavailable", {
          status: "blocked",
          provider: provider.id,
          errorCode: "ACQUISITION_RESEARCH_SCHEMA_UNAVAILABLE",
        });
        return { status: "schema_unavailable", candidateCount: 0, persistedCount: 0 };
      }

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
