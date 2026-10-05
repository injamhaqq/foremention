import type { ProviderId } from "@/lib/providers/types";

export const RUN_MANIFEST_VERSION = "1.0";
export const RECOMMENDATION_EXTRACTION_VERSION = "1.0";
export const RECOMMENDATION_METRIC_VERSION = "1.0";

export type RunManifestQuestion = {
  promptId: string;
  promptKey: string;
  promptVersion: number | null;
  text: string;
  locale: string;
  market: string;
};

export type RunManifest = {
  version: string;
  organizationId: string;
  projectId: string;
  brand: {
    canonicalName: string;
    domain: string | null;
    aliases: string[];
  };
  questions: RunManifestQuestion[];
  intendedSurfaces: Array<"provider-api">;
  provider: {
    id: ProviderId;
    modelSetting: string | null;
  };
  collectionMethod: "authorized-provider-api";
  sampleCount: number;
  locales: string[];
  markets: string[];
  requestedAt: string;
  timeWindow: {
    startedAt: string;
    endedAt: null;
  };
  extractorVersion: string;
  metricVersion: string;
  methodologyVersion: string;
  spend: {
    estimatedMaximumCostUsd: number;
    perRunLimitUsd: number;
  };
};

export function buildRunManifest(input: {
  organizationId: string;
  projectId: string;
  canonicalBrand: string;
  organizationName: string;
  domain: string | null;
  questions: RunManifestQuestion[];
  providerId: ProviderId;
  modelSetting: string | null;
  methodologyVersion: string;
  estimatedMaximumCostUsd: number;
  perRunLimitUsd: number;
  requestedAt?: string;
}): RunManifest {
  const requestedAt = input.requestedAt || new Date().toISOString();
  const aliases = Array.from(new Set([input.canonicalBrand, input.organizationName].map((value) => value.trim()).filter(Boolean)));
  return {
    version: RUN_MANIFEST_VERSION,
    organizationId: input.organizationId,
    projectId: input.projectId,
    brand: {
      canonicalName: input.canonicalBrand,
      domain: input.domain,
      aliases,
    },
    questions: input.questions,
    intendedSurfaces: ["provider-api"],
    provider: {
      id: input.providerId,
      modelSetting: input.modelSetting,
    },
    collectionMethod: "authorized-provider-api",
    sampleCount: input.questions.length,
    locales: Array.from(new Set(input.questions.map((question) => question.locale))),
    markets: Array.from(new Set(input.questions.map((question) => question.market))),
    requestedAt,
    timeWindow: { startedAt: requestedAt, endedAt: null },
    extractorVersion: RECOMMENDATION_EXTRACTION_VERSION,
    metricVersion: RECOMMENDATION_METRIC_VERSION,
    methodologyVersion: input.methodologyVersion,
    spend: {
      estimatedMaximumCostUsd: input.estimatedMaximumCostUsd,
      perRunLimitUsd: input.perRunLimitUsd,
    },
  };
}
