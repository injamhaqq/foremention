import type { Viewer } from "@/lib/auth";
import {
  hasSignificantSourceChange,
  type SourceCrawlerAccess,
  type SourceInspectionResult,
} from "@/lib/source-inspection";
import { supabaseRest } from "@/lib/supabase-rest";

export const SOURCE_SNAPSHOT_REPRESENTATION_VERSION = "visible-text-prefix-24k-v1";

export type SourceSnapshotChangeState = "initial" | "unchanged" | "changed" | "unreachable" | "unknown";

type SourceSnapshotRow = {
  id: string;
  organization_id: string;
  source_id: string;
  run_id: string | null;
  previous_snapshot_id: string | null;
  canonical_url: string;
  final_url: string;
  retrieved_at: string;
  access: SourceCrawlerAccess;
  http_status: number | null;
  content_type: string | null;
  page_title: string | null;
  redirect_count: number;
  content_length: number | null;
  content_signature: string | null;
  content_hash: string | null;
  representation_version: string;
  change_state: SourceSnapshotChangeState;
  change_reason: string | null;
};

export type SourceSnapshotView = {
  id: string;
  checkedAt: string;
  access: SourceCrawlerAccess;
  httpStatus: number | null;
  pageTitle: string | null;
  finalUrl: string;
  changeState: SourceSnapshotChangeState;
  changeReason: string | null;
  runId: string | null;
  previousSnapshotId: string | null;
  representationVersion: string;
  contentLength: number | null;
  fingerprint: string | null;
  collectionLinked: boolean;
  linkedObservationCount: number;
};

type SnapshotAccess = {
  serviceRole?: boolean;
  token?: string;
};

type PersistSourceSnapshotInput = SnapshotAccess & {
  organizationId: string;
  sourceId: string;
  canonicalUrl: string;
  inspection: SourceInspectionResult;
  runId?: string | null;
  snapshotKey?: string | null;
  observationIds?: string[];
  createdBy?: string | null;
};

type SnapshotChangeInput = {
  access: SourceCrawlerAccess;
  httpStatus: number | null;
  contentLength: number | null;
  contentSignature: string | null;
  contentHash: string | null;
  finalUrl: string;
};

function isReachable(access: SourceCrawlerAccess) {
  return access === "open" || access === "partial";
}

function restOptions(access: SnapshotAccess) {
  return access.serviceRole ? { serviceRole: true } : { token: access.token };
}

export async function hashBoundedSourceText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 24_000);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function classifySourceSnapshotChange(
  previous: SnapshotChangeInput | null,
  current: SnapshotChangeInput,
) {
  if (!previous) {
    return {
      changeState: "initial" as SourceSnapshotChangeState,
      changeReason: "First saved page observation for this source.",
      materiallyChanged: false,
      becameUnreachable: false,
    };
  }

  const previousReachable = isReachable(previous.access);
  const currentReachable = isReachable(current.access);
  if (previousReachable && !currentReachable) {
    return {
      changeState: "unreachable" as SourceSnapshotChangeState,
      changeReason: "A previously reachable cited page did not allow a safe bounded inspection.",
      materiallyChanged: false,
      becameUnreachable: true,
    };
  }
  if (!previousReachable && currentReachable) {
    return {
      changeState: "changed" as SourceSnapshotChangeState,
      changeReason: "The cited page became reachable for a safe bounded inspection.",
      materiallyChanged: false,
      becameUnreachable: false,
    };
  }
  if (!previousReachable && !currentReachable) {
    const unchanged = previous.access === current.access
      && previous.httpStatus === current.httpStatus
      && previous.finalUrl === current.finalUrl;
    return {
      changeState: (unchanged ? "unchanged" : "changed") as SourceSnapshotChangeState,
      changeReason: unchanged
        ? "Reachability metadata matched the previous saved page observation."
        : "Reachability metadata differed from the previous saved page observation.",
      materiallyChanged: false,
      becameUnreachable: false,
    };
  }

  if (previous.contentHash && current.contentHash) {
    if (previous.contentHash === current.contentHash) {
      return {
        changeState: "unchanged" as SourceSnapshotChangeState,
        changeReason: "The bounded visible-text fingerprint matched the previous saved page observation.",
        materiallyChanged: false,
        becameUnreachable: false,
      };
    }
    const materiallyChanged = hasSignificantSourceChange(
      { contentSignature: previous.contentSignature, contentLength: previous.contentLength },
      { contentSignature: current.contentSignature, contentLength: current.contentLength },
    );
    return {
      changeState: "changed" as SourceSnapshotChangeState,
      changeReason: materiallyChanged
        ? "The bounded visible-text fingerprint changed materially from the previous saved page observation."
        : "The bounded visible-text fingerprint differed from the previous saved page observation.",
      materiallyChanged,
      becameUnreachable: false,
    };
  }

  const legacyMatch = previous.contentSignature
    && current.contentSignature
    && previous.contentSignature === current.contentSignature
    && previous.contentLength !== null
    && current.contentLength !== null
    && previous.contentLength === current.contentLength;
  return {
    changeState: (legacyMatch ? "unchanged" : "unknown") as SourceSnapshotChangeState,
    changeReason: legacyMatch
      ? "The available bounded fingerprint matched the previous saved page observation."
      : "There was not enough comparable bounded text evidence to classify this page change.",
    materiallyChanged: false,
    becameUnreachable: false,
  };
}

async function loadSnapshotByKey(input: PersistSourceSnapshotInput) {
  if (!input.snapshotKey) return null;
  const rows = await supabaseRest<SourceSnapshotRow[]>(
    `source_snapshots?select=id,organization_id,source_id,run_id,previous_snapshot_id,canonical_url,final_url,retrieved_at,access,http_status,content_type,page_title,redirect_count,content_length,content_signature,content_hash,representation_version,change_state,change_reason&organization_id=eq.${input.organizationId}&source_id=eq.${input.sourceId}&snapshot_key=eq.${encodeURIComponent(input.snapshotKey)}&limit=1`,
    restOptions(input),
  );
  return rows[0] || null;
}

async function loadLatestSnapshot(input: PersistSourceSnapshotInput) {
  const rows = await supabaseRest<SourceSnapshotRow[]>(
    `source_snapshots?select=id,organization_id,source_id,run_id,previous_snapshot_id,canonical_url,final_url,retrieved_at,access,http_status,content_type,page_title,redirect_count,content_length,content_signature,content_hash,representation_version,change_state,change_reason&organization_id=eq.${input.organizationId}&source_id=eq.${input.sourceId}&order=retrieved_at.desc&limit=1`,
    restOptions(input),
  );
  return rows[0] || null;
}

async function linkSnapshotObservations(input: PersistSourceSnapshotInput, snapshotId: string) {
  const requested = Array.from(new Set((input.observationIds || []).filter(Boolean)));
  if (!requested.length) return 0;

  let validated = requested;
  if (input.serviceRole) {
    const rows = await supabaseRest<Array<{ id: string }>>(
      `source_observations?select=id&organization_id=eq.${input.organizationId}&source_id=eq.${input.sourceId}&id=in.(${requested.join(",")})`,
      { serviceRole: true },
    );
    validated = rows.map((row) => row.id);
    if (validated.length !== requested.length) {
      throw new Error("A source snapshot citation link did not match its workspace source evidence.");
    }
  }

  await supabaseRest("source_snapshot_observations?on_conflict=source_snapshot_id,source_observation_id", {
    method: "POST",
    ...restOptions(input),
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: validated.map((sourceObservationId) => ({
      source_snapshot_id: snapshotId,
      source_observation_id: sourceObservationId,
    })),
  });
  return validated.length;
}

export async function persistSourceSnapshot(input: PersistSourceSnapshotInput) {
  const existing = await loadSnapshotByKey(input);
  if (existing) {
    const linkedObservationCount = await linkSnapshotObservations(input, existing.id);
    return {
      id: existing.id,
      changeState: existing.change_state,
      changeReason: existing.change_reason,
      materiallyChanged: existing.change_reason?.includes("changed materially") || false,
      becameUnreachable: existing.change_state === "unreachable",
      linkedObservationCount,
    };
  }

  const previous = await loadLatestSnapshot(input);
  const contentHash = input.inspection.pageText
    ? await hashBoundedSourceText(input.inspection.pageText)
    : null;
  const current: SnapshotChangeInput = {
    access: input.inspection.access,
    httpStatus: input.inspection.httpStatus,
    contentLength: input.inspection.contentLength ?? null,
    contentSignature: input.inspection.contentSignature || null,
    contentHash,
    finalUrl: input.inspection.finalUrl,
  };
  const change = classifySourceSnapshotChange(previous ? {
    access: previous.access,
    httpStatus: previous.http_status,
    contentLength: previous.content_length,
    contentSignature: previous.content_signature,
    contentHash: previous.content_hash,
    finalUrl: previous.final_url,
  } : null, current);

  const path = input.snapshotKey ? "source_snapshots?on_conflict=snapshot_key" : "source_snapshots";
  let inserted = await supabaseRest<SourceSnapshotRow[]>(path, {
    method: "POST",
    ...restOptions(input),
    prefer: input.snapshotKey ? "resolution=ignore-duplicates,return=representation" : "return=representation",
    body: {
      organization_id: input.organizationId,
      source_id: input.sourceId,
      run_id: input.runId || null,
      previous_snapshot_id: previous?.id || null,
      snapshot_key: input.snapshotKey || null,
      canonical_url: input.canonicalUrl,
      final_url: input.inspection.finalUrl,
      retrieved_at: input.inspection.checkedAt,
      access: input.inspection.access,
      http_status: input.inspection.httpStatus,
      content_type: input.inspection.contentType,
      page_title: input.inspection.pageTitle,
      redirect_count: input.inspection.redirectCount,
      content_length: input.inspection.contentLength ?? null,
      content_signature: input.inspection.contentSignature || null,
      content_hash: contentHash,
      representation_version: SOURCE_SNAPSHOT_REPRESENTATION_VERSION,
      change_state: change.changeState,
      change_reason: change.changeReason,
      created_by: input.createdBy || null,
    },
  });

  if (!inserted?.[0] && input.snapshotKey) {
    const raced = await loadSnapshotByKey(input);
    inserted = raced ? [raced] : [];
  }
  const snapshot = inserted?.[0];
  if (!snapshot) throw new Error("The source page observation could not be saved.");

  const linkedObservationCount = await linkSnapshotObservations(input, snapshot.id);
  return { id: snapshot.id, ...change, linkedObservationCount };
}

export async function loadSourceSnapshotHistory(viewer: Viewer, sourceId: string): Promise<SourceSnapshotView[]> {
  if (viewer.mode === "demo" || !viewer.accessToken) return [];
  const rows = await supabaseRest<SourceSnapshotRow[]>(
    `source_snapshots?select=id,organization_id,source_id,run_id,previous_snapshot_id,canonical_url,final_url,retrieved_at,access,http_status,content_type,page_title,redirect_count,content_length,content_signature,content_hash,representation_version,change_state,change_reason&source_id=eq.${sourceId}&order=retrieved_at.desc&limit=10`,
    { token: viewer.accessToken },
  );
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const links = await supabaseRest<Array<{ source_snapshot_id: string }>>(
    `source_snapshot_observations?select=source_snapshot_id&source_snapshot_id=in.(${ids.join(",")})`,
    { token: viewer.accessToken },
  );
  const counts = new Map<string, number>();
  for (const link of links) counts.set(link.source_snapshot_id, (counts.get(link.source_snapshot_id) || 0) + 1);

  return rows.map((row) => ({
    id: row.id,
    checkedAt: row.retrieved_at,
    access: row.access,
    httpStatus: row.http_status,
    pageTitle: row.page_title,
    finalUrl: row.final_url,
    changeState: row.change_state,
    changeReason: row.change_reason,
    runId: row.run_id,
    previousSnapshotId: row.previous_snapshot_id,
    representationVersion: row.representation_version,
    contentLength: row.content_length,
    fingerprint: row.content_hash?.slice(0, 12) || row.content_signature || null,
    collectionLinked: Boolean(row.run_id),
    linkedObservationCount: counts.get(row.id) || 0,
  }));
}
