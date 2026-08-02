"use client";

import { lazy, Suspense } from "react";
import type { CompetitorTracking, VerifiedClaim, WorkspaceEvidence, WorkspaceInvitation, WorkspaceRole, WorkspaceTeamMember } from "@/lib/data";
import type { WeeklyIntelligence } from "@/lib/intelligence-loop";
import type { SourceMapEntry } from "@/lib/types";

const SourceMapTable = lazy(() => import("@/components/source-map-table").then((module) => ({ default: module.SourceMapTable })));
const EvidenceManager = lazy(() => import("@/components/evidence-manager").then((module) => ({ default: module.EvidenceManager })));
const ClaimLedger = lazy(() => import("@/components/claim-ledger").then((module) => ({ default: module.ClaimLedger })));
const CompetitorTracker = lazy(() => import("@/components/competitor-tracker").then((module) => ({ default: module.CompetitorTracker })));
const IntelligenceLoop = lazy(() => import("@/components/intelligence-loop").then((module) => ({ default: module.IntelligenceLoop })));
const TeamManagement = lazy(() => import("@/components/team-management").then((module) => ({ default: module.TeamManagement })));

function PanelFallback({ label }: { label: string }) {
  return <div className="deferred-panel-skeleton" aria-live="polite" aria-busy="true">
    <span className="sr-only">Loading {label}. Real workspace records will replace these placeholders.</span>
    <span className="skeleton-line skeleton-line--eyebrow" aria-hidden="true" />
    <span className="skeleton-line skeleton-line--copy" aria-hidden="true" />
    <span className="skeleton-line skeleton-line--copy" aria-hidden="true" />
    <span className="skeleton-line skeleton-line--copy" aria-hidden="true" />
  </div>;
}

export function LazySourceMapTable(props: { entries: SourceMapEntry[]; canEdit: boolean; demo: boolean }) {
  return <Suspense fallback={<PanelFallback label="the Source Map table" />}><SourceMapTable {...props} /></Suspense>;
}

export function LazyEvidenceManager(props: { initialItems: WorkspaceEvidence[]; demo: boolean; canReview: boolean }) {
  return <Suspense fallback={<PanelFallback label="the evidence list" />}><EvidenceManager {...props} /></Suspense>;
}

export function LazyClaimLedger(props: { evidence: WorkspaceEvidence[]; initialClaims: VerifiedClaim[]; demo: boolean; canManage: boolean }) {
  return <Suspense fallback={<PanelFallback label="the claim ledger" />}><ClaimLedger {...props} /></Suspense>;
}

export function LazyCompetitorTracker(props: { initial: CompetitorTracking[]; canManage: boolean; demo: boolean }) {
  return <Suspense fallback={<PanelFallback label="competitor tracking" />}><CompetitorTracker {...props} /></Suspense>;
}

export function LazyIntelligenceLoop(props: { intelligence: WeeklyIntelligence; initialQuery?: string }) {
  return <Suspense fallback={<PanelFallback label="the intelligence brief" />}><IntelligenceLoop {...props} /></Suspense>;
}

export function LazyTeamManagement(props: { initialMembers: WorkspaceTeamMember[]; initialInvitations: WorkspaceInvitation[]; currentRole: WorkspaceRole | null; demo: boolean }) {
  return <Suspense fallback={<PanelFallback label="the team list" />}><TeamManagement {...props} /></Suspense>;
}
