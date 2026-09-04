import type { AcquisitionResearchFact } from "./acquisition-research.ts";

export type AcquisitionOutreachDraftStatus = "draft" | "approved" | "suppressed" | "sent" | "failed";
export type AcquisitionContactRouteStatus = "unverified" | "verified" | "invalid" | "suppressed";
export type AcquisitionReplyClassification =
  | "positive"
  | "referral"
  | "question"
  | "objection"
  | "timing"
  | "not_relevant"
  | "unsubscribe"
  | "bounce";
export type AcquisitionSuppressionReason = "unsubscribe" | "bounce" | "negative_intent" | "reply_received" | "manual";

export type EvidenceGroundedOutreachDraftInput = {
  accountId: string;
  contactId: string;
  researchRunId: string;
  companyName: string;
  contactFirstName: string | null;
  contactRole: string | null;
  facts: readonly AcquisitionResearchFact[];
};

export type EvidenceGroundedOutreachDraft = {
  accountId: string;
  contactId: string;
  researchRunId: string;
  draftKey: string;
  subject: string;
  body: string;
  claimSources: Array<{
    claim: string;
    sourceUrl: string;
    retrievedAt: string;
    confidence: number;
  }>;
};

export type OutreachEligibilityInput = {
  qualifiedShadow: boolean;
  contactRouteStatus: AcquisitionContactRouteStatus;
  draftStatus: AcquisitionOutreachDraftStatus;
  transportAvailable: boolean;
  suppressed: boolean;
};

export type OutreachEligibilityReason =
  | "ELIGIBLE"
  | "SUPPRESSED"
  | "NOT_QUALIFIED"
  | "CONTACT_ROUTE_UNVERIFIED"
  | "DRAFT_NOT_APPROVED"
  | "TRANSPORT_UNAVAILABLE";

function stableHash32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function deterministicDigest(material: string) {
  return `${stableHash32(material, 2166136261)}${stableHash32(material, 2246822519)}`;
}

function boundedIdentity(value: unknown, code: string) {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) throw new Error(code);
  return normalized;
}

function safeFirstName(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(/[^\p{L}\p{M}' -]+/gu, "").replace(/\s+/g, " ").slice(0, 60);
  return normalized || null;
}

function safeCompany(value: string) {
  const normalized = value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 160);
  if (!normalized) throw new Error("ACQUISITION_OUTREACH_COMPANY_REQUIRED");
  return normalized;
}

function safeRole(value: string | null) {
  if (!value) return null;
  return value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 120) || null;
}

function traceableRecentTrigger(facts: readonly AcquisitionResearchFact[]) {
  return facts
    .filter((fact) => fact.key === "recent_trigger" && fact.sourceUrl.startsWith("https://") && fact.value.trim())
    .sort((left, right) => right.confidence - left.confidence || right.retrievedAt.localeCompare(left.retrievedAt))[0] ?? null;
}

export function outreachDraftKey(accountId: string, contactId: string, researchRunId: string) {
  const material = [
    boundedIdentity(accountId, "ACQUISITION_OUTREACH_ACCOUNT_REQUIRED"),
    boundedIdentity(contactId, "ACQUISITION_OUTREACH_CONTACT_REQUIRED"),
    boundedIdentity(researchRunId, "ACQUISITION_OUTREACH_RESEARCH_RUN_REQUIRED"),
  ].join("|");
  return `outreach-draft-${deterministicDigest(material)}`;
}

export function outreachEnrollmentKey(input: {
  provider: string;
  contactId: string;
  draftId: string;
  sequenceId: string;
}) {
  const material = [
    boundedIdentity(input.provider, "ACQUISITION_OUTREACH_PROVIDER_REQUIRED").toLowerCase(),
    boundedIdentity(input.contactId, "ACQUISITION_OUTREACH_CONTACT_REQUIRED"),
    boundedIdentity(input.draftId, "ACQUISITION_OUTREACH_DRAFT_REQUIRED"),
    boundedIdentity(input.sequenceId, "ACQUISITION_OUTREACH_SEQUENCE_REQUIRED"),
  ].join("|");
  return `outreach-enroll-${deterministicDigest(material)}`;
}

export function buildEvidenceGroundedOutreachDraft(
  input: EvidenceGroundedOutreachDraftInput,
): EvidenceGroundedOutreachDraft {
  const accountId = boundedIdentity(input.accountId, "ACQUISITION_OUTREACH_ACCOUNT_REQUIRED");
  const contactId = boundedIdentity(input.contactId, "ACQUISITION_OUTREACH_CONTACT_REQUIRED");
  const researchRunId = boundedIdentity(input.researchRunId, "ACQUISITION_OUTREACH_RESEARCH_RUN_REQUIRED");
  const companyName = safeCompany(input.companyName);
  const firstName = safeFirstName(input.contactFirstName);
  const role = safeRole(input.contactRole);
  const trigger = traceableRecentTrigger(input.facts);
  if (!trigger) throw new Error("ACQUISITION_OUTREACH_TRACEABLE_TRIGGER_REQUIRED");

  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const roleContext = role ? `Given your ${role} role, ` : "";
  const subject = `${companyName}: AI recommendation review`.slice(0, 160);
  const body = [
    greeting,
    "",
    `I noticed a recent public signal from ${companyName}: ${trigger.value}`,
    "",
    `${roleContext}I thought this might be relevant because Foremention reviews how a company appears in AI recommendations and traces the public evidence behind those answers.`,
    "",
    "If useful, I can prepare a short Recommendation Review showing the questions buyers may ask, what the evidence currently supports, and the specific changes worth reviewing. Would that be useful?",
    "",
    "Best,",
    "Injam",
  ].join("\n").slice(0, 20_000);

  return {
    accountId,
    contactId,
    researchRunId,
    draftKey: outreachDraftKey(accountId, contactId, researchRunId),
    subject,
    body,
    claimSources: [
      {
        claim: trigger.value,
        sourceUrl: trigger.sourceUrl,
        retrievedAt: trigger.retrievedAt,
        confidence: trigger.confidence,
      },
    ],
  };
}

export function evaluateOutreachEligibility(input: OutreachEligibilityInput): {
  eligible: boolean;
  reason: OutreachEligibilityReason;
} {
  if (input.suppressed || input.contactRouteStatus === "suppressed") return { eligible: false, reason: "SUPPRESSED" };
  if (!input.qualifiedShadow) return { eligible: false, reason: "NOT_QUALIFIED" };
  if (input.contactRouteStatus !== "verified") return { eligible: false, reason: "CONTACT_ROUTE_UNVERIFIED" };
  if (input.draftStatus !== "approved") return { eligible: false, reason: "DRAFT_NOT_APPROVED" };
  if (!input.transportAvailable) return { eligible: false, reason: "TRANSPORT_UNAVAILABLE" };
  return { eligible: true, reason: "ELIGIBLE" };
}

function normalizedReply(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 20_000) : "";
}

export function classifyAcquisitionReply(
  text: string,
  context: { providerEvent?: string | null } = {},
): AcquisitionReplyClassification {
  const providerEvent = normalizedReply(context.providerEvent);
  const reply = normalizedReply(text);

  if (providerEvent.includes("bounce") || (/\b(550|551|552|553|554)\b/.test(reply) && /mailbox|recipient|delivery|address/.test(reply))) {
    return "bounce";
  }
  if (/\b(unsubscribe|remove me|opt out|stop emailing|stop email|do not email|don't email)\b/.test(reply)) {
    return "unsubscribe";
  }
  if (/\b(not interested|not relevant|do not contact|don't contact|no thanks|please stop|not a fit)\b/.test(reply)) {
    return "not_relevant";
  }
  if (/\b(talk to|speak to|reach out to|contact my|contact our|looping in|cc'ing|ccing|forwarding to)\b/.test(reply)) {
    return "referral";
  }
  if (/\b(next quarter|next month|later this year|circle back|check back|not now|bad timing|too early)\b/.test(reply)) {
    return "timing";
  }
  if (/\b(budget|price|pricing|security|procurement|legal|compliance|already use|competitor|build internally|internal tool)\b/.test(reply)) {
    return "objection";
  }
  if (reply.includes("?") || /\b(send (me )?(more )?(details|info|information)|how does|what does|can you|could you|tell me more)\b/.test(reply)) {
    return "question";
  }
  if (/\b(interested|sounds good|let's talk|lets talk|book a call|schedule a call|yes[,! ]|happy to chat|worth discussing)\b/.test(reply)) {
    return "positive";
  }

  return "objection";
}

export function replySuppressionPolicy(classification: AcquisitionReplyClassification): {
  stopSequence: true;
  suppress: true;
  reason: AcquisitionSuppressionReason;
} {
  if (classification === "unsubscribe") return { stopSequence: true, suppress: true, reason: "unsubscribe" };
  if (classification === "bounce") return { stopSequence: true, suppress: true, reason: "bounce" };
  if (classification === "not_relevant") return { stopSequence: true, suppress: true, reason: "negative_intent" };
  return { stopSequence: true, suppress: true, reason: "reply_received" };
}
