import { env } from "cloudflare:workers";
import { runAcquisitionDiscovery } from "@/lib/acquisition-discovery";
import { scrapeGraphAcquisitionProvider } from "@/lib/acquisition-discovery-scrapegraph";
import { deriveAcquisitionResearchAssessment } from "@/lib/acquisition-research";
import { scrapeGraphAcquisitionResearchProvider } from "@/lib/acquisition-research-scrapegraph";
import {
  persistAcquisitionResearchAssessment,
  persistDiscoveredAcquisitionCandidates,
} from "@/lib/acquisition-research-persistence";
import { scrapeGraphAcquisitionContactProvider } from "@/lib/acquisition-contact-scrapegraph";
import { selectBestAcquisitionContact } from "@/lib/acquisition-contact-resolution";
import { persistResolvedAcquisitionContact } from "@/lib/acquisition-contact-persistence";
import { createAcquisitionOutreachDraft } from "@/lib/acquisition-outreach-persistence";
import {
  finishAcquisitionShadowRequest,
  loadAcquisitionShadowRequest,
  markAcquisitionShadowRunning,
  type AcquisitionShadowResult,
} from "@/lib/acquisition-shadow-request";
import { logOperationalEvent } from "@/lib/structured-logger";
import { inngest } from "@/lib/jobs/inngest";
import { isMissingRelationError } from "@/lib/supabase-rest";

const SHADOW_DISCOVERY_QUERY =
  "English-language growth-stage B2B SaaS companies with roughly 50-500 employees and visible SEO, organic growth, GEO, AI-search, content, or recommendation-discovery motion";
const MAX_RESEARCHED_CANDIDATES_PER_RUN = 3;
const MAX_RESEARCH_CREDITS_PER_CANDIDATE = 15;
const MAX_CONTACTED_CANDIDATES_PER_RUN = 1;
const MAX_CONTACT_CREDITS_PER_CANDIDATE = 5;
const SHADOW_REQUEST_KEY_PATTERN = /^shadow-[a-f0-9]{12}-[0-9]+-[0-9]+$/;
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/;

type AcquisitionStep = {
  run<T>(id: string, handler: () => T | Promise<T>): Promise<T>;
};

function acquisitionAutopilotEnabled() {
  return (env as unknown as Record<string, unknown>).ACQUISITION_AUTOPILOT_ENABLED === "true";
}

async function executeAcquisitionShadow(step: AcquisitionStep): Promise<AcquisitionShadowResult> {
  if (!acquisitionAutopilotEnabled()) {
    logOperationalEvent("acquisition_autopilot_disabled", { status: "disabled" });
    return {
      status: "disabled",
      candidateCount: 0,
      persistedCount: 0,
      researchedCount: 0,
      qualifiedShadowCount: 0,
      contactResolvedCount: 0,
      draftCreatedCount: 0,
      errorCode: "ACQUISITION_AUTOPILOT_DISABLED",
    };
  }

  const discoveryProvider = scrapeGraphAcquisitionProvider();
  const researchProvider = scrapeGraphAcquisitionResearchProvider();
  const contactProvider = scrapeGraphAcquisitionContactProvider();
  if (!discoveryProvider || !researchProvider || !contactProvider) {
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
      contactResolvedCount: 0,
      draftCreatedCount: 0,
      errorCode: "MISSING_SGAI_API_KEY",
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
    const qualifiedTargets = [] as Array<{
      candidate: (typeof result.candidates)[number];
      identity: (typeof persisted)[number];
    }>;
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
      if (persistedAssessment.qualifiedShadow) {
        qualifiedShadowCount += 1;
        qualifiedTargets.push({ candidate, identity });
      }
    }

    let contactCreditsUsed = 0;
    let contactResolvedCount = 0;
    let draftCreatedCount = 0;
    const contactTargets = qualifiedTargets
      .filter(({ candidate }) => Boolean(candidate.domain))
      .slice(0, MAX_CONTACTED_CANDIDATES_PER_RUN);

    for (let index = 0; index < contactTargets.length; index += 1) {
      const { candidate, identity } = contactTargets[index];
      if (!candidate.domain) continue;
      const contactResult = await step.run(`resolve-public-icp-contact-${index}`, () =>
        contactProvider.resolve({
          companyName: candidate.companyName,
          domain: candidate.domain as string,
          maxResults: 1,
          maxCredits: MAX_CONTACT_CREDITS_PER_CANDIDATE,
        }),
      );
      if (contactResult.creditsUsed > MAX_CONTACT_CREDITS_PER_CANDIDATE) {
        throw new Error("ACQUISITION_CONTACT_BUDGET_EXCEEDED");
      }
      contactCreditsUsed += contactResult.creditsUsed;
      const selectedContact = selectBestAcquisitionContact(contactResult.contacts);
      if (!selectedContact) continue;

      const persistedContact = await step.run(`persist-public-icp-contact-${index}`, () =>
        persistResolvedAcquisitionContact(identity.accountId, selectedContact),
      );
      contactResolvedCount += 1;

      await step.run(`create-public-icp-draft-${index}`, () =>
        createAcquisitionOutreachDraft({
          accountId: identity.accountId,
          contactId: persistedContact.contactId,
          researchRunId: identity.researchRunId,
        }),
      );
      draftCreatedCount += 1;
    }

    logOperationalEvent("acquisition_discovery_shadow_complete", {
      status: "success",
      provider: discoveryProvider.id,
    });

    return {
      status: "shadow_drafted",
      candidateCount: result.candidates.length,
      persistedCount: persisted.length,
      researchedCount: researchTargets.length,
      qualifiedShadowCount,
      contactResolvedCount,
      draftCreatedCount,
      discoveryCreditsUsed: result.creditsUsed,
      researchCreditsUsed,
      contactCreditsUsed,
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
        contactResolvedCount: 0,
        draftCreatedCount: 0,
        errorCode: "ACQUISITION_RESEARCH_SCHEMA_UNAVAILABLE",
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
}

export const discoverAcquisitionTargets = inngest.createFunction(
  {
    id: "discover-acquisition-targets-shadow",
    retries: 1,
    triggers: { cron: "0 6 * * *" },
  },
  async ({ step }) => executeAcquisitionShadow(step),
);

export const runRequestedAcquisitionShadow = inngest.createFunction(
  {
    id: "discover-acquisition-targets-shadow-requested",
    retries: 1,
    triggers: { event: "foremention/acquisition.shadow.requested" },
    onFailure: async ({ event }) => {
      const original = event.data.event as { data?: { requestKey?: unknown } } | undefined;
      const requestKey = typeof original?.data?.requestKey === "string" ? original.data.requestKey : "";
      if (!SHADOW_REQUEST_KEY_PATTERN.test(requestKey)) return;
      await finishAcquisitionShadowRequest(requestKey, {
        status: "failed",
        errorCode: "ACQUISITION_SHADOW_RETRY_EXHAUSTED",
      }).catch(() => undefined);
    },
  },
  async ({ event, step }) => {
    const data = event.data as { requestKey?: unknown; releaseSha?: unknown };
    const requestKey = typeof data?.requestKey === "string" ? data.requestKey : "";
    const releaseSha = typeof data?.releaseSha === "string" ? data.releaseSha.trim().toLowerCase() : "";
    if (!SHADOW_REQUEST_KEY_PATTERN.test(requestKey) || !RELEASE_SHA_PATTERN.test(releaseSha)) {
      return { status: "failed", errorCode: "ACQUISITION_SHADOW_REQUEST_IDENTITY_INVALID" };
    }

    const authorizedRequest = await step.run("load-authorized-acquisition-shadow-request", () =>
      loadAcquisitionShadowRequest(requestKey),
    );
    if (!authorizedRequest || authorizedRequest.release_sha !== releaseSha) {
      return { status: "failed", errorCode: "ACQUISITION_SHADOW_REQUEST_NOT_AUTHORIZED" };
    }
    if (!["requested", "running"].includes(authorizedRequest.status)) {
      return { status: authorizedRequest.status, skipped: true, reason: "already_terminal" };
    }

    await step.run("mark-acquisition-shadow-running", () => markAcquisitionShadowRunning(requestKey));
    const result = await executeAcquisitionShadow(step);
    await step.run("finish-acquisition-shadow-request", () => finishAcquisitionShadowRequest(requestKey, result));
    return result;
  },
);
