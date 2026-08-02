-- Opt-in application alert delivery. Authentication SMTP remains separate.
begin;

alter table public.notification_preferences
  add column if not exists weekly_digest_enabled boolean not null default true,
  add column if not exists unsubscribed_at timestamptz;

create table if not exists public.application_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  kind text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, event_key)
);
create index if not exists application_email_deliveries_user_idx on public.application_email_deliveries (user_id, created_at desc);
alter table public.application_email_deliveries enable row level security;
create policy "application_email_deliveries_select_self" on public.application_email_deliveries for select
  using (user_id = auth.uid() and public.is_org_member(organization_id));
grant select on public.application_email_deliveries to authenticated;

commit;
