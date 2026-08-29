create table if not exists public.design_partner_submission_claims (
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  submission_day date not null default (now() at time zone 'utc')::date,
  submission_count integer not null default 1 check (submission_count between 1 and 5),
  last_submitted_at timestamptz not null default now(),
  primary key (key_hash, submission_day)
);

alter table public.design_partner_submission_claims enable row level security;

comment on table public.design_partner_submission_claims is
  'Privacy-minimized server-only counters for public design-partner form abuse control. Raw applicant identifiers are not stored here.';

create or replace function public.claim_design_partner_submission(p_key_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_count integer;
  v_last timestamptz;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid submission claim key';
  end if;

  select submission_count, last_submitted_at
    into v_count, v_last
    from public.design_partner_submission_claims
   where key_hash = p_key_hash and submission_day = v_day
   for update;

  if not found then
    insert into public.design_partner_submission_claims (key_hash, submission_day, submission_count, last_submitted_at)
    values (p_key_hash, v_day, 1, now());
    return 'accepted';
  end if;

  -- Repeated identical applications inside 15 minutes are treated as a safe
  -- duplicate success rather than exposing whether a record already exists.
  if v_last > now() - interval '15 minutes' then
    return 'duplicate';
  end if;

  if v_count >= 5 then
    return 'limited';
  end if;

  update public.design_partner_submission_claims
     set submission_count = submission_count + 1,
         last_submitted_at = now()
   where key_hash = p_key_hash and submission_day = v_day;
  return 'accepted';
end;
$$;

revoke all on table public.design_partner_submission_claims from anon, authenticated;
revoke all on function public.claim_design_partner_submission(text) from public, anon, authenticated;
grant execute on function public.claim_design_partner_submission(text) to service_role;
