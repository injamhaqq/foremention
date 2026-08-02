begin;

create table if not exists public.workspace_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('source_map_entry','priority_gap','evidence_item')),
  entity_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_comments_entity_idx on public.workspace_comments (organization_id, entity_type, entity_id, created_at asc);
alter table public.workspace_comments enable row level security;
create policy "workspace_comments_select_member" on public.workspace_comments for select using (public.is_org_member(organization_id));
create policy "workspace_comments_insert_member" on public.workspace_comments for insert with check (author_id = auth.uid() and public.is_org_member(organization_id));
create policy "workspace_comments_update_author" on public.workspace_comments for update using (author_id = auth.uid() and public.is_org_member(organization_id)) with check (author_id = auth.uid() and public.is_org_member(organization_id));
create policy "workspace_comments_delete_author_or_admin" on public.workspace_comments for delete using (author_id = auth.uid() or public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
grant select, insert, update, delete on public.workspace_comments to authenticated;

commit;
