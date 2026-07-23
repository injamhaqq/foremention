begin;

create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'analyst', 'viewer');
create type public.run_status as enum ('queued', 'running', 'review', 'complete', 'failed');
create type public.review_status as enum ('unreviewed', 'verified', 'excluded');
create type public.placement_stage as enum ('identified', 'qualified', 'pitched', 'accepted', 'published', 'indexed', 'first_cited', 'repeatedly_cited', 'decayed', 'closed');
create type public.crawler_access as enum ('open', 'partial', 'blocked', 'unknown');
create type public.feasibility_level as enum ('high', 'medium', 'low', 'unknown');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  website text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.source_gap_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  contact_name text not null,
  website text not null,
  category text not null,
  competitors text[] not null default '{}',
  buyer_question text not null,
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'qualified', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  geography text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  prompt_key text not null,
  prompt_text text not null,
  buyer_stage text,
  locale text not null default 'en-US',
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, prompt_key, version)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  status public.run_status not null default 'queued',
  provider_ids text[] not null default '{}',
  prompt_count integer not null default 0 check (prompt_count >= 0),
  answer_count integer not null default 0 check (answer_count >= 0),
  citation_count integer not null default 0 check (citation_count >= 0),
  brand_presence_pct numeric(5,2) not null default 0 check (brand_presence_pct between 0 and 100),
  first_mention_pct numeric(5,2) not null default 0 check (first_mention_pct between 0 and 100),
  new_source_count integer not null default 0 check (new_source_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.run_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  prompt_key text not null,
  provider text not null,
  model text,
  answer_text text not null,
  citations_json jsonb not null default '[]'::jsonb,
  raw_json jsonb,
  brand_present boolean,
  brand_position integer check (brand_position is null or brand_position > 0),
  review_status public.review_status not null default 'unreviewed',
  review_note text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  collected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (run_id, prompt_key, provider)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canonical_url text not null,
  domain text not null,
  page_title text,
  source_type text,
  crawler_access public.crawler_access not null default 'unknown',
  crawler_checked_at timestamptz,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, canonical_url)
);

create table public.citations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_answer_id uuid not null references public.run_answers(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  ordinal integer check (ordinal is null or ordinal > 0),
  citation_text text,
  created_at timestamptz not null default now(),
  unique (run_answer_id, source_id)
);

create table public.source_maps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  evidence_from timestamptz,
  evidence_to timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  methodology_version text not null default '1.0',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_map_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_map_id uuid not null references public.source_maps(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  rank integer not null check (rank > 0),
  citation_observations integer not null default 0 check (citation_observations >= 0),
  engines text[] not null default '{}',
  client_present boolean not null default false,
  competitors_present text[] not null default '{}',
  entry_route text,
  feasibility public.feasibility_level not null default 'unknown',
  influence public.feasibility_level not null default 'unknown',
  analyst_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_map_id, source_id),
  unique (source_map_id, rank)
);

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  source_url text not null,
  page_title text,
  entry_route text not null,
  stage public.placement_stage not null default 'identified',
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  target_prompt_ids uuid[] not null default '{}',
  pitch_date date,
  accepted_date date,
  published_url text,
  published_at timestamptz,
  indexed_at timestamptz,
  first_cited_at timestamptz,
  last_cited_at timestamptz,
  citation_survival_days integer check (citation_survival_days is null or citation_survival_days >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.placement_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  placement_id uuid not null references public.placements(id) on delete cascade,
  from_stage public.placement_stage,
  to_stage public.placement_stage not null,
  note text,
  evidence_url text,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id);
create index categories_organization_idx on public.categories(organization_id);
create index prompts_category_idx on public.prompts(category_id, active);
create index runs_organization_created_idx on public.runs(organization_id, created_at desc);
create index run_answers_run_idx on public.run_answers(run_id);
create index sources_organization_domain_idx on public.sources(organization_id, domain);
create index citations_source_idx on public.citations(source_id);
create index source_map_entries_map_rank_idx on public.source_map_entries(source_map_id, rank);
create index placements_organization_stage_idx on public.placements(organization_id, stage);
create index placement_events_placement_idx on public.placement_events(placement_id, occurred_at desc);
create index source_gap_requests_created_idx on public.source_gap_requests(created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger source_gap_requests_updated_at before update on public.source_gap_requests for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger prompts_updated_at before update on public.prompts for each row execute function public.set_updated_at();
create trigger runs_updated_at before update on public.runs for each row execute function public.set_updated_at();
create trigger sources_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger source_maps_updated_at before update on public.source_maps for each row execute function public.set_updated_at();
create trigger source_map_entries_updated_at before update on public.source_map_entries for each row execute function public.set_updated_at();
create trigger placements_updated_at before update on public.placements for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_org_member(check_org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = check_org_id and m.user_id = auth.uid());
$$;

create or replace function public.has_org_role(check_org_id uuid, allowed_roles public.organization_role[]) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = check_org_id and m.user_id = auth.uid() and m.role = any(allowed_roles));
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.source_gap_requests enable row level security;
alter table public.categories enable row level security;
alter table public.prompts enable row level security;
alter table public.runs enable row level security;
alter table public.run_answers enable row level security;
alter table public.sources enable row level security;
alter table public.citations enable row level security;
alter table public.source_maps enable row level security;
alter table public.source_map_entries enable row level security;
alter table public.placements enable row level security;
alter table public.placement_events enable row level security;

create policy "profiles_select_self" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_select_member" on public.organizations for select using (public.is_org_member(id));
create policy "organizations_insert_creator" on public.organizations for insert with check (created_by = auth.uid());
create policy "organizations_update_owner" on public.organizations for update using (public.has_org_role(id, array['owner']::public.organization_role[])) with check (public.has_org_role(id, array['owner']::public.organization_role[]));

create policy "members_select_member" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "members_insert_owner" on public.organization_members for insert with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]) or (user_id = auth.uid() and exists (select 1 from public.organizations o where o.id = organization_id and o.created_by = auth.uid())));
create policy "members_update_owner" on public.organization_members for update using (public.has_org_role(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));
create policy "members_delete_owner" on public.organization_members for delete using (public.has_org_role(organization_id, array['owner']::public.organization_role[]));

create policy "source_gap_public_insert" on public.source_gap_requests for insert to anon, authenticated with check (consent_at is not null);

create policy "categories_select_member" on public.categories for select using (public.is_org_member(organization_id));
create policy "categories_write_analyst" on public.categories for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "prompts_select_member" on public.prompts for select using (public.is_org_member(organization_id));
create policy "prompts_write_analyst" on public.prompts for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "runs_select_member" on public.runs for select using (public.is_org_member(organization_id));
create policy "runs_write_analyst" on public.runs for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "run_answers_select_member" on public.run_answers for select using (public.is_org_member(organization_id));
create policy "sources_select_member" on public.sources for select using (public.is_org_member(organization_id));
create policy "sources_write_analyst" on public.sources for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "citations_select_member" on public.citations for select using (public.is_org_member(organization_id));
create policy "source_maps_select_member" on public.source_maps for select using (public.is_org_member(organization_id));
create policy "source_maps_write_analyst" on public.source_maps for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "source_map_entries_select_member" on public.source_map_entries for select using (public.is_org_member(organization_id));
create policy "source_map_entries_write_analyst" on public.source_map_entries for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "placements_select_member" on public.placements for select using (public.is_org_member(organization_id));
create policy "placements_write_analyst" on public.placements for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));
create policy "placement_events_select_member" on public.placement_events for select using (public.is_org_member(organization_id));
create policy "placement_events_write_analyst" on public.placement_events for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));

grant usage on schema public to anon, authenticated;
grant insert on public.source_gap_requests to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;

commit;
