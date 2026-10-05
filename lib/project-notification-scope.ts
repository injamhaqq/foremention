import { supabaseRest } from "@/lib/supabase-rest";

export const MAX_PROJECT_NOTIFICATION_SCAN = 500;

export type NotificationScopeRow = {
  id: string;
  event_key: string;
  kind: string;
  href: string | null;
};

type CommentTargetRow = {
  id: string;
  entity_type: string;
  entity_id: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoded = (value: string) => encodeURIComponent(value);

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function runIdFromEventKey(eventKey: string) {
  const direct = eventKey.match(/^(?:run_ready|run_failed|source_map_published):([0-9a-f-]{36})$/i)?.[1];
  if (direct && UUID.test(direct)) return direct;
  const reviewed = eventKey.match(/^reviewed_change:[^:]+:([0-9a-f-]{36})$/i)?.[1];
  return reviewed && UUID.test(reviewed) ? reviewed : null;
}

function commentIdFromEventKey(eventKey: string) {
  const value = eventKey.match(/^comment_mention:([0-9a-f-]{36}):[0-9a-f-]{36}$/i)?.[1];
  return value && UUID.test(value) ? value : null;
}

function sourceEntryIdFromHref(href: string | null) {
  const value = String(href || "").match(/^\/app\/sources\/([0-9a-f-]{36})(?:[/?#]|$)/i)?.[1];
  return value && UUID.test(value) ? value : null;
}

async function projectSourceEntryIds(input: {
  organizationId: string;
  projectId: string;
  entryIds: string[];
  token?: string;
  serviceRole?: boolean;
}) {
  const entryIds = unique(input.entryIds).filter((id) => UUID.test(id));
  if (!entryIds.length) return new Set<string>();
  if (entryIds.length > MAX_PROJECT_NOTIFICATION_SCAN) return null;

  const entries = await supabaseRest<Array<{ id: string; source_map_id: string }>>(
    `source_map_entries?select=id,source_map_id&organization_id=eq.${encoded(input.organizationId)}&id=in.(${entryIds.join(",")})&limit=${entryIds.length + 1}`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  if (entries.length > entryIds.length) return null;

  const mapIds = unique(entries.map((entry) => entry.source_map_id));
  if (!mapIds.length) return new Set<string>();
  const maps = await supabaseRest<Array<{ id: string; run: { project_id: string } | null }>>(
    `source_maps?select=id,run:runs!inner(project_id)&organization_id=eq.${encoded(input.organizationId)}&id=in.(${mapIds.join(",")})&run.project_id=eq.${encoded(input.projectId)}&limit=${mapIds.length + 1}`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  if (maps.length > mapIds.length) return null;
  const allowedMaps = new Set(maps.filter((map) => map.run?.project_id === input.projectId).map((map) => map.id));
  return new Set(entries.filter((entry) => allowedMaps.has(entry.source_map_id)).map((entry) => entry.id));
}

export async function filterNotificationsToProject<T extends NotificationScopeRow>(input: {
  rows: T[];
  organizationId: string;
  projectId: string;
  token?: string;
  serviceRole?: boolean;
}): Promise<T[] | null> {
  if (input.rows.length > MAX_PROJECT_NOTIFICATION_SCAN) return null;

  const organizationWide = new Set(
    input.rows
      .filter((row) => row.event_key.startsWith("workspace-joined:"))
      .map((row) => row.id),
  );

  const runByNotification = new Map<string, string>();
  const commentByNotification = new Map<string, string>();
  const hrefEntryByNotification = new Map<string, string>();

  for (const row of input.rows) {
    const runId = runIdFromEventKey(row.event_key);
    if (runId) runByNotification.set(row.id, runId);

    const commentId = commentIdFromEventKey(row.event_key);
    if (commentId) commentByNotification.set(row.id, commentId);

    const entryId = sourceEntryIdFromHref(row.href);
    if (entryId) hrefEntryByNotification.set(row.id, entryId);
  }

  const runIds = unique(Array.from(runByNotification.values()));
  const allowedRuns = runIds.length ? await supabaseRest<Array<{ id: string }>>(
    `runs?select=id&organization_id=eq.${encoded(input.organizationId)}&project_id=eq.${encoded(input.projectId)}&id=in.(${runIds.join(",")})&limit=${runIds.length + 1}`,
    { token: input.token, serviceRole: input.serviceRole },
  ) : [];
  if (allowedRuns.length > runIds.length) return null;
  const allowedRunIds = new Set(allowedRuns.map((run) => run.id));

  const commentIds = unique(Array.from(commentByNotification.values()));
  const comments = commentIds.length ? await supabaseRest<CommentTargetRow[]>(
    `workspace_comments?select=id,entity_type,entity_id&organization_id=eq.${encoded(input.organizationId)}&id=in.(${commentIds.join(",")})&limit=${commentIds.length + 1}`,
    { token: input.token, serviceRole: input.serviceRole },
  ) : [];
  if (comments.length > commentIds.length) return null;

  const evidenceIds = unique(comments.filter((comment) => comment.entity_type === "evidence_item").map((comment) => comment.entity_id));
  const evidence = evidenceIds.length ? await supabaseRest<Array<{ id: string }>>(
    `evidence_items?select=id&organization_id=eq.${encoded(input.organizationId)}&project_id=eq.${encoded(input.projectId)}&id=in.(${evidenceIds.join(",")})&limit=${evidenceIds.length + 1}`,
    { token: input.token, serviceRole: input.serviceRole },
  ) : [];
  if (evidence.length > evidenceIds.length) return null;
  const allowedEvidenceIds = new Set(evidence.map((item) => item.id));

  const commentEntryIds = comments
    .filter((comment) => comment.entity_type === "source_map_entry" || comment.entity_type === "priority_gap")
    .map((comment) => comment.entity_id);
  const sourceEntryIds = unique([...Array.from(hrefEntryByNotification.values()), ...commentEntryIds]);
  const allowedSourceEntryIds = await projectSourceEntryIds({
    organizationId: input.organizationId,
    projectId: input.projectId,
    entryIds: sourceEntryIds,
    token: input.token,
    serviceRole: input.serviceRole,
  });
  if (!allowedSourceEntryIds) return null;

  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const allowedCommentIds = new Set<string>();
  for (const comment of comments) {
    if (comment.entity_type === "evidence_item" && allowedEvidenceIds.has(comment.entity_id)) {
      allowedCommentIds.add(comment.id);
    } else if (
      (comment.entity_type === "source_map_entry" || comment.entity_type === "priority_gap")
      && allowedSourceEntryIds.has(comment.entity_id)
    ) {
      allowedCommentIds.add(comment.id);
    }
  }

  return input.rows.filter((row) => {
    if (organizationWide.has(row.id)) return true;

    const runId = runByNotification.get(row.id);
    if (runId) return allowedRunIds.has(runId);

    const commentId = commentByNotification.get(row.id);
    if (commentId) return allowedCommentIds.has(commentId);

    const sourceEntryId = hrefEntryByNotification.get(row.id);
    if (sourceEntryId) return allowedSourceEntryIds.has(sourceEntryId);

    // Unknown organization-owned notification shapes fail closed. New
    // customer-facing notification types must define a durable project relation
    // before they become visible in a project-scoped workspace.
    return false;
  });
}
