-- A Source Map review synchronizes at most one route-less opportunity per
-- project/source pair. The original UNIQUE(project_id, source_id, source_route_id)
-- constraint does not deduplicate NULL source_route_id values in PostgreSQL.
-- Keep manual/route-specific opportunities independent while making the
-- deterministic reviewed-source bridge concurrency-safe.
create unique index if not exists opportunities_reviewed_source_bridge_unique
  on public.opportunities (project_id, source_id)
  where source_route_id is null;
