import { runAcquisitionDiscovery } from "@/lib/acquisition-discovery";
import { scrapeGraphAcquisitionProvider } from "@/lib/acquisition-discovery-scrapegraph";
import { deriveAcquisitionResearchAssessment } from "@/lib/acquisition-research";
import { scrapeGraphAcquisitionResearchProvider } from "@/lib/acquisition-research-scrapegraph";
import {
  persistAcquisitionResearchAssessment,
  persistDiscoveredAcquisitionCandidates,
} from "@/lib/acquisition-research-persistence";
import { logOperationalEvent } from "@/lib/structured-logger";
import { inngest } from "@/lib/jobs/inngest";
import { isMissingRelationError } from "@/lib/supabase-rest";

const SHADOW_DISCOVERY_QUERY =
  "English-language growth-stage B2B SaaS companies with roughly 50-500 employees and visible SEO, organic growth, GEO, AI-search, content, or recommendation-discovery motion";
const MAX_RESEARCHED_CANDIDATES_PER_RUN = 3;
const MAX_RESEARCH_CREDITS_PER_CANDIDATE = 15;

export const discoverAcquisitionTargets = inngest.createFunction(
  {
    id: "discover-acquisition-targets-shadow",
    retries: 1,
    triggers: { cron: "0 6 * * *" },
  },
  async ({ step }) => {
    const discoveryProvider = scrapeGraphAcquisitionProvider();
    const researchProvider = scrapeGraphAcquisitionResearchProvider();
    if (!discoveryProvider || !researchProvider) {
      logOperationalEvent("acquisition_discovery_provider_unavailable", {
        status: "blocked",
        errorCode: "MISSING_SGAI_API_KEY",
      });
      return {
        status: "provider_unavailable",
        candidateCount: 0,
        persistedCount: 0,
        researchedCount: 0,
        qualifiedShadowCount: 0,
      };
    }

    try {
      const result = await step.run("discover-public-icp-candidates", () =>
        runAcquisitionDiscovery(discoveryProvider, {
          query: SHADOW_DISCOVERY_QUERY,
          maxCandidates: 10,
          maxCredits: 50,
        }),
      );

      const persisted = await step.run("persist-public-icp-candidates", () =>
        persistDiscoveredAcquisitionCandidates(result.candidates),
      );
      const identityByKey = new Map(persisted.map((identity) => [identity.canonicalCompanyKey, identity]));

      let researchCreditsUsed = 0;
      let qualifiedShadowCount = 0;
      const researchTargets = result.candidates.slice(0, MAX_RESEARCHED_CANDIDATES_PER_RUN);

      for (let index = 0; index < researchTargets.length; index += 1) {
        const candidate = researchTargets[index];
        const identity = identityByKey.get(candidate.canonicalCompanyKey);
        if (!identity) throw new Error("ACQUISITION_RESEARCH_PERSISTED_IDENTITY_MISSING");

        const researchResult = await step.run(`research-public-icp-${index}`, () =>
          researchProvider.research({
            companyName: candidate.companyName,
            domain: candidate.domain,
            maxResults: 3,
            maxCredits: MAX_RESEARCH_CREDITS_PER_CANDIDATE,
          }),
        );
        if (researchResult.creditsUsed > MAX_RESEARCH_CREDITS_PER_CANDIDATE) {
          throw new Error("ACQUISITION_RESEARCH_BUDGET_EXCEEDED");
        }
        researchCreditsUsed += researchResult.creditsUsed;

        const assessment = deriveAcquisitionResearchAssessment(researchResult.facts);
        const persistedAssessment = await step.run(`persist-public-icp-research-${index}`, () =>
          persistAcquisitionResearchAssessment(identity, assessment),
        );
        if (persistedAssessment.qualifiedShadow) qualifiedShadowCount += 1;
      }

      logOperationalEvent("acquisition_discovery_shadow_complete", {
        status: "success",
        provider: discoveryProvider.id,
      });

      return {
        status: "shadow_researched",
        candidateCount: result.candidates.length,
        persistedCount: persisted.length,
        researchedCount: researchTargets.length,
        qualifiedShadowCount,
        discoveryCreditsUsed: result.creditsUsed,
        researchCreditsUsed,
      };
    } catch (error) {
      if (isMissingRelationError(error)) {
        logOperationalEvent("acquisition_discovery_schema_unavailable", {
          status: "blocked",
          provider: discoveryProvider.id,
          errorCode: "ACQUISITION_RESEARCH_SCHEMA_UNAVAILABLE",
        });
        return {
          status: "schema_unavailable",
          candidateCount: 0,
          persistedCount: 0,
          researchedCount: 0,
          qualifiedShadowCount: 0,
        };
      }

      const errorCode = error instanceof Error ? error.message.slice(0, 120) : "ACQUISITION_DISCOVERY_UNKNOWN_ERROR";
      logOperationalEvent("acquisition_discovery_shadow_failed", {
        status: "failed",
        provider: discoveryProvider.id,
        errorCode,
      });
      throw error;
    }
  },
);
