begin;

-- Foremention Recommendation Graph extension.
-- This migration keeps the original evidence chain intact and adds the
-- operational entities required for multi-client research, placement,
-- attribution, integrations, and auditability.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null default 'viewer',
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email, status)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  client_brand text not null,
  website text,
  category text,
  locale text not null default 'en-US',
  status text not null default 'active' check (status in ('draft','active','paused','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  hostname text not null,
  domain_type text not null default 'primary' check (domain_type in ('primary','product','docs','blog','other')),
  verified_at timestamptz,
  crawler_access public.crawler_access not null default 'unknown',
  crawler_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, hostname)
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  website text,
  competitor_type text not null default 'direct' check (competitor_type in ('direct','leader','challenger','substitute')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.prompt_clusters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  intent text not null,
  buyer_stage text,
  priority smallint not null default 3 check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

alter table public.prompts add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.prompts add column if not exists cluster_id uuid references public.prompt_clusters(id) on delete set null;

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  version integer not null check (version > 0),
  prompt_text text not null,
  variables jsonb not null default '{}'::jsonb,
  change_reason text,
  frozen_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (prompt_id, version)
);

create table public.run_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  provider text not null,
  model text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  status text not null default 'queued' check (status in ('queued','running','complete','failed','rate_limited','excluded')),
  raw_response jsonb,
  error_code text,
  error_detail text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_id, prompt_id, provider, attempt_number)
);

create table public.answer_brand_mentions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_answer_id uuid not null references public.run_answers(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  brand_name text not null,
  mention_position integer check (mention_position is null or mention_position > 0),
  mention_type text not null default 'recommended' check (mention_type in ('recommended','compared','cited','negative','neutral')),
  evidence_text text,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (run_answer_id, brand_name, mention_type)
);

create table public.source_brand_mentions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  brand_name text not null,
  present boolean not null default true,
  context_text text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, brand_name)
);

create table public.source_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  run_answer_id uuid references public.run_answers(id) on delete set null,
  prompt_id uuid references public.prompts(id) on delete set null,
  provider text not null,
  citation_ordinal integer check (citation_ordinal is null or citation_ordinal > 0),
  page_snapshot_url text,
  observed_at timestamptz not null,
  review_status public.review_status not null default 'unreviewed',
  reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.source_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  name text,
  role text,
  email text,
  profile_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','bounced','do_not_contact')),
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  route_type text not null,
  route_description text not null,
  submission_url text,
  evidence_required text,
  feasibility public.feasibility_level not null default 'unknown',
  estimated_effort text,
  reputation_risk text not null default 'low' check (reputation_risk in ('low','medium','high','unacceptable')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  source_route_id uuid references public.source_routes(id) on delete set null,
  title text not null,
  status text not null default 'open' check (status in ('open','qualified','approved','in_progress','won','lost','archived')),
  influence_score numeric(5,2) not null default 0 check (influence_score between 0 and 100),
  feasibility_score numeric(5,2) not null default 0 check (feasibility_score between 0 and 100),
  priority_score numeric(5,2) generated always as ((influence_score * 0.6) + (feasibility_score * 0.4)) stored,
  owner_id uuid references auth.users(id) on delete set null,
  next_action text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, source_id, source_route_id)
);

create table public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  scoring_version text not null,
  influence_components jsonb not null default '{}'::jsonb,
  feasibility_components jsonb not null default '{}'::jsonb,
  influence_score numeric(5,2) not null check (influence_score between 0 and 100),
  feasibility_score numeric(5,2) not null check (feasibility_score between 0 and 100),
  scored_by uuid references auth.users(id) on delete set null,
  scored_at timestamptz not null default now()
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_type text not null,
  title text not null,
  source_url text,
  storage_path text,
  owner_id uuid references auth.users(id) on delete set null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','expired','rejected')),
  verified_at timestamptz,
  expires_at timestamptz,
  usage_rights text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verified_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_item_id uuid references public.evidence_items(id) on delete set null,
  claim_text text not null,
  approved_wording text not null,
  limitations text,
  public_use boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.placement_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  placement_id uuid not null references public.placements(id) on delete cascade,
  activity_type text not null,
  summary text not null,
  outcome text,
  evidence_url text,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.outreach_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  placement_id uuid references public.placements(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  source_contact_id uuid references public.source_contacts(id) on delete set null,
  channel text not null,
  subject text,
  message_body text,
  status text not null default 'draft' check (status in ('draft','approved','sent','replied','declined','bounced','closed')),
  sent_at timestamptz,
  response_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (placement_id is not null or opportunity_id is not null)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','rejected','expired')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.indexing_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  placement_id uuid references public.placements(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  checked_url text not null,
  search_engine text not null default 'google',
  indexed boolean,
  method text not null,
  evidence_url text,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (placement_id is not null or source_id is not null)
);

create table public.citation_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  placement_id uuid references public.placements(id) on delete set null,
  source_id uuid not null references public.sources(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  run_answer_id uuid references public.run_answers(id) on delete set null,
  provider text not null,
  cited boolean not null,
  citation_ordinal integer check (citation_ordinal is null or citation_ordinal > 0),
  answer_snapshot_url text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.referral_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  metric_date date not null,
  ai_provider text not null,
  landing_page text,
  sessions integer not null default 0 check (sessions >= 0),
  engaged_sessions integer not null default 0 check (engaged_sessions >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  revenue numeric(14,2) not null default 0,
  source_system text not null,
  imported_at timestamptz not null default now(),
  unique (project_id, metric_date, ai_provider, landing_page, source_system)
);

create table public.crm_attribution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  external_contact_id text,
  external_deal_id text,
  event_type text not null,
  ai_provider text,
  source_url text,
  placement_id uuid references public.placements(id) on delete set null,
  amount numeric(14,2),
  currency text,
  attribution_confidence text not null default 'unknown' check (attribution_confidence in ('verified','self_reported','assisted','inferred','unknown')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in ('disconnected','pending','connected','error','revoked')),
  scopes text[] not null default '{}',
  configuration jsonb not null default '{}'::jsonb,
  secret_reference text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_id, provider)
);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete cascade,
  endpoint_url text not null,
  event_types text[] not null default '{}',
  secret_reference text not null,
  active boolean not null default true,
  last_delivery_at timestamptz,
  last_status integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','running','complete','failed','cancelled')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_detail text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  ip_hash text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index invitations_organization_status_idx on public.invitations(organization_id, status);
create index projects_organization_status_idx on public.projects(organization_id, status);
create index domains_project_idx on public.domains(project_id);
create index competitors_project_idx on public.competitors(project_id, active);
create index prompt_clusters_project_idx on public.prompt_clusters(project_id, priority);
create index prompt_versions_prompt_idx on public.prompt_versions(prompt_id, version desc);
create index run_attempts_run_idx on public.run_attempts(run_id, provider, status);
create index answer_brand_mentions_answer_idx on public.answer_brand_mentions(run_answer_id);
create index source_brand_mentions_source_idx on public.source_brand_mentions(source_id);
create index source_observations_source_idx on public.source_observations(source_id, observed_at desc);
create index source_contacts_source_idx on public.source_contacts(source_id);
create index source_routes_source_idx on public.source_routes(source_id, feasibility);
create index opportunities_project_priority_idx on public.opportunities(project_id, status, priority_score desc);
create index evidence_items_project_idx on public.evidence_items(project_id, verification_status);
create index outreach_actions_placement_idx on public.outreach_actions(placement_id, status);
create index indexing_checks_url_idx on public.indexing_checks(checked_url, checked_at desc);
create index citation_observations_source_idx on public.citation_observations(source_id, provider, observed_at desc);
create index referral_metrics_project_date_idx on public.referral_metrics(project_id, metric_date desc);
create index crm_attribution_project_date_idx on public.crm_attribution_events(project_id, occurred_at desc);
create index jobs_status_schedule_idx on public.jobs(status, scheduled_at);
create index audit_logs_organization_created_idx on public.audit_logs(organization_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['invitations','projects','domains','competitors','prompt_clusters','source_brand_mentions','source_contacts','source_routes','opportunities','evidence_items','verified_claims','outreach_actions','integrations','webhooks','jobs']
  loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'projects','domains','competitors','prompt_clusters','prompt_versions','run_attempts',
    'answer_brand_mentions','source_brand_mentions','source_observations','source_contacts','source_routes',
    'opportunities','opportunity_scores','evidence_items','verified_claims','placement_activities',
    'outreach_actions','approvals','indexing_checks','citation_observations','referral_metrics',
    'crm_attribution_events','jobs','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select using (public.is_org_member(organization_id))', table_name || '_select_member', table_name);
    execute format(
      'create policy %I on public.%I for all using (public.has_org_role(organization_id, array[''owner'',''analyst'']::public.organization_role[])) with check (public.has_org_role(organization_id, array[''owner'',''analyst'']::public.organization_role[]))',
      table_name || '_write_analyst', table_name
    );
  end loop;
end $$;

-- Invitations, integrations, and webhooks expose sensitive operational data;
-- organization members may inspect them, but only owners may change them.
alter table public.invitations enable row level security;
alter table public.integrations enable row level security;
alter table public.webhooks enable row level security;
create policy "invitations_select_member" on public.invitations for select using (public.is_org_member(organization_id));
create policy "invitations_write_owner" on public.invitations for all using (public.has_org_role(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));
create policy "integrations_select_member" on public.integrations for select using (public.is_org_member(organization_id));
create policy "integrations_write_owner" on public.integrations for all using (public.has_org_role(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));
create policy "webhooks_select_member" on public.webhooks for select using (public.is_org_member(organization_id));
create policy "webhooks_write_owner" on public.webhooks for all using (public.has_org_role(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));

create or replace function public.complete_onboarding(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  organization_id uuid := gen_random_uuid();
  project_id uuid := gen_random_uuid();
  category_id uuid := gen_random_uuid();
  cluster_id uuid := gen_random_uuid();
  company_name text := left(trim(payload ->> 'companyName'), 120);
  company_domain text := left(trim(payload ->> 'domain'), 500);
  category_name text := left(trim(payload ->> 'category'), 160);
  base_slug text;
  value text;
  item_index integer := 0;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if length(company_name) < 2 or length(company_domain) < 4 or length(category_name) < 2 then raise exception 'Company, domain, and category are required'; end if;
  if jsonb_array_length(coalesce(payload -> 'prompts', '[]'::jsonb)) < 1 then raise exception 'At least one approved prompt is required'; end if;
  if jsonb_array_length(coalesce(payload -> 'prompts', '[]'::jsonb)) > 100 then raise exception 'Prompt limit exceeded'; end if;
  if jsonb_array_length(coalesce(payload -> 'competitors', '[]'::jsonb)) > 20 then raise exception 'Competitor limit exceeded'; end if;

  base_slug := trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'workspace'; end if;

  insert into public.organizations (id, name, slug, website, created_by)
  values (organization_id, company_name, left(base_slug, 48) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), company_domain, actor_id);
  insert into public.organization_members (organization_id, user_id, role) values (organization_id, actor_id, 'owner');
  insert into public.projects (id, organization_id, name, slug, client_brand, website, category, locale, status, created_by)
  values (project_id, organization_id, company_name || ' Recommendation Graph', 'primary', company_name, company_domain, category_name, coalesce(nullif(payload ->> 'locale',''), 'en-US'), 'active', actor_id);
  insert into public.categories (id, organization_id, name, description, geography)
  values (category_id, organization_id, category_name, left(payload ->> 'categoryDescription', 2000), left(payload ->> 'market', 120));
  insert into public.prompt_clusters (id, organization_id, project_id, name, intent, buyer_stage, priority)
  values (cluster_id, organization_id, project_id, 'Approved baseline', 'Buyer discovery and comparison', 'evaluation', 1);

  for value in select jsonb_array_elements_text(coalesce(payload -> 'competitors', '[]'::jsonb)) loop
    value := left(trim(value), 120);
    if value <> '' then insert into public.competitors (organization_id, project_id, name) values (organization_id, project_id, value) on conflict do nothing; end if;
  end loop;

  for value in select jsonb_array_elements_text(payload -> 'prompts') loop
    value := left(trim(value), 1000);
    if value <> '' then
      item_index := item_index + 1;
      insert into public.prompts (organization_id, project_id, category_id, cluster_id, prompt_key, prompt_text, buyer_stage, locale, version, active)
      values (organization_id, project_id, category_id, cluster_id, 'baseline-' || lpad(item_index::text, 3, '0'), value, 'evaluation', coalesce(nullif(payload ->> 'locale',''), 'en-US'), 1, true);
    end if;
  end loop;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_state)
  values (organization_id, actor_id, 'onboarding.completed', 'project', project_id, jsonb_build_object('goal', left(payload ->> 'goal', 500), 'constraint', left(payload ->> 'constraint', 1000)));
  return jsonb_build_object('organizationId', organization_id, 'projectId', project_id, 'categoryId', category_id, 'promptCount', item_index);
end;
$$;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.complete_onboarding(jsonb) to authenticated;

commit;
