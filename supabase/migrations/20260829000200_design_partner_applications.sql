create table if not exists public.design_partner_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 320),
  company text not null check (char_length(company) between 2 and 160),
  role_title text not null check (char_length(role_title) between 2 and 120),
  category text not null check (char_length(category) between 2 and 180),
  buyer_questions jsonb not null default '[]'::jsonb,
  current_problem text check (current_problem is null or char_length(current_problem) <= 2000),
  plan_interest text check (plan_interest is null or plan_interest in ('core', 'signal', 'intelligence')),
  status text not null default 'new' check (status in ('new', 'contacted', 'accepted', 'declined')),
  source text not null default 'website_design_partner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_partner_questions_array check (jsonb_typeof(buyer_questions) = 'array' and jsonb_array_length(buyer_questions) <= 5)
);

create index if not exists design_partner_applications_created_at_idx
  on public.design_partner_applications (created_at desc);
create index if not exists design_partner_applications_status_idx
  on public.design_partner_applications (status, created_at desc);

alter table public.design_partner_applications enable row level security;

comment on table public.design_partner_applications is
  'Founder-led design-partner applications. Public clients have no table policy; inserts are performed only by the trusted server service role after validation.';
